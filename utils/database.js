const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Créer le dossier database s'il n'existe pas
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'kasouta.db');
const db = new Database(dbPath);

// Activer les foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
  logger.info('🔄 Initialisation de la base de données...');

  // Table des utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      discriminator TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      warnings INTEGER DEFAULT 0
    )
  `);

  // Table des avertissements (warns)
  db.exec(`
    CREATE TABLE IF NOT EXISTS warns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Table des mutes
  db.exec(`
    CREATE TABLE IF NOT EXISTS mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      duration INTEGER NOT NULL,
      muted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      unmute_at DATETIME NOT NULL,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Table des bans
  db.exec(`
    CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      banned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      unbanned_at DATETIME,
      active INTEGER DEFAULT 1
    )
  `);

  // Table des kicks
  db.exec(`
    CREATE TABLE IF NOT EXISTS kicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      kicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des tickets
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number INTEGER UNIQUE NOT NULL,
      channel_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      closed_by TEXT,
      reason TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Table des demandes communautaires (/ask)
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number INTEGER UNIQUE NOT NULL,
      message_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolved_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Table des logs de modération
  db.exec(`
    CREATE TABLE IF NOT EXISTS mod_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      reason TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.success('✅ Base de données initialisée avec succès');
}

// ========== FONCTIONS UTILITAIRES ==========

// Utilisateurs
function getOrCreateUser(userId, username, discriminator) {
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  
  if (!user) {
    db.prepare('INSERT INTO users (user_id, username, discriminator) VALUES (?, ?, ?)')
      .run(userId, username, discriminator || '0000');
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  
  return user;
}

// Warns
function addWarn(userId, moderatorId, reason) {
  db.prepare('INSERT INTO warns (user_id, moderator_id, reason) VALUES (?, ?, ?)')
    .run(userId, moderatorId, reason);
  
  const warnCount = db.prepare('SELECT COUNT(*) as count FROM warns WHERE user_id = ?')
    .get(userId).count;
  
  db.prepare('UPDATE users SET warnings = ? WHERE user_id = ?')
    .run(warnCount, userId);
  
  return warnCount;
}

function removeWarn(userId) {
  const result = db.prepare('DELETE FROM warns WHERE user_id = ? AND id = (SELECT MAX(id) FROM warns WHERE user_id = ?)')
    .run(userId, userId);
  
  if (result.changes > 0) {
    const warnCount = db.prepare('SELECT COUNT(*) as count FROM warns WHERE user_id = ?')
      .get(userId).count;
    
    db.prepare('UPDATE users SET warnings = ? WHERE user_id = ?')
      .run(warnCount, userId);
    
    return true;
  }
  
  return false;
}

function getWarns(userId) {
  return db.prepare('SELECT * FROM warns WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

// Mutes
function addMute(userId, moderatorId, reason, duration, unmuteAt) {
  db.prepare('INSERT INTO mutes (user_id, moderator_id, reason, duration, unmute_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, moderatorId, reason, duration, unmuteAt);
}

function removeMute(userId) {
  db.prepare('UPDATE mutes SET active = 0 WHERE user_id = ? AND active = 1')
    .run(userId);
}

function getActiveMute(userId) {
  return db.prepare('SELECT * FROM mutes WHERE user_id = ? AND active = 1 ORDER BY muted_at DESC LIMIT 1')
    .get(userId);
}

// Bans
function addBan(userId, moderatorId, reason) {
  db.prepare('INSERT INTO bans (user_id, moderator_id, reason) VALUES (?, ?, ?)')
    .run(userId, moderatorId, reason);
}

function removeBan(userId) {
  db.prepare('UPDATE bans SET active = 0, unbanned_at = CURRENT_TIMESTAMP WHERE user_id = ? AND active = 1')
    .run(userId);
}

// Kicks
function addKick(userId, moderatorId, reason) {
  db.prepare('INSERT INTO kicks (user_id, moderator_id, reason) VALUES (?, ?, ?)')
    .run(userId, moderatorId, reason);
}

// Tickets
function createTicket(ticketNumber, channelId, userId, type) {
  db.prepare('INSERT INTO tickets (ticket_number, channel_id, user_id, type) VALUES (?, ?, ?, ?)')
    .run(ticketNumber, channelId, userId, type);
}

function closeTicket(channelId, closedBy, reason) {
  db.prepare('UPDATE tickets SET status = ?, closed_at = CURRENT_TIMESTAMP, closed_by = ?, reason = ? WHERE channel_id = ?')
    .run('closed', closedBy, reason, channelId);
}

function getTicket(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

function getNextTicketNumber() {
  const result = db.prepare('SELECT MAX(ticket_number) as max FROM tickets').get();
  return (result.max || 0) + 1;
}

// Demandes communautaires
function createCommunityRequest(requestNumber, messageId, userId, title, description) {
  db.prepare('INSERT INTO community_requests (request_number, message_id, user_id, title, description) VALUES (?, ?, ?, ?, ?)')
    .run(requestNumber, messageId, userId, title, description);
}

function resolveCommunityRequest(requestNumber, resolvedBy) {
  db.prepare('UPDATE community_requests SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE request_number = ?')
    .run('resolved', resolvedBy, requestNumber);
}

function getNextRequestNumber() {
  const result = db.prepare('SELECT MAX(request_number) as max FROM community_requests').get();
  return (result.max || 0) + 1;
}

// Logs de modération
function addModLog(actionType, moderatorId, targetUserId, reason, details) {
  db.prepare('INSERT INTO mod_logs (action_type, moderator_id, target_user_id, reason, details) VALUES (?, ?, ?, ?, ?)')
    .run(actionType, moderatorId, targetUserId, reason, details || null);
}

function getModLogs(userId, limit = 50) {
  return db.prepare('SELECT * FROM mod_logs WHERE target_user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit);
}

// Statistiques
function getStats() {
  const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
  const openTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('open').count;
  const totalRequests = db.prepare('SELECT COUNT(*) as count FROM community_requests').get().count;
  const resolvedRequests = db.prepare('SELECT COUNT(*) as count FROM community_requests WHERE status = ?').get('resolved').count;
  const totalWarns = db.prepare('SELECT COUNT(*) as count FROM warns').get().count;
  const totalBans = db.prepare('SELECT COUNT(*) as count FROM bans WHERE active = 1').get().count;
  
  return {
    totalTickets,
    openTickets,
    totalRequests,
    resolvedRequests,
    totalWarns,
    totalBans
  };
}

module.exports = {
  db,
  initDatabase,
  getOrCreateUser,
  addWarn,
  removeWarn,
  getWarns,
  addMute,
  removeMute,
  getActiveMute,
  addBan,
  removeBan,
  addKick,
  createTicket,
  closeTicket,
  getTicket,
  getNextTicketNumber,
  createCommunityRequest,
  resolveCommunityRequest,
  getNextRequestNumber,
  addModLog,
  getModLogs,
  getStats
};
