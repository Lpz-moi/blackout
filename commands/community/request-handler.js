const { resolveCommunityRequest, db } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');

async function handleButton(interaction) {
  const buttonId = interaction.customId;

  if (buttonId.startsWith('request-contact-')) {
    await interaction.reply({
      content: '📧 Pour contacter le demandeur, envoyez-lui un message privé!',
      ephemeral: true
    });
  }

  if (buttonId.startsWith('request-resolve-')) {
    const requestNumber = parseInt(buttonId.split('-')[2]);
    
    // Récupérer la demande pour vérifier le créateur
    const request = db.prepare('SELECT user_id FROM community_requests WHERE request_number = ?').get(requestNumber);
    
    if (!request) {
      return interaction.reply({
        content: '❌ Cette demande n\'existe pas.',
        ephemeral: true
      });
    }

    // Vérifier si c'est le créateur ou un modérateur+
    const isCreator = interaction.user.id === request.user_id;
    const isModerator = hasPermission(interaction.member, 'MODERATOR');

    if (!isCreator && !isModerator) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Permission Refusée',
          'Seul le créateur de la demande ou un modérateur peut la marquer comme résolue.'
        )],
        ephemeral: true
      });
    }

    resolveCommunityRequest(requestNumber, interaction.user.id);

    const embed = successEmbed(
      'Demande Résolue',
      `Cette demande a été marquée comme résolue par ${interaction.user}`
    );

    await interaction.update({
      embeds: [embed],
      components: []
    });
  }
}

module.exports = { handleButton };
