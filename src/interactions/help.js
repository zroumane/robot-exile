const { CommandInteraction } = require("discord.js");

const helpEmbed = {
  title: "Help !",
  description: `
    Voice les commandes du 🤖 Exilés. 
    \`<eventId>\` correspond à l'identifiant du message de l'event
    \`<channelId>\` correspondent à l'identifiant d'un salon vocal
    Pour accéder à ces identifiants vous devez activer les options développeurs
  `,
  fields: [
    {
      name: ".help",
      value: `
      Afficher ce message
      `,
    },
    {
      name: ".gdoc (Admin)",
      value: `
        Initialiser les bouttons permmettants de mettre à jour les données
        > \`.gdoc <gdocId> <sheetId>:<label> ...\`
      `,
    },
    {
      name: ".audio (Admin)",
      value: `
        Voir la liste des audio
        > \`.audio\`

        Jouer un audio enregistré
        > \`.audio <tag>\`
        Attachez un fichier audio pour
        l'enregistrer avec le tag inscrit

        Supprimer un audio
        > \`.audio -<tag>\`
      `,
    },
    {
      name: ".voice (Admin)",
      value: `
        Création d'un salon de création de salon
        > \`.voice add <channelId> <prefix>\`
        Le prefix non obligatoire sera situé dans le nom des salons créés
        
        Suppression d'un salon de création de salon
        > \`.voice remove <channelId>\`
      `,
    },
    {
      name: ".event (Admin)",
      value: `
      Créer un event
      > \`.event add "Guerre" 25/12 21:30 "tank;DPS;heal" 🛡️ ⚔️ ❤️\`

      Mettre à jour un event
      > \`.event update <eventId> "Nouveau titre"\`
      > \`.event update <eventId> 23/06 19:00\`

      Supprimer un event
      > \`.event remove <eventId>\`

      Mentionner les membres participants à un event
      > \`.event call <eventId>\`
      > \`.event call <eventId> ✅\` 
      `,
    },
    {
      name: ".twitter (Admin)",
      value: `
        Voir la liste des comptes twitter en écoute
        > \`.twitter\`

        Commencé à écouté un compte twitter
        > \`.twitter <username>\`
        Les tweets du compte apparaîtrons dans le salon où la commande est entrée. 

        Supprimer un compte twitter
        > \`.twitter -<username>\`
      `,
    },
    {
      name: "Crédit",
      value: `Bot développé par <@${process.env.ZEPHYR_ID}> pour les Exilés !`,
    },
  ],
};

module.exports = {
  data: {
    name: "help",
    description: "Voir toutes les commandes",
  },
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    interaction.channel.send({ embeds: [helpEmbed] });
  },
};
