const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createTicket, getNextTicketNumber, closeTicket, getTicket, getOrCreateUser } = require('../../utils/database');
const { ticketEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../config.json');
const logger = require('../../utils/logger');

async function handleButton(interaction) {
  const buttonId = interaction.customId;

  // Création de ticket
  if (buttonId.startsWith('ticket-') && !buttonId.includes('close')) {
    const ticketType = buttonId.replace('ticket-', '');
    await createNewTicket(interaction, ticketType);
  }

  // Fermeture de ticket
  if (buttonId === 'ticket-close') {
    await closeTicketPrompt(interaction);
  }

  // Confirmation de fermeture
  if (buttonId === 'ticket-close-confirm') {
    await confirmCloseTicket(interaction);
  }

  // Annulation de fermeture
  if (buttonId === 'ticket-close-cancel') {
    await interaction.update({
      content: '❌ Fermeture annulée.',
      components: []
    });
  }
}

async function createNewTicket(interaction, ticketType) {
  try {
    // Déférer immédiatement pour éviter le timeout
    await interaction.deferReply({ ephemeral: true });

    // Vérifier si l'utilisateur a déjà un ticket ouvert
    const existingTickets = interaction.guild.channels.cache.filter(
      channel => channel.name.includes(`ticket-`) && channel.topic === interaction.user.id
    );

    if (existingTickets.size > 0) {
      return interaction.editReply({
        content: '❌ Vous avez déjà un ticket ouvert! Veuillez le fermer avant d\'en créer un nouveau.'
      });
    }

    // Créer ou récupérer l'utilisateur dans la base de données
    getOrCreateUser(interaction.user.id, interaction.user.username, interaction.user.discriminator);

    // Obtenir le prochain numéro de ticket
    const ticketNumber = getNextTicketNumber();

    // Créer le salon
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${ticketNumber}-${ticketType}`,
      type: ChannelType.GuildText,
      topic: interaction.user.id,
      parent: interaction.channel.parent,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

    // Ajouter les permissions pour le staff
    const staffRoles = [
      process.env.ROLE_DEVELOPER,
      process.env.ROLE_ADMINISTRATOR,
      process.env.ROLE_MODERATOR,
      process.env.ROLE_SUPPORT
    ].filter(Boolean);

    for (const roleId of staffRoles) {
      await ticketChannel.permissionOverwrites.create(roleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    }

    // Créer l'embed du ticket
    const embed = ticketEmbed(
      ticketNumber,
      ticketType,
      interaction.user,
      '⏳ En attente'
    );

    // Boutons de gestion
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket-close')
          .setLabel('Fermer le ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

    // Message de bienvenue
    await ticketChannel.send({
      content: `${interaction.user} | Équipe: <@&${process.env.ROLE_SUPPORT}>`,
      embeds: [embed],
      components: [row]
    });

    // Enregistrer dans la base de données
    createTicket(ticketNumber, ticketChannel.id, interaction.user.id, ticketType);

    // Confirmer à l'utilisateur
    await interaction.editReply({
      content: `✅ Votre ticket a été créé: ${ticketChannel}`
    });

    // Log
    const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_TICKETS);
    if (logChannel) {
      const logEmbed = successEmbed(
        'Nouveau Ticket Créé',
        `**Utilisateur:** ${interaction.user}\n` +
        `**Type:** ${config.tickets.types[ticketType].label}\n` +
        `**Numéro:** #${ticketNumber}\n` +
        `**Salon:** ${ticketChannel}`
      );
      await logChannel.send({ embeds: [logEmbed] });
    }

    logger.success(`✅ Ticket #${ticketNumber} créé par ${interaction.user.tag} (${ticketType})`);

  } catch (error) {
    logger.error('Erreur lors de la création du ticket:', error);
    await interaction.editReply({
      content: '❌ Une erreur est survenue lors de la création du ticket.'
    });
  }
}

async function closeTicketPrompt(interaction) {
  const { isStaff } = require('../../utils/permissions');

  // Vérifier que c'est un staff ou le créateur
  const ticket = getTicket(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ce n\'est pas un salon de ticket valide.',
      ephemeral: true
    });
  }

  if (!isStaff(interaction.member) && interaction.user.id !== ticket.user_id) {
    return interaction.reply({
      content: '❌ Seul le staff ou le créateur du ticket peut le fermer.',
      ephemeral: true
    });
  }

  // Boutons de confirmation
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket-close-confirm')
        .setLabel('Confirmer')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      
      new ButtonBuilder()
        .setCustomId('ticket-close-cancel')
        .setLabel('Annuler')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.reply({
    content: '⚠️ Voulez-vous vraiment fermer ce ticket?',
    components: [row],
    ephemeral: true
  });
}

async function confirmCloseTicket(interaction) {
  try {
    await interaction.update({
      content: '⏳ Fermeture du ticket en cours...',
      components: []
    });

    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return;

    // Enregistrer la fermeture
    closeTicket(interaction.channel.id, interaction.user.id, 'Fermé manuellement');

    // Notification
    await interaction.channel.send({
      content: `✅ Ticket fermé par ${interaction.user}\n\n` +
        `Ce salon sera supprimé dans 10 secondes...`
    });

    // Log
    const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_TICKETS);
    if (logChannel) {
      const { successEmbed } = require('../../utils/embeds');
      const embed = successEmbed(
        'Ticket Fermé',
        `**Ticket:** #${ticket.ticket_number}\n` +
        `**Type:** ${ticket.type}\n` +
        `**Fermé par:** ${interaction.user}\n` +
        `**Créateur:** <@${ticket.user_id}>`
      );
      await logChannel.send({ embeds: [embed] });
    }

    // Supprimer le salon après 10 secondes
    setTimeout(async () => {
      await interaction.channel.delete();
      logger.success(`✅ Ticket #${ticket.ticket_number} fermé et supprimé`);
    }, 10000);

  } catch (error) {
    logger.error('Erreur lors de la fermeture du ticket:', error);
  }
}

module.exports = {
  handleButton
};
