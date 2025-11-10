require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const commands = [];
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

// Charger toutes les commandes
for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
      logger.info(`✅ Commande ajoutée: ${command.data.name}`);
    }
  }
}

// Instance REST
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Déployer les commandes
(async () => {
  try {
    logger.info(`🔄 Déploiement de ${commands.length} commandes slash...`);

    // Pour un serveur spécifique (plus rapide, recommandé pour le développement)
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID || 'YOUR_CLIENT_ID', process.env.GUILD_ID),
      { body: commands },
    );

    logger.success(`✅ ${data.length} commandes déployées avec succès!`);
  } catch (error) {
    logger.error('❌ Erreur lors du déploiement des commandes:', error);
  }
})();
