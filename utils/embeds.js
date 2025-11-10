const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Créer un embed de base avec le style Kasouta
 */
function createBaseEmbed(color = 'primary') {
  const hexColor = config.colors[color] || config.colors.primary;
  
  return new EmbedBuilder()
    .setColor(hexColor)
    .setFooter({ text: 'Kasouta Bot' })
    .setTimestamp();
}

/**
 * Embed de succès
 */
function successEmbed(title, description) {
  return createBaseEmbed('success')
    .setTitle(`${config.emojis.success} ${title}`)
    .setDescription(description);
}

/**
 * Embed d'erreur
 */
function errorEmbed(title, description) {
  return createBaseEmbed('error')
    .setTitle(`${config.emojis.error} ${title}`)
    .setDescription(description);
}

/**
 * Embed d'avertissement
 */
function warningEmbed(title, description) {
  return createBaseEmbed('warning')
    .setTitle(`${config.emojis.warning} ${title}`)
    .setDescription(description);
}

/**
 * Embed d'information
 */
function infoEmbed(title, description) {
  return createBaseEmbed('info')
    .setTitle(`${config.emojis.info} ${title}`)
    .setDescription(description);
}

/**
 * Embed de modération
 */
function moderationEmbed(action, moderator, target, reason, additionalFields = []) {
  const embed = createBaseEmbed('primary')
    .setTitle(`${action} - Modération`)
    .addFields(
      { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
      { name: '🛡️ Modérateur', value: `${moderator.tag}`, inline: true },
      { name: '📝 Raison', value: reason || 'Aucune raison fournie', inline: false }
    );
  
  // Ajouter des champs supplémentaires si fournis
  if (additionalFields.length > 0) {
    embed.addFields(additionalFields);
  }
  
  return embed;
}

/**
 * Embed de ticket
 */
function ticketEmbed(ticketNumber, type, user, status = 'En attente') {
  const ticketConfig = config.tickets.types[type];
  
  return createBaseEmbed('secondary')
    .setTitle(`${config.emojis.ticket} Nouveau Ticket - ${ticketConfig.label}`)
    .setDescription(ticketConfig.description)
    .addFields(
      { name: '👤 Utilisateur', value: `${user.tag}`, inline: true },
      { name: '🎫 Numéro', value: `#${ticketNumber}`, inline: true },
      { name: '📊 Statut', value: status, inline: true },
      { name: '🏷️ Type', value: ticketConfig.label, inline: false }
    );
}

/**
 * Embed de demande communautaire
 */
function communityRequestEmbed(requestNumber, title, description, user) {
  return createBaseEmbed('secondary')
    .setTitle('📦 Nouvelle Demande Communautaire')
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .addFields(
      { name: '📋 Titre', value: title, inline: false },
      { name: '📝 Description', value: description, inline: false },
      { name: '👤 Demandeur', value: `${user}`, inline: true },
      { name: '🔢 ID', value: `#${requestNumber}`, inline: true },
      { name: '📊 Statut', value: '⏳ En attente de réponse', inline: true }
    )
    .setFooter({ text: `ID: #${requestNumber} | Réagissez pour proposer votre aide` });
}

/**
 * Embed d'annonce
 */
function announcementEmbed(title, message, important = false) {
  const embed = createBaseEmbed(important ? 'error' : 'success')
    .setTitle(`${config.emojis.announce} ${title}`)
    .setDescription(message);
  
  if (important) {
    embed.setFooter({ text: '⚠️ ANNONCE IMPORTANTE - Kasouta Bot' });
  }
  
  return embed;
}

/**
 * Embed de profil utilisateur
 */
function userInfoEmbed(user, member, warnings = 0) {
  const embed = createBaseEmbed('info')
    .setTitle(`📊 Informations - ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '🆔 ID Discord', value: user.id, inline: true },
      { name: '📅 Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '📥 Arrivé sur le serveur', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
      { name: '⚠️ Avertissements', value: `${warnings}/3`, inline: true },
      { name: '🎭 Rôles', value: member ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'Aucun' : 'N/A', inline: false }
    );
  
  if (warnings >= 2) {
    embed.setColor(config.colors.warning);
  }
  
  return embed;
}

/**
 * Embed de statistiques serveur
 */
function serverInfoEmbed(guild) {
  return createBaseEmbed('info')
    .setTitle(`📊 Informations - ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👥 Membres', value: `${guild.memberCount}`, inline: true },
      { name: '💬 Salons', value: `${guild.channels.cache.size}`, inline: true },
      { name: '🎭 Rôles', value: `${guild.roles.cache.size}`, inline: true },
      { name: '📅 Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: '👑 Fondateur', value: `<@${guild.ownerId}>`, inline: true },
      { name: '🆔 ID', value: guild.id, inline: true }
    );
}

/**
 * Embed d'aide
 */
function helpEmbed(commandCategories, userPermissionLevel) {
  const embed = createBaseEmbed('info')
    .setTitle('📚 Menu d\'aide - Kasouta Bot')
    .setDescription('Voici toutes les commandes disponibles selon vos permissions:');
  
  // Filtrer et afficher les commandes selon les permissions
  for (const [category, commands] of Object.entries(commandCategories)) {
    const availableCommands = commands.filter(cmd => cmd.permissionLevel <= userPermissionLevel);
    
    if (availableCommands.length > 0) {
      const commandList = availableCommands.map(cmd => `\`/${cmd.name}\` - ${cmd.description}`).join('\n');
      embed.addFields({ name: `${category}`, value: commandList, inline: false });
    }
  }
  
  return embed;
}

module.exports = {
  createBaseEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  moderationEmbed,
  ticketEmbed,
  communityRequestEmbed,
  announcementEmbed,
  userInfoEmbed,
  serverInfoEmbed,
  helpEmbed
};
