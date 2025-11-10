require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { initDatabase } = require('./utils/database');
const logger = require('./utils/logger');

// Créer le client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
});

// Collections pour stocker les commandes
client.commands = new Collection();

// Charger toutes les commandes
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.info(`✅ Commande chargée: ${command.data.name}`);
    } else {
      logger.warn(`⚠️ La commande ${file} n'a pas de propriété "data" ou "execute"`);
    }
  }
}

// Charger tous les événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  
  logger.info(`✅ Événement chargé: ${event.name}`);
}

// Initialiser la base de données
initDatabase();

// Gérer les erreurs non capturées
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught exception:', error);
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    logger.success('🚀 Bot Kasouta en cours de connexion...');
  })
  .catch(error => {
    logger.error('❌ Erreur de connexion:', error);
    process.exit(1);
  });

// Export du client pour les tests
module.exports = client;
