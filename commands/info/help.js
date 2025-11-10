const { SlashCommandBuilder } = require('discord.js');
const { helpEmbed } = require('../../utils/embeds');
const { getPermissionLevel } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher toutes les commandes disponibles'),

  async execute(interaction) {
    const userLevel = getPermissionLevel(interaction.member);

    const categories = {
      '🛡️ Modération': [
        { name: 'ban', description: 'Bannir un membre', permissionLevel: 5 },
        { name: 'kick', description: 'Expulser un membre', permissionLevel: 5 },
        { name: 'warn', description: 'Avertir un membre', permissionLevel: 5 },
        { name: 'mute', description: 'Mute un membre', permissionLevel: 5 },
        { name: 'clear', description: 'Supprimer des messages', permissionLevel: 5 },
        { name: 'lock', description: 'Verrouiller un salon', permissionLevel: 5 },
      ],
      '🎫 Tickets': [
        { name: 'ticket-setup', description: 'Initialiser les tickets', permissionLevel: 7 },
      ],
      '📋 Communauté': [
        { name: 'ask', description: 'Créer une demande', permissionLevel: 0 },
      ],
      'ℹ️ Informations': [
        { name: 'help', description: 'Afficher l\'aide', permissionLevel: 0 },
        { name: 'ping', description: 'Vérifier la latence', permissionLevel: 0 },
        { name: 'user-info', description: 'Infos utilisateur', permissionLevel: 0 },
      ],
    };

    const embed = helpEmbed(categories, userLevel);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
