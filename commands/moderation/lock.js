const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouiller un salon')
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Le salon à verrouiller (défaut: salon actuel)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('raison')
        .setDescription('La raison du verrouillage')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon') || interaction.channel;
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const moderator = interaction.user;

    try {
      // Récupérer le rôle @everyone
      const everyoneRole = interaction.guild.roles.everyone;
      const memberRole = interaction.guild.roles.cache.get(process.env.ROLE_MEMBER);

      // Verrouiller pour @everyone
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });

      // Verrouiller pour @Members si le rôle existe
      if (memberRole) {
        await channel.permissionOverwrites.edit(memberRole, {
          SendMessages: false
        });
      }

      // Créer l'embed
      const embed = infoEmbed(
        '🔒 Salon Verrouillé',
        `Ce salon a été **verrouillé** par ${moderator}\n\n` +
        `**Raison:** ${reason}\n` +
        `**Salon:** ${channel}`
      );

      // Message dans le salon verrouillé
      await channel.send({ embeds: [embed] });

      // Réponse à la commande (si différent du salon verrouillé)
      if (channel.id !== interaction.channel.id) {
        await interaction.reply({
          content: `✅ Le salon ${channel} a été verrouillé.`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '✅ Salon verrouillé.',
          ephemeral: true
        });
      }

      // Log dans le salon de modération
      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ #${channel.name} verrouillé par ${moderator.tag} - Raison: ${reason}`);

    } catch (error) {
      logger.error('Erreur lors du verrouillage:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du verrouillage du salon.',
        ephemeral: true
      });
    }
  },
};
