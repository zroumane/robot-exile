const { CommandInteraction } = require("discord.js");
const { client, db } = require("../index.js");
const refreshGdoc = require("../utils/refreshGdoc.js");

const messages = {
  refresh: "Les données ont été rafraîchi.",
  error: "Cette configuration renvoie une erreur ou est incomplète.",
};

module.exports = {
  data: {
    name: "gdoc",
    description: "Rafraichir les données du bot sur le gdoc.",
    defaultPermission: false,
    options: [
      {
        name: "id",
        description: "Identifiant du Gdoc.",
        required: false,
        type: "STRING",
      },
      {
        name: "question",
        description: "Identifiant de la sheet question.",
        required: false,
        type: "STRING",
      },
      {
        name: "choice",
        description: "Identifiant de la sheet choix.",
        required: false,
        type: "STRING",
      },
    ],
  },
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    if (args.get("id")) db.push("/gdoc/docId", args.get("id"));
    if (args.get("question")) db.push("/gdoc/question", args.get("question"));
    if (args.get("choice")) db.push("/gdoc/choice", args.get("choice"));
    client.gdoc = await refreshGdoc();
    if (!client.gdoc) return interaction.editReply(messages.error);
    else return interaction.editReply(messages.refresh);
  },
};
