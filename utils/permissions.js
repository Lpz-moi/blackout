const config = require('../config.json');

// Hiérarchie des rôles (du plus élevé au plus bas)
const ROLE_HIERARCHY = {
  DEVELOPER: 7,
  ADMINISTRATOR: 6,
  MODERATOR: 5,
  SUPPORT: 4,
  PATRON: 3,
  PARTNER: 2,
  VOTER: 1,
  MEMBER: 0
};

/**
 * Vérifier si un membre a un rôle spécifique
 */
function hasRole(member, roleName) {
  const roleId = process.env[`ROLE_${roleName.toUpperCase()}`];
  if (!roleId) return false;
  return member.roles.cache.has(roleId);
}

/**
 * Obtenir le niveau de permission d'un membre
 */
function getPermissionLevel(member) {
  // Vérifier chaque rôle de haut en bas
  if (hasRole(member, 'DEVELOPER')) return ROLE_HIERARCHY.DEVELOPER;
  if (hasRole(member, 'ADMINISTRATOR')) return ROLE_HIERARCHY.ADMINISTRATOR;
  if (hasRole(member, 'MODERATOR')) return ROLE_HIERARCHY.MODERATOR;
  if (hasRole(member, 'SUPPORT')) return ROLE_HIERARCHY.SUPPORT;
  if (hasRole(member, 'PATRON')) return ROLE_HIERARCHY.PATRON;
  if (hasRole(member, 'PARTNER')) return ROLE_HIERARCHY.PARTNER;
  if (hasRole(member, 'VOTER')) return ROLE_HIERARCHY.VOTER;
  if (hasRole(member, 'MEMBER')) return ROLE_HIERARCHY.MEMBER;
  
  return -1; // Aucun rôle reconnu
}

/**
 * Vérifier si un membre a les permissions requises
 */
function hasPermission(member, requiredRole) {
  const memberLevel = getPermissionLevel(member);
  const requiredLevel = ROLE_HIERARCHY[requiredRole.toUpperCase()];
  
  return memberLevel >= requiredLevel;
}

/**
 * Vérifier si un membre peut modérer un autre membre
 */
function canModerate(moderator, target) {
  const moderatorLevel = getPermissionLevel(moderator);
  const targetLevel = getPermissionLevel(target);
  
  // Les developers peuvent tout faire
  if (moderatorLevel === ROLE_HIERARCHY.DEVELOPER) return true;
  
  // On ne peut pas modérer quelqu'un de niveau supérieur ou égal
  return moderatorLevel > targetLevel;
}

/**
 * Obtenir le nom du rôle le plus élevé d'un membre
 */
function getHighestRole(member) {
  const level = getPermissionLevel(member);
  
  for (const [roleName, roleLevel] of Object.entries(ROLE_HIERARCHY)) {
    if (roleLevel === level) {
      return roleName;
    }
  }
  
  return 'UNKNOWN';
}

/**
 * Vérifier si un membre est un staff (modération ou supérieur)
 */
function isStaff(member) {
  return hasPermission(member, 'SUPPORT');
}

/**
 * Vérifier si un membre est un modérateur
 */
function isModerator(member) {
  return hasPermission(member, 'MODERATOR');
}

/**
 * Vérifier si un membre est un administrateur
 */
function isAdministrator(member) {
  return hasPermission(member, 'ADMINISTRATOR');
}

/**
 * Vérifier si un membre est un développeur
 */
function isDeveloper(member) {
  return hasPermission(member, 'DEVELOPER');
}

/**
 * Obtenir un message d'erreur de permission personnalisé
 */
function getPermissionErrorMessage(requiredRole) {
  return `❌ Vous n'avez pas les permissions nécessaires pour cette commande.\n**Rôle requis:** ${requiredRole}`;
}

/**
 * Vérifier les permissions et répondre avec un message d'erreur si nécessaire
 */
async function checkPermission(interaction, requiredRole) {
  if (!hasPermission(interaction.member, requiredRole)) {
    await interaction.reply({
      content: getPermissionErrorMessage(requiredRole),
      ephemeral: true
    });
    return false;
  }
  return true;
}

module.exports = {
  ROLE_HIERARCHY,
  hasRole,
  getPermissionLevel,
  hasPermission,
  canModerate,
  getHighestRole,
  isStaff,
  isModerator,
  isAdministrator,
  isDeveloper,
  getPermissionErrorMessage,
  checkPermission
};
