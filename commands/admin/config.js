const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('📋 Afficher la configuration actuelle du bot')
    .setDefaultMemberPermissions(0),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('⚙️ Configuration du Bot Kasouta')
        .setDescription('Configuration actuelle du bot et du serveur')
        .addFields(
          { 
            name: '🎮 Informations Générales', 
            value: `**Bot:** Kasouta\n**Préfixe:** /\n**Statut:** ${config.bot.activity}\n**Couleur principale:** ${config.colors.primary}`, 
            inline: false 
          },
          { 
            name: '🎭 Rôles Configurés', 
            value: config.permissions.hierarchy.map(role => 
              `${role}: <@&${process.env[`ROLE_${role}`] || 'Non configuré'}>`
            ).join('\n') || 'Aucun rôle configuré', 
            inline: false 
          },
          { 
            name: '📺 Salons Principaux', 
            value: `**Tickets:** <#${process.env.CHANNEL_TICKETS || 'Non configuré'}>\n` +
                   `**Demandes:** <#${process.env.CHANNEL_REQUESTS || 'Non configuré'}>\n` +
                   `**Annonces:** <#${process.env.CHANNEL_ANNOUNCEMENTS || 'Non configuré'}>\n` +
                   `**Logs Modération:** <#${process.env.CHANNEL_LOGS_MODERATION || 'Non configuré'}>`, 
            inline: false 
          },
          { 
            name: '🛡️ Modération', 
            value: `**Warns max:** ${config.moderation.maxWarnsBeforeKick}\n` +
                   `**Durées mute:** ${config.moderation.muteDurations.join(', ')}`, 
            inline: false 
          },
          { 
            name: '📋 Commandes', 
            value: `Utilisez:\n` +
                   `• \`/config-roles\` - Gérer les rôles\n` +
                   `• \`/config-channels\` - Gérer les salons\n` +
                   `• \`/bot-status\` - Changer le statut`, 
            inline: false 
          }
        )
        .setFooter({ text: 'Kasouta Configuration' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Erreur /config:', error);
      await interaction.reply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de récupérer la configuration.')], 
        ephemeral: true 
      });
    }
  },
};
