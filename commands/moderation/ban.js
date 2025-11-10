const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addBan, addModLog } = require('../../utils/database');
const { moderationEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Le membre à bannir')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('raison')
        .setDescription('La raison du bannissement')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const moderator = interaction.user;

    try {
      // Vérifier que l'utilisateur n'est pas le bot
      if (target.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Je ne peux pas me bannir moi-même!',
          ephemeral: true
        });
      }

      // Vérifier que l'utilisateur n'est pas le modérateur lui-même
      if (target.id === moderator.id) {
        return interaction.reply({
          content: '❌ Vous ne pouvez pas vous bannir vous-même!',
          ephemeral: true
        });
      }

      // Récupérer le membre sur le serveur
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      // Vérifier les permissions hiérarchiques si le membre est sur le serveur
      if (member) {
        const { canModerate } = require('../../utils/permissions');
        
        if (!canModerate(interaction.member, member)) {
          return interaction.reply({
            content: '❌ Vous ne pouvez pas bannir ce membre (permissions insuffisantes).',
            ephemeral: true
          });
        }
      }

      // Envoyer un message privé à l'utilisateur avant le ban
      try {
        await target.send({
          content: `⛔ Vous avez été **banni** de **${interaction.guild.name}**\n\n` +
            `**Raison:** ${reason}\n` +
            `**Modérateur:** ${moderator.tag}\n\n` +
            `Pour contester cette sanction, contactez l'équipe de modération.`
        });
      } catch (error) {
        logger.debug(`Impossible d'envoyer un MP à ${target.tag}`);
      }

      // Bannir l'utilisateur
      await interaction.guild.members.ban(target.id, {
        reason: `${reason} | Par ${moderator.tag}`
      });

      // Enregistrer dans la base de données
      addBan(target.id, moderator.id, reason);
      addModLog('BAN', moderator.id, target.id, reason);

      // Créer l'embed de confirmation
      const embed = moderationEmbed(
        '⛔ Utilisateur Banni',
        moderator,
        target,
        reason
      );

      // Répondre à l'interaction
      await interaction.reply({ embeds: [embed] });

      // Log dans le salon de modération
      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ ${target.tag} a été banni par ${moderator.tag} - Raison: ${reason}`);

    } catch (error) {
      logger.error('Erreur lors du bannissement:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du bannissement.',
        ephemeral: true
      });
    }
  },
};
