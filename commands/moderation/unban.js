const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeBan, addModLog } = require('../../utils/database');
const { successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un utilisateur')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('L\'ID Discord de l\'utilisateur à débannir')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const userId = interaction.options.getString('userid');
    const moderator = interaction.user;

    try {
      // Vérifier que l'utilisateur est banni
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        return interaction.reply({
          content: '❌ Cet utilisateur n\'est pas banni.',
          ephemeral: true
        });
      }

      // Débannir l'utilisateur
      await interaction.guild.members.unban(userId, `Débanni par ${moderator.tag}`);

      // Mettre à jour la base de données
      removeBan(userId);
      addModLog('UNBAN', moderator.id, userId, 'Débannissement');

      // Créer l'embed de confirmation
      const embed = successEmbed(
        'Utilisateur Débanni',
        `**${bannedUser.user.tag}** a été débanni par ${moderator}\n\n` +
        `**ID:** ${userId}`
      );

      // Répondre à l'interaction
      await interaction.reply({ embeds: [embed] });

      // Log dans le salon de modération
      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ ${bannedUser.user.tag} a été débanni par ${moderator.tag}`);

    } catch (error) {
      logger.error('Erreur lors du débannissement:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du débannissement.',
        ephemeral: true
      });
    }
  },
};
