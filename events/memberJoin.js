const { getOrCreateUser } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      // Créer l'utilisateur dans la base de données
      getOrCreateUser(member.id, member.user.username, member.user.discriminator);
      
      logger.info(`👋 Nouveau membre: ${member.user.tag} (${member.id})`);

      // Donner automatiquement le rôle @Members
      const memberRole = member.guild.roles.cache.get(process.env.ROLE_MEMBER);
      if (memberRole) {
        await member.roles.add(memberRole);
        logger.success(`✅ Rôle @Members attribué à ${member.user.tag}`);
      }

      // Log dans le salon de logs serveur (si configuré)
      const logChannel = member.guild.channels.cache.get(process.env.CHANNEL_LOG_SERVEUR);
      if (logChannel) {
        const { infoEmbed } = require('../utils/embeds');
        const embed = infoEmbed('👋 Nouveau Membre', 
          `**${member.user.tag}** vient de rejoindre le serveur!\n\n` +
          `**ID:** ${member.id}\n` +
          `**Compte créé:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
          `**Membres totaux:** ${member.guild.memberCount}`
        );
        await logChannel.send({ embeds: [embed] });
      }

      // Message de bienvenue en MP (optionnel)
      try {
        await member.send({
          content: `👋 Bienvenue sur **${member.guild.name}** !\n\n` +
            `🎮 Serveur Minecraft: \`play.paladium-bedrock.fr\`\n` +
            `📋 Consulte les règles et n'hésite pas à poser tes questions!\n\n` +
            `Tu peux créer un ticket avec \`/ticket-setup\` pour toute demande.`
        });
      } catch (error) {
        // L'utilisateur a désactivé les MPs
        logger.debug(`Impossible d'envoyer un MP de bienvenue à ${member.user.tag}`);
      }

    } catch (error) {
      logger.error('Erreur lors de l\'arrivée d\'un membre:', error);
    }
  },
};
