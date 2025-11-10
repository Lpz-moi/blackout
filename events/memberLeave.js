const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      logger.info(`👋 Membre parti: ${member.user.tag} (${member.id})`);

      // Log dans le salon de logs serveur (si configuré)
      const logChannel = member.guild.channels.cache.get(process.env.CHANNEL_LOG_SERVEUR);
      if (logChannel) {
        const { warningEmbed } = require('../utils/embeds');
        const embed = warningEmbed('👋 Membre Parti', 
          `**${member.user.tag}** a quitté le serveur.\n\n` +
          `**ID:** ${member.id}\n` +
          `**Arrivé le:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` +
          `**Membres restants:** ${member.guild.memberCount}`
        );
        await logChannel.send({ embeds: [embed] });
      }

    } catch (error) {
      logger.error('Erreur lors du départ d\'un membre:', error);
    }
  },
};
