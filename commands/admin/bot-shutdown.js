const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, warningEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-shutdown')
    .setDescription('🛑 Arrêter le bot complètement')
    .setDefaultMemberPermissions(0),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    try {
      await interaction.reply({ 
        embeds: [warningEmbed(
          'Arrêt du bot',
          '🛑 Le bot va s\'arrêter dans 5 secondes.\n⚠️ Redémarrage manuel nécessaire.'
        )], 
        ephemeral: true 
      });

      logger.error(`Bot arrêté par ${interaction.user.tag}`);

      setTimeout(() => {
        process.exit(1); // Arrêt complet
      }, 5000);

    } catch (error) {
      logger.error('Erreur /bot-shutdown:', error);
      await interaction.reply({ 
        embeds: [errorEmbed('Erreur', 'Impossible d\'arrêter le bot.')], 
        ephemeral: true 
      });
    }
  },
};
