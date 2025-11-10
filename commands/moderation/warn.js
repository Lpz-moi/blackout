const { SlashCommandBuilder } = require('discord.js');
const { addWarn, addModLog, getOrCreateUser } = require('../../utils/database');
const { moderationEmbed, warningEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre (3 avertissements = kick automatique)')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Le membre à avertir')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('raison')
        .setDescription('La raison de l\'avertissement')
        .setRequired(true)),
  
  permission: 'MODERATOR',

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison');
    const moderator = interaction.user;

    try {
      // Vérifier que l'utilisateur n'est pas le bot
      if (target.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Je ne peux pas m\'avertir moi-même!',
          ephemeral: true
        });
      }

      // Vérifier que l'utilisateur n'est pas le modérateur lui-même
      if (target.id === moderator.id) {
        return interaction.reply({
          content: '❌ Vous ne pouvez pas vous avertir vous-même!',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(target.id);

      // Vérifier les permissions
      const { canModerate } = require('../../utils/permissions');
      if (!canModerate(interaction.member, member)) {
        return interaction.reply({
          content: '❌ Vous ne pouvez pas avertir ce membre (permissions insuffisantes).',
          ephemeral: true
        });
      }

      // Créer l'utilisateur s'il n'existe pas
      getOrCreateUser(target.id, target.username, target.discriminator);

      // Ajouter l'avertissement
      const warnCount = addWarn(target.id, moderator.id, reason);
      addModLog('WARN', moderator.id, target.id, reason, `Avertissement ${warnCount}/${config.moderation.maxWarnsBeforeKick}`);

      // Créer l'embed
      const embed = moderationEmbed(
        '⚠️ Avertissement Donné',
        moderator,
        target,
        reason,
        [
          { name: '📊 Avertissements', value: `${warnCount}/${config.moderation.maxWarnsBeforeKick}`, inline: true }
        ]
      );

      // Changer la couleur selon le nombre d'avertissements
      if (warnCount >= 2) {
        embed.setColor(config.colors.error);
      } else {
        embed.setColor(config.colors.warning);
      }

      // Envoyer un MP à l'utilisateur
      try {
        const dmEmbed = warningEmbed(
          'Avertissement Reçu',
          `Vous avez reçu un avertissement sur **${interaction.guild.name}**\n\n` +
          `**Raison:** ${reason}\n` +
          `**Modérateur:** ${moderator.tag}\n` +
          `**Avertissements:** ${warnCount}/${config.moderation.maxWarnsBeforeKick}\n\n` +
          `${warnCount >= config.moderation.maxWarnsBeforeKick ? '⚠️ **Prochain avertissement = expulsion automatique**' : ''}`
        );
        await target.send({ embeds: [dmEmbed] });
      } catch (error) {
        logger.debug(`Impossible d'envoyer un MP à ${target.tag}`);
      }

      // Kick automatique si 3 avertissements
      if (warnCount >= config.moderation.maxWarnsBeforeKick) {
        try {
          await member.kick(`Kick automatique: ${config.moderation.maxWarnsBeforeKick} avertissements`);
          
          embed.addFields({
            name: '👢 Action Automatique',
            value: `${target} a été **expulsé automatiquement** (${config.moderation.maxWarnsBeforeKick} avertissements)`,
            inline: false
          });

          addModLog('KICK', interaction.client.user.id, target.id, `Kick automatique après ${config.moderation.maxWarnsBeforeKick} avertissements`);
          
          logger.success(`✅ ${target.tag} a été kick automatiquement (3 warns)`);
        } catch (error) {
          logger.error(`Erreur lors du kick automatique de ${target.tag}:`, error);
        }
      }

      // Répondre à l'interaction
      await interaction.reply({ embeds: [embed] });

      // Log dans le salon de modération
      const logChannel = interaction.guild.channels.cache.get(process.env.CHANNEL_LOG_MODERATION);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      logger.success(`✅ ${target.tag} a reçu un avertissement (${warnCount}/${config.moderation.maxWarnsBeforeKick}) par ${moderator.tag}`);

    } catch (error) {
      logger.error('Erreur lors de l\'avertissement:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'avertissement.',
        ephemeral: true
      });
    }
  },
};
