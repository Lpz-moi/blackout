const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed, announcementEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('📢 Créer des annonces dans différents formats')
    .addSubcommand(subcommand =>
      subcommand
        .setName('normal')
        .setDescription('Annonce standard (Modérateur+)')
        .addStringOption(option => option.setName('titre').setDescription('Titre de l\'annonce').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Message de l\'annonce').setRequired(true))
        .addChannelOption(option => option.setName('salon').setDescription('Salon de destination (optionnel)').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('important')
        .setDescription('Annonce importante avec @everyone (Admin+)')
        .addStringOption(option => option.setName('titre').setDescription('Titre de l\'annonce').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Message de l\'annonce').setRequired(true))
        .addChannelOption(option => option.setName('salon').setDescription('Salon de destination (optionnel)').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('partenaire')
        .setDescription('Annonce partenaire (Partners+)')
        .addStringOption(option => option.setName('titre').setDescription('Titre de l\'annonce').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Message de l\'annonce').setRequired(true))
        .addChannelOption(option => option.setName('salon').setDescription('Salon de destination (optionnel)').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('temporaire')
        .setDescription('Annonce avec suppression automatique (Admin+)')
        .addStringOption(option => option.setName('titre').setDescription('Titre de l\'annonce').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Message de l\'annonce').setRequired(true))
        .addStringOption(option => 
          option.setName('duree')
            .setDescription('Durée avant suppression')
            .setRequired(true)
            .addChoices(
              { name: '1 heure', value: '1h' },
              { name: '6 heures', value: '6h' },
              { name: '12 heures', value: '12h' },
              { name: '24 heures', value: '24h' },
              { name: '7 jours', value: '7d' }
            ))
        .addChannelOption(option => option.setName('salon').setDescription('Salon de destination (optionnel)').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('suppression')
        .setDescription('Supprimer une annonce par son ID (Admin+)')
        .addStringOption(option => option.setName('message_id').setDescription('ID du message à supprimer').setRequired(true))
        .addChannelOption(option => option.setName('salon').setDescription('Salon où se trouve le message').setRequired(true))),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      // Vérifications de permissions selon le type d'annonce
      if (subcommand === 'normal') {
        if (!hasPermission(interaction.member, 'MODERATOR')) {
          return await interaction.reply({ 
            embeds: [errorEmbed('Permission refusée', 'Vous devez être **Modérateur** ou supérieur.')], 
            ephemeral: true 
          });
        }
      } else if (subcommand === 'important' || subcommand === 'temporaire' || subcommand === 'suppression') {
        if (!hasPermission(interaction.member, 'ADMINISTRATOR')) {
          return await interaction.reply({ 
            embeds: [errorEmbed('Permission refusée', 'Vous devez être **Administrateur** ou supérieur.')], 
            ephemeral: true 
          });
        }
      } else if (subcommand === 'partenaire') {
        if (!hasPermission(interaction.member, 'PARTNER')) {
          return await interaction.reply({ 
            embeds: [errorEmbed('Permission refusée', 'Vous devez avoir le rôle **Partner** ou supérieur.')], 
            ephemeral: true 
          });
        }
      }

      // Gestion de la suppression
      if (subcommand === 'suppression') {
        return await handleDeletion(interaction);
      }

      const titre = interaction.options.getString('titre');
      const message = interaction.options.getString('message');
      const targetChannel = interaction.options.getChannel('salon') || interaction.guild.channels.cache.get(process.env.CHANNEL_ANNOUNCEMENTS);

      if (!targetChannel) {
        return await interaction.reply({ 
          embeds: [errorEmbed('Erreur', 'Aucun salon d\'annonces configuré.')], 
          ephemeral: true 
        });
      }

      // Créer l'embed selon le type
      let embed;
      let mentionText = '';
      let deleteAfter = null;

      switch (subcommand) {
        case 'important':
          embed = announcementEmbed(titre, message, true);
          mentionText = '@everyone';
          break;
        case 'partenaire':
          embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`💜 ${titre}`)
            .setDescription(message)
            .setAuthor({ name: 'Annonce Partenaire', iconURL: interaction.user.displayAvatarURL() })
            .setFooter({ text: `Partenaire: ${interaction.user.tag}` })
            .setTimestamp();
          break;
        case 'temporaire':
          const duree = interaction.options.getString('duree');
          embed = announcementEmbed(titre, message, false);
          embed.setFooter({ text: `⏰ Ce message sera supprimé dans ${duree}` });
          deleteAfter = parseDuration(duree);
          break;
        default:
          embed = announcementEmbed(titre, message, false);
      }

      // Bouton "J'ai lu" pour les annonces importantes
      let components = [];
      if (subcommand === 'important') {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('announce-read')
              .setLabel('✅ J\'ai lu')
              .setStyle(ButtonStyle.Success)
          );
        components.push(row);
      }

      // Envoyer l'annonce
      const sentMessage = await targetChannel.send({ 
        content: mentionText, 
        embeds: [embed],
        components 
      });

      // Programmation de la suppression automatique
      if (deleteAfter) {
        setTimeout(async () => {
          try {
            await sentMessage.delete();
            logger.info(`Annonce temporaire supprimée après ${deleteAfter}ms`);
          } catch (error) {
            logger.error('Erreur lors de la suppression automatique:', error);
          }
        }, deleteAfter);
      }

      logger.success(`Annonce créée par ${interaction.user.tag}: ${titre}`);

      await interaction.reply({ 
        embeds: [successEmbed(
          'Annonce publiée',
          `✅ Votre annonce a été publiée dans ${targetChannel}\n**Type:** ${subcommand}\n**Titre:** ${titre}`
        )], 
        ephemeral: true 
      });

    } catch (error) {
      logger.error('Erreur /announce:', error);
      await interaction.reply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de publier l\'annonce.')], 
        ephemeral: true 
      });
    }
  },
};

async function handleDeletion(interaction) {
  try {
    const messageId = interaction.options.getString('message_id');
    const channel = interaction.options.getChannel('salon');

    const message = await channel.messages.fetch(messageId);
    
    if (!message) {
      return await interaction.reply({ 
        embeds: [errorEmbed('Erreur', 'Message introuvable.')], 
        ephemeral: true 
      });
    }

    await message.delete();

    logger.info(`Annonce supprimée par ${interaction.user.tag}`);

    await interaction.reply({ 
      embeds: [successEmbed('Annonce supprimée', '✅ L\'annonce a été supprimée avec succès.')], 
      ephemeral: true 
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression:', error);
    await interaction.reply({ 
      embeds: [errorEmbed('Erreur', 'Impossible de supprimer l\'annonce.')], 
      ephemeral: true 
    });
  }
}

function parseDuration(duration) {
  const match = duration.match(/^(\d+)([hd])$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  
  return null;
}
