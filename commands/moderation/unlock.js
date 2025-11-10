const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouiller un salon')
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Le salon à déverrouiller (défaut: salon actuel)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon') || interaction.channel;
    const moderator = interaction.user;

    try {
      const everyoneRole = interaction.guild.roles.everyone;
      const memberRole = interaction.guild.roles.cache.get(process.env.ROLE_MEMBER);

      // Déverrouiller pour @everyone
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null
      });

      // Déverrouiller pour @Members
      if (memberRole) {
        await channel.permissionOverwrites.edit(memberRole, {
          SendMessages: null
        });
      }

      const embed = successEmbed(
        '🔓 Salon Déverrouillé',
        `Ce salon a été **déverrouillé** par ${moderator}\n\n` +
        `**Salon:** ${channel}`
      );

      await channel.send({ embeds: [embed] });

      if (channel.id !== interaction.channel.id) {
        await interaction.reply({
          content: `✅ Le salon ${channel} a été déverrouillé.`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '✅ Salon déverrouillé.',
          ephemeral: true
        });
      }

      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ #${channel.name} déverrouillé par ${moderator.tag}`);

    } catch (error) {
      logger.error('Erreur lors du déverrouillage:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du déverrouillage du salon.',
        ephemeral: true
      });
    }
  },
};
