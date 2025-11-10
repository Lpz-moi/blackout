const { SlashCommandBuilder } = require('discord.js');
const { addMute, addModLog, getOrCreateUser } = require('../../utils/database');
const { moderationEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute un membre temporairement')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Le membre à mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duree')
        .setDescription('Durée du mute')
        .setRequired(true)
        .addChoices(
          { name: '1 heure', value: '1h' },
          { name: '2 heures', value: '2h' },
          { name: '6 heures', value: '6h' },
          { name: '12 heures', value: '12h' },
          { name: '24 heures', value: '24h' },
          { name: '7 jours', value: '7d' },
          { name: '30 jours', value: '30d' }
        ))
    .addStringOption(option =>
      option.setName('raison')
        .setDescription('La raison du mute')
        .setRequired(false)),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur');
    const durationStr = interaction.options.getString('duree');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const moderator = interaction.user;

    try {
      // Vérifier que l'utilisateur n'est pas le bot
      if (target.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Je ne peux pas me mute moi-même!',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(target.id);

      // Vérifier les permissions
      const { canModerate } = require('../../utils/permissions');
      if (!canModerate(interaction.member, member)) {
        return interaction.reply({
          content: '❌ Vous ne pouvez pas mute ce membre (permissions insuffisantes).',
          ephemeral: true
        });
      }

      // Convertir la durée en millisecondes
      const duration = ms(durationStr);
      const unmuteAt = new Date(Date.now() + duration);

      // Créer l'utilisateur s'il n'existe pas
      getOrCreateUser(target.id, target.username, target.discriminator);

      // Retirer le rôle @Members
      const memberRole = interaction.guild.roles.cache.get(process.env.ROLE_MEMBER);
      if (memberRole && member.roles.cache.has(memberRole.id)) {
        await member.roles.remove(memberRole);
      }

      // Enregistrer dans la base de données
      addMute(target.id, moderator.id, reason, duration, unmuteAt.toISOString());
      addModLog('MUTE', moderator.id, target.id, reason, `Durée: ${durationStr}`);

      // Créer l'embed
      const embed = moderationEmbed(
        '🔇 Membre Mute',
        moderator,
        target,
        reason,
        [
          { name: '⏱️ Durée', value: durationStr, inline: true },
          { name: '🕐 Fin du mute', value: `<t:${Math.floor(unmuteAt.getTime() / 1000)}:R>`, inline: true }
        ]
      );

      // Envoyer un MP à l'utilisateur
      try {
        await target.send({
          content: `🔇 Vous avez été **mute** sur **${interaction.guild.name}**\n\n` +
            `**Raison:** ${reason}\n` +
            `**Durée:** ${durationStr}\n` +
            `**Fin du mute:** <t:${Math.floor(unmuteAt.getTime() / 1000)}:F>\n` +
            `**Modérateur:** ${moderator.tag}`
        });
      } catch (error) {
        logger.debug(`Impossible d'envoyer un MP à ${target.tag}`);
      }

      // Répondre à l'interaction
      await interaction.reply({ embeds: [embed] });

      // Log dans le salon de modération
      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ ${target.tag} a été mute pour ${durationStr} par ${moderator.tag}`);

    } catch (error) {
      logger.error('Erreur lors du mute:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du mute.',
        ephemeral: true
      });
    }
  },
};
