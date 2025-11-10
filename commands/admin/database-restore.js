const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('database-restore')
    .setDescription('📥 Restaurer une sauvegarde de la base de données')
    .addAttachmentOption(option =>
      option.setName('fichier')
        .setDescription('Fichier de sauvegarde (.db)')
        .setRequired(true))
    .setDefaultMemberPermissions(0),
  
  permission: 'DEVELOPER',

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const attachment = interaction.options.getAttachment('fichier');

      // Vérifier l'extension
      if (!attachment.name.endsWith('.db')) {
        return await interaction.editReply({ 
          embeds: [errorEmbed('Erreur', 'Le fichier doit être une base de données (.db).')],
        });
      }

      const dbPath = path.join(__dirname, '../../kasouta.db');
      const backupPath = path.join(__dirname, '../../backups/restore-temp.db');

      // Télécharger le fichier
      const response = await fetch(attachment.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(backupPath, Buffer.from(buffer));

      // Créer une sauvegarde de sécurité
      const safetyBackup = path.join(__dirname, '../../backups/safety-backup-before-restore.db');
      fs.copyFileSync(dbPath, safetyBackup);

      // Restaurer la base de données
      fs.copyFileSync(backupPath, dbPath);
      fs.unlinkSync(backupPath);

      logger.warn(`Base de données restaurée par ${interaction.user.tag}`);

      await interaction.editReply({ 
        embeds: [warningEmbed(
          'Base de données restaurée',
          `✅ La base de données a été restaurée avec succès.\n` +
          `⚠️ Une sauvegarde de sécurité a été créée: \`safety-backup-before-restore.db\`\n\n` +
          `🔄 Redémarrage du bot recommandé.`
        )],
      });

    } catch (error) {
      logger.error('Erreur /database-restore:', error);
      await interaction.editReply({ 
        embeds: [errorEmbed('Erreur', 'Impossible de restaurer la base de données.')],
      });
    }
  },
};
