const fs = require('fs');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
  }

  _write(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Écrire dans le fichier
    const fileMessage = data ? `${logMessage} ${JSON.stringify(data)}\n` : `${logMessage}\n`;
    fs.appendFileSync(this.logFile, fileMessage);
  }

  _console(color, prefix, message, data = null) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    console.log(`${color}[${timestamp}] ${prefix}${colors.reset} ${message}`);
    if (data) {
      console.log(data);
    }
  }

  info(message, data = null) {
    this._write('INFO', message, data);
    this._console(colors.blue, 'ℹ️ INFO', message, data);
  }

  success(message, data = null) {
    this._write('SUCCESS', message, data);
    this._console(colors.green, '✅ SUCCESS', message, data);
  }

  warn(message, data = null) {
    this._write('WARN', message, data);
    this._console(colors.yellow, '⚠️ WARN', message, data);
  }

  error(message, data = null) {
    this._write('ERROR', message, data);
    this._console(colors.red, '❌ ERROR', message, data);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this._write('DEBUG', message, data);
      this._console(colors.magenta, '🐛 DEBUG', message, data);
    }
  }

  command(commandName, user, guild) {
    const message = `Commande /${commandName} utilisée par ${user.tag} dans ${guild.name}`;
    this._write('COMMAND', message);
    this._console(colors.cyan, '⚡ CMD', message);
  }
}

module.exports = new Logger();
