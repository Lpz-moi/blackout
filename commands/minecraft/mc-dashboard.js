const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { getServerStatus } = require('../../utils/minecraft');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store du dernier message pour l'auto-refresh
let dashboardData = {
  messageId: null,
  channelId: null,
  guildId: null
};

let autoRefreshInterval = null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mc-dashboard')
    .setDescription('🎮 Dashboard Minecraft unifié (statut, joueurs, IP, version)'),

  async execute(interaction) {
    try {
      // Vérifier si l'utilisateur est admin
      if (!interaction.memberPermissions.has('ADMINISTRATOR')) {
        return interaction.reply({
          content: '❌ Seuls les administrateurs peuvent utiliser cette commande.',
          flags: 64
        });
      }

      await interaction.deferReply();

      const serverData = await getServerStatus();
      const embed = createDashboardEmbed(serverData);

      const message = await interaction.editReply({ 
        embeds: [embed],
        fetchReply: true
      });

      // Sauvegarder et démarrer auto-refresh automatiquement
      dashboardData = {
        messageId: message.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId
      };

      startAutoRefresh(interaction.client);

      await interaction.followUp({
        content: '🚀 **Dashboard Minecraft activé !** Rafraîchissement automatique toutes les 10 minutes.',
        flags: 64
      });

      logger.success(`✅ Dashboard MC activé dans ${interaction.channel.name}`);

    } catch (error) {
      logger.error('Erreur /mc-dashboard:', error);
      await interaction.editReply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de récupérer les données du serveur Minecraft.')],
      });
    }
  },
};

function createDashboardEmbed(data) {
  const isOnline = data.online;
  const statusEmoji = isOnline ? '🟢' : '🔴';
  const statusText = isOnline ? 'En ligne' : 'Hors ligne';

  const embed = new EmbedBuilder()
    .setColor(isOnline ? config.colors.success : config.colors.error)
    .setTitle('🎮 Dashboard Minecraft - Paladium Bedrock 🚀')
    .setDescription(`${statusEmoji} **Statut:** ${statusText}`)
    .setThumbnail('https://mc-api.net/v3/server/favicon/play.paladium-bedrock.fr')
    .setTimestamp()
    .setFooter({ text: '🔄 Rafraîchissement automatique (10 min)' });

  if (isOnline) {
    embed.addFields(
      { 
        name: '📊 Joueurs', 
        value: `**${data.players.online}/${data.players.max}** joueurs connectés`, 
        inline: true 
      },
      { 
        name: '🌐 Adresse IP', 
        value: `\`\`\`${data.ip || 'play.paladium-bedrock.fr'}\`\`\``, 
        inline: true 
      },
      { 
        name: '📦 Version', 
        value: data.version || 'Bedrock Edition', 
        inline: true 
      },
      { 
        name: '⚡ Ping', 
        value: `${data.ping || 'N/A'}ms`, 
        inline: true 
      },
      { 
        name: '🌍 Région', 
        value: 'France 🇫🇷', 
        inline: true 
      },
      { 
        name: '📝 MOTD', 
        value: data.motd || 'Serveur Paladium Bedrock', 
        inline: false 
      }
    );

    // Afficher les joueurs si disponibles
    if (data.players.list && data.players.list.length > 0) {
      const playerList = data.players.list.slice(0, 15).join(', ');
      embed.addFields({ 
        name: '👥 Joueurs en ligne', 
        value: playerList + (data.players.list.length > 15 ? `... +${data.players.list.length - 15}` : ''), 
        inline: false 
      });
    }
  } else {
    embed.addFields(
      { 
        name: '🌐 Adresse IP', 
        value: `\`\`\`play.paladium-bedrock.fr\`\`\``, 
        inline: false 
      },
      { 
        name: '❌ Information', 
        value: 'Le serveur est actuellement hors ligne ou inaccessible.', 
        inline: false 
      }
    );
  }

  return embed;
}

function startAutoRefresh(client) {
  // Nettoyer l'ancien interval
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  logger.info('🚀 Auto-refresh du Dashboard Minecraft ACTIVÉ');

  // Première mise à jour immédiate après 1 min
  setTimeout(() => refreshDashboard(client), 60 * 1000);

  // Créer un nouvel interval (10 minutes)
  autoRefreshInterval = setInterval(() => {
    refreshDashboard(client);
  }, 10 * 60 * 1000); // 10 minutes
}

async function refreshDashboard(client) {
  if (!dashboardData.messageId) {
    clearInterval(autoRefreshInterval);
    return;
  }

  try {
    const guild = await client.guilds.fetch(dashboardData.guildId);
    const channel = await guild.channels.fetch(dashboardData.channelId);
    const message = await channel.messages.fetch(dashboardData.messageId);

    const serverData = await getServerStatus();
    const embed = createDashboardEmbed(serverData);

    await message.edit({ embeds: [embed] });
    logger.success('✅ Dashboard MC auto-rafraîchi');

  } catch (error) {
    logger.error('Erreur lors du rafraîchissement automatique:', error);
    dashboardData = { messageId: null, channelId: null, guildId: null };
    clearInterval(autoRefreshInterval);
  }
}