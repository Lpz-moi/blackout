const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, warningEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-restart')
    .setDescription('🔄 Redémarrer le bot')
    .setDefaultMemberPermissions(0),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    try {
      await interaction.reply({ 
        embeds: [warningEmbed(
          'Redémarrage en cours...',
          '🔄 Le bot va redémarrer dans 5 secondes.\nReconnexion automatique...'
        )], 
        ephemeral: true 
      });

      logger.warn(`Bot redémarré par ${interaction.user.tag}`);

      // Attendre 5 secondes avant de redémarrer
      setTimeout(() => {
        process.exit(0); // Process manager (PM2/Railway) redémarrera automatiquement
      }, 5000);

    } catch (error) {
      logger.error('Erreur /bot-restart:', error);
      await interaction.reply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de redémarrer le bot.')], 
        ephemeral: true 
      });
    }
  },
};
