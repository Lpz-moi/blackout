const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprimer des messages dans le salon')
    .addIntegerOption(option =>
      option.setName('nombre')
        .setDescription('Nombre de messages à supprimer (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Supprimer uniquement les messages de cet utilisateur')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const amount = interaction.options.getInteger('nombre');
    const targetUser = interaction.options.getUser('utilisateur');

    try {
      // Récupérer les messages
      const messages = await interaction.channel.messages.fetch({ limit: amount + 1 });

      let messagesToDelete;
      
      if (targetUser) {
        // Filtrer par utilisateur
        messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id);
      } else {
        messagesToDelete = messages;
      }

      // Supprimer les messages
      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
      const deletedCount = deleted.size;

      // Créer l'embed de confirmation
      const embed = successEmbed(
        'Messages Supprimés',
        `✅ **${deletedCount}** message(s) supprimé(s)${targetUser ? ` de ${targetUser.tag}` : ''}\n\n` +
        `**Salon:** ${interaction.channel}\n` +
        `**Modérateur:** ${interaction.user}`
      );

      // Réponse éphémère
      await interaction.reply({ embeds: [embed], ephemeral: true });

      // Log dans le salon de modération
      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ ${deletedCount} messages supprimés dans #${interaction.channel.name} par ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Erreur lors de la suppression des messages:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la suppression des messages. Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.',
        ephemeral: true
      });
    }
  },
};
