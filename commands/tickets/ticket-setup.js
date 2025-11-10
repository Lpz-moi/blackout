const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { createBaseEmbed } = require('../../utils/embeds');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Initialiser le système de tickets')
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Le salon où envoyer le message de tickets')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');

    try {
      // Créer l'embed de bienvenue
      const embed = createBaseEmbed('primary')
        .setTitle('🎫 Système de Tickets - Kasouta')
        .setDescription(
          'Bienvenue dans notre système de tickets! Sélectionnez le type de demande qui correspond le mieux à votre besoin en cliquant sur l\'un des boutons ci-dessous.\n\n' +
          'Notre équipe vous répondra dans les plus brefs délais.\n\n' +
          '**Types de tickets disponibles:**\n' +
          `${config.tickets.types['demande-role'].emoji} **${config.tickets.types['demande-role'].label}** - ${config.tickets.types['demande-role'].description}\n` +
          `${config.tickets.types['recrutement'].emoji} **${config.tickets.types['recrutement'].label}** - ${config.tickets.types['recrutement'].description}\n` +
          `${config.tickets.types['fondation'].emoji} **${config.tickets.types['fondation'].label}** - ${config.tickets.types['fondation'].description}\n` +
          `${config.tickets.types['autre'].emoji} **${config.tickets.types['autre'].label}** - ${config.tickets.types['autre'].description}`
        )
        .setFooter({ text: 'Cliquez sur un bouton pour créer un ticket' });

      // Créer les boutons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket-demande-role')
            .setLabel('Demande de rôle')
            .setEmoji(config.tickets.types['demande-role'].emoji)
            .setStyle(ButtonStyle.Primary),
          
          new ButtonBuilder()
            .setCustomId('ticket-recrutement')
            .setLabel('Recrutement')
            .setEmoji(config.tickets.types['recrutement'].emoji)
            .setStyle(ButtonStyle.Success),
          
          new ButtonBuilder()
            .setCustomId('ticket-fondation')
            .setLabel('Fondation')
            .setEmoji(config.tickets.types['fondation'].emoji)
            .setStyle(ButtonStyle.Danger),
          
          new ButtonBuilder()
            .setCustomId('ticket-autre')
            .setLabel('Autre')
            .setEmoji(config.tickets.types['autre'].emoji)
            .setStyle(ButtonStyle.Secondary)
        );

      // Envoyer le message dans le salon
      await channel.send({
        embeds: [embed],
        components: [row]
      });

      // Confirmer au modérateur
      await interaction.reply({
        content: `✅ Système de tickets initialisé dans ${channel}`,
        ephemeral: true
      });

      logger.success(`✅ Système de tickets configuré dans #${channel.name} par ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Erreur lors de la configuration des tickets:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la configuration du système de tickets.',
        ephemeral: true
      });
    }
  },
};
