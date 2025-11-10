const logger = require('./logger');

/**
 * Récupérer le statut d'un serveur Minecraft
 * Utilise l'API mcsrvstat.us pour obtenir les informations
 */
async function getServerStatus(serverIP = 'play.paladium-bedrock.fr') {
  try {
    const response = await fetch(`https://api.mcsrvstat.us/bedrock/3/${serverIP}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    return {
      online: data.online || false,
      ip: data.hostname || serverIP,
      port: data.port || 19132,
      version: data.version || 'Bedrock Edition',
      motd: data.motd?.clean ? data.motd.clean.join(' ') : 'Serveur Minecraft',
      players: {
        online: data.players?.online || 0,
        max: data.players?.max || 0,
        list: data.players?.list || []
      },
      ping: data.debug?.ping || null,
      software: data.software || 'Unknown',
      plugins: data.plugins || []
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut Minecraft:', error);
    return {
      online: false,
      ip: serverIP,
      port: 19132,
      version: 'N/A',
      motd: 'Impossible de récupérer le statut',
      players: {
        online: 0,
        max: 0,
        list: []
      },
      ping: null,
      software: 'Unknown',
      plugins: []
    };
  }
}

/**
 * Récupérer l'historique des joueurs (simulé pour l'instant)
 */
async function getPlayerHistory(serverIP = 'play.paladium-bedrock.fr') {
  try {
    // Pour l'instant, retourner les données actuelles
    const status = await getServerStatus(serverIP);
    
    return {
      current: status.players.online,
      max: status.players.max,
      history: [] // À implémenter avec une vraie base de données
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique:', error);
    return {
      current: 0,
      max: 0,
      history: []
    };
  }
}

/**
 * Vérifier si un serveur est en ligne
 */
async function isServerOnline(serverIP = 'play.paladium-bedrock.fr') {
  const status = await getServerStatus(serverIP);
  return status.online;
}

module.exports = {
  getServerStatus,
  getPlayerHistory,
  isServerOnline
};
