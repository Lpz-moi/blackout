const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('database-backup')
    .setDescription('💾 Créer une sauvegarde de la base de données')
    .setDefaultMemberPermissions(0),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const dbPath = path.join(__dirname, '../../kasouta.db');
      const backupDir = path.join(__dirname, '../../backups');
      
      // Créer le dossier backups s'il n'existe pas
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupPath = path.join(backupDir, `kasouta-backup-${timestamp}.db`);

      // Copier la base de données
      fs.copyFileSync(dbPath, backupPath);

      // Créer l'attachment
      const attachment = new AttachmentBuilder(backupPath, { 
        name: `kasouta-backup-${timestamp}.db` 
      });

      logger.success(`Sauvegarde créée: ${backupPath}`);

      await interaction.editReply({ 
        embeds: [successEmbed(
          'Sauvegarde créée',
          `✅ Base de données sauvegardée avec succès.\n**Fichier:** \`kasouta-backup-${timestamp}.db\`\n**Taille:** ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`
        )],
        files: [attachment]
      });

    } catch (error) {
      logger.error('Erreur /database-backup:', error);
      await interaction.editReply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de créer la sauvegarde de la base de données.')],
      });
    }
  },
};
