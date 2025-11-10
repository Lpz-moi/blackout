const { ActivityType } = require('discord.js');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.success(`✅ ${client.user.tag} est maintenant en ligne!`);
    logger.info(`📊 Connecté sur ${client.guilds.cache.size} serveur(s)`);
    logger.info(`👥 ${client.users.cache.size} utilisateurs visibles`);
    
    // Définir le statut du bot
    client.user.setActivity(config.bot.status, { 
      type: ActivityType.Watching 
    });
    
    logger.success(`🎮 Statut défini: ${config.bot.status}`);
    
    // Vérifier les mutes expirés toutes les minutes
    setInterval(async () => {
      await checkExpiredMutes(client);
    }, 60000); // 60 secondes
  },
};

async function checkExpiredMutes(client) {
  const { db } = require('../utils/database');
  const logger = require('../utils/logger');
  
  try {
    // Récupérer tous les mutes actifs qui ont expiré
    const expiredMutes = db.prepare(`
      SELECT * FROM mutes 
      WHERE active = 1 AND datetime(unmute_at) <= datetime('now')
    `).all();
    
    for (const mute of expiredMutes) {
      try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) continue;
        
        const member = await guild.members.fetch(mute.user_id).catch(() => null);
        if (!member) continue;
        
        const memberRole = guild.roles.cache.get(process.env.ROLE_MEMBER);
        if (memberRole && !member.roles.cache.has(memberRole.id)) {
          await member.roles.add(memberRole);
          logger.info(`✅ Unmute automatique: ${member.user.tag}`);
        }
        
        // Marquer le mute comme inactif
        db.prepare('UPDATE mutes SET active = 0 WHERE id = ?').run(mute.id);
        
        // Notifier l'utilisateur
        await member.send({
          content: `✅ Votre mute sur **${guild.name}** a expiré. Vous pouvez à nouveau parler dans les salons.`
        }).catch(() => {});
        
      } catch (error) {
        logger.error(`Erreur lors du unmute automatique de ${mute.user_id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification des mutes expirés:', error);
  }
}
