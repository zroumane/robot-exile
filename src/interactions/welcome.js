const { CommandInteraction } = require("discord.js");
const { db, client } = require("../index.js");

const messages = {
  noChannel: "Vous devez fournir un salon textuel.",
  edited: "Les données ont été modifié :",
};

module.exports = {
  data: {
    name: "welcome",
    description: "Configurer les messages de bienvenue et de départ.",
    defaultPermission: false,
    options: [
      {
        name: "channel",
        description: "Salon pour les messages de bienvenue et de départ",
        type: "CHANNEL",
        required: true,
      },
      {
        name: "hello",
        description: "Message de bienvenue (%u sera remplacer par la mention du membre)",
        type: "STRING",
        required: true,
      },
      {
        name: "goodbye",
        description: "Message de départ (%u sera remplacer par la mention du membre)",
        type: "STRING",
        required: true,
      },
    ],
  },
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    if (args.get("channel")) {
      const channel = await client.guild.channels.fetch(args.get("channel"));
      if (!channel || channel.type != "GUILD_TEXT") return interaction.editReply(messages.noChannel);
      db.push("/welcome/channel", args.get("channel"));
    }
    if (args.get("hello")) db.push("/welcome/add", args.get("hello"));
    if (args.get("goodbye")) db.push("/welcome/remove", args.get("goodbye"));
    const object = db.getData("/welcome");
    interaction.editReply(
      `${messages.edited}\n` +
        [
          `Salon : <#${object.channel}>`,
          `Message de bienvenue : \n> ${object.add}`,
          `Message de départ : \n> ${object.remove}`,
        ].join("\n")
    );
  },
};
