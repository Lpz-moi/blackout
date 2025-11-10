const logger = require('../utils/logger');
const { checkPermission } = require('../utils/permissions');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Gérer les slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`❌ Commande inconnue: ${interaction.commandName}`);
        return;
      }

      try {
        // Logger l'utilisation de la commande
        logger.command(interaction.commandName, interaction.user, interaction.guild);

        // Vérifier les permissions si la commande en requiert
        if (command.permission) {
          const hasPermission = await checkPermission(interaction, command.permission);
          if (!hasPermission) return;
        }

        // Exécuter la commande
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Erreur lors de l'exécution de /${interaction.commandName}:`, error);
        
        const errorMessage = {
          content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // Gérer les boutons
    if (interaction.isButton()) {
      try {
        const buttonId = interaction.customId;

        // Boutons de tickets
        if (buttonId.startsWith('ticket-')) {
          const ticketHandler = require('../commands/tickets/ticket-handler');
          await ticketHandler.handleButton(interaction);
        }
        
        // Boutons de demandes communautaires
        if (buttonId.startsWith('request-')) {
          const requestHandler = require('../commands/community/request-handler');
          await requestHandler.handleButton(interaction);
        }

        // Boutons du dashboard Minecraft
        if (buttonId.startsWith('mc-')) {
          const minecraftHandler = require('../commands/minecraft/mc-dashboard');
          const { getServerStatus } = require('../utils/minecraft');
          const { createDashboardEmbed, createDashboardButtons } = minecraftHandler;

          if (buttonId === 'mc-refresh') {
            await interaction.deferUpdate();
            const serverData = await getServerStatus();
            const embed = require('../utils/embeds').createBaseEmbed('info')
              .setTitle('🎮 Dashboard Minecraft - Paladium Bedrock')
              .setDescription(serverData.online ? '🟢 **Statut:** En ligne' : '🔴 **Statut:** Hors ligne')
              .setTimestamp();
            
            if (serverData.online) {
              embed.addFields(
                { name: '📊 Joueurs', value: `**${serverData.players.online}/${serverData.players.max}** joueurs`, inline: true },
                { name: '🌐 IP', value: '`play.paladium-bedrock.fr`', inline: true },
                { name: '⚡ Ping', value: `${serverData.ping || 'N/A'}ms`, inline: true }
              );
            }

            const buttons = new (require('discord.js').ActionRowBuilder)()
              .addComponents(
                new (require('discord.js').ButtonBuilder)().setCustomId('mc-refresh').setLabel('🔄 Rafraîchir').setStyle(require('discord.js').ButtonStyle.Primary),
                new (require('discord.js').ButtonBuilder)().setCustomId('mc-details').setLabel('📊 Plus de détails').setStyle(require('discord.js').ButtonStyle.Secondary),
                new (require('discord.js').ButtonBuilder)().setCustomId('mc-players').setLabel('👥 Voir joueurs').setStyle(require('discord.js').ButtonStyle.Success)
              );

            await interaction.editReply({ embeds: [embed], components: [buttons] });
          }
        }

        // Bouton "J'ai lu" pour les annonces
        if (buttonId === 'announce-read') {
          await interaction.reply({
            content: '✅ Merci d\'avoir lu l\'annonce!',
            ephemeral: true
          });
        }

      } catch (error) {
        logger.error('Erreur lors de la gestion du bouton:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Une erreur est survenue.',
            ephemeral: true
          });
        }
      }
    }

    // Gérer les menus déroulants
    if (interaction.isStringSelectMenu()) {
      try {
        // Ajouter la gestion des menus si nécessaire
        logger.info(`Menu sélectionné: ${interaction.customId}`);
      } catch (error) {
        logger.error('Erreur lors de la gestion du menu:', error);
      }
    }

    // Gérer les modals
    if (interaction.isModalSubmit()) {
      try {
        logger.info(`Modal soumis: ${interaction.customId}`);
        // Ajouter la gestion des modals si nécessaire
      } catch (error) {
        logger.error('Erreur lors de la gestion du modal:', error);
      }
    }
  },
};
