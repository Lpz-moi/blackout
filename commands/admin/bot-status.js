const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('🎮 Changer le statut du bot')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Le nouveau message de statut')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type d\'activité')
        .setRequired(false)
        .addChoices(
          { name: '🎮 Joue à', value: 'PLAYING' },
          { name: '👀 Regarde', value: 'WATCHING' },
          { name: '🎧 Écoute', value: 'LISTENING' },
          { name: '📺 Stream', value: 'STREAMING' }
        ))
    .setDefaultMemberPermissions(0),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    try {
      const message = interaction.options.getString('message');
      const typeChoice = interaction.options.getString('type') || 'WATCHING';

      const activityTypes = {
        'PLAYING': ActivityType.Playing,
        'WATCHING': ActivityType.Watching,
        'LISTENING': ActivityType.Listening,
        'STREAMING': ActivityType.Streaming
      };

      const activityType = activityTypes[typeChoice];

      // Changer le statut
      await interaction.client.user.setActivity(message, { type: activityType });

      logger.success(`Statut du bot changé: ${typeChoice} ${message}`);

      await interaction.reply({ 
        embeds: [successEmbed(
          'Statut mis à jour',
          `Le statut du bot a été changé en:\n**${typeChoice}** ${message}`
        )], 
        ephemeral: true 
      });
    } catch (error) {
      logger.error('Erreur /bot-status:', error);
      await interaction.reply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de changer le statut du bot.')], 
        ephemeral: true 
      });
    }
  },
};
