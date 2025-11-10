const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCommunityRequest, getNextRequestNumber, getOrCreateUser } = require('../../utils/database');
const { communityRequestEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Créer une demande communautaire')
    .addStringOption(option =>
      option.setName('titre')
        .setDescription('Titre de votre demande')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description détaillée')
        .setRequired(true)),
  
  permission: 'MEMBER',

  async execute(interaction) {
    const title = interaction.options.getString('titre');
    const description = interaction.options.getString('description');

    try {
      // S'assurer que l'utilisateur existe dans la base de données
      getOrCreateUser(interaction.user.id, interaction.user.username, interaction.user.discriminator);

      const requestNumber = getNextRequestNumber();
      
      const embed = communityRequestEmbed(requestNumber, title, description, interaction.user);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`request-contact-${requestNumber}`)
            .setLabel('Me contacter en MP')
            .setEmoji('📧')
            .setStyle(ButtonStyle.Primary),
          
          new ButtonBuilder()
            .setCustomId(`request-resolve-${requestNumber}`)
            .setLabel('Marquer comme résolu')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
        );

      const channel = interaction.guild.channels.cache.get(process.env.CHANNEL_DEMANDES);
      
      if (!channel) {
        return interaction.reply({
          content: '❌ Le salon des demandes n\'est pas configuré.',
          flags: 64
        });
      }

      const message = await channel.send({ embeds: [embed], components: [row] });

      createCommunityRequest(requestNumber, message.id, interaction.user.id, title, description);

      await interaction.reply({
        content: `✅ Votre demande #${requestNumber} a été créée dans ${channel}`,
        flags: 64
      });

      logger.success(`✅ Demande #${requestNumber} créée par ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Erreur lors de la création de la demande:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la création de votre demande.',
        flags: 64
      });
    }
  },
};