const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addKick, addModLog } = require('../../utils/database');
const { moderationEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre du serveur')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Le membre à expulser')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('raison')
        .setDescription('La raison de l\'expulsion')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const moderator = interaction.user;

    try {
      if (target.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Je ne peux pas me kick moi-même!',
          ephemeral: true
        });
      }

      if (target.id === moderator.id) {
        return interaction.reply({
          content: '❌ Vous ne pouvez pas vous kick vous-même!',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(target.id);

      const { canModerate } = require('../../utils/permissions');
      if (!canModerate(interaction.member, member)) {
        return interaction.reply({
          content: '❌ Vous ne pouvez pas kick ce membre (permissions insuffisantes).',
          ephemeral: true
        });
      }

      // MP avant kick
      try {
        await target.send({
          content: `👢 Vous avez été **expulsé** de **${interaction.guild.name}**\n\n` +
            `**Raison:** ${reason}\n` +
            `**Modérateur:** ${moderator.tag}`
        });
      } catch (error) {
        logger.debug(`Impossible d'envoyer un MP à ${target.tag}`);
      }

      // Kick
      await member.kick(`${reason} | Par ${moderator.tag}`);

      // Base de données
      addKick(target.id, moderator.id, reason);
      addModLog('KICK', moderator.id, target.id, reason);

      const embed = moderationEmbed(
        '👢 Membre Expulsé',
        moderator,
        target,
        reason
      );

      await interaction.reply({ embeds: [embed] });

      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ ${target.tag} a été kick par ${moderator.tag}`);

    } catch (error) {
      logger.error('Erreur lors du kick:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'expulsion.',
        ephemeral: true
      });
    }
  },
};
