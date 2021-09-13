const { CommandInteraction, MessageActionRow, MessageButton } = require("discord.js");
const { client } = require("../index.js");

const messages = {
  noMessage: "Ce message du bot n'existe pas dans ce salon.",
  noGdoc: "La configuration actuelle du gdoc renvoie une erreur (`/gdoc`)",
  invalidUrl: "L'url est invalide",
};

const pattern = RegExp(
  "(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+@]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$",
  "i"
);

const getOptions = (link) => {
  let options = [
    {
      name: "label",
      description: "Label du bouton",
      required: true,
      type: "STRING",
    },
    {
      name: "message",
      description: "Identifiant du bot auquel attaché le bouton gdoc",
      required: false,
      type: "STRING",
    },
    {
      name: "content",
      description: "Contenu du message (pas nécéssaire si message spécifié)",
      required: false,
      type: "STRING",
    },
  ];
  if (!link)
    options.push({
      name: "color",
      description: "Couleur du bouton",
      required: false,
      type: "STRING",
      choices: ["PRIMARY", "SECONDARY", "SUCCESS", "DANGER"].map((c) => {
        return {
          name: c.toLowerCase(),
          value: c,
        };
      }),
    });
  return options;
};

module.exports = {
  data: {
    name: "button",
    description: "Commande Button",
    defaultPermission: false,
    options: [
      {
        name: "link",
        description: "Ajouter un bouton lien.",
        type: 1,
        options: [
          {
            name: "url",
            description: "Url du bouton lien",
            required: true,
            type: "STRING",
          },
          ...getOptions(true),
        ],
      },
      {
        name: "gdoc",
        description: "Ajouter un bouton gdoc.",
        type: 1,
        options: [
          {
            name: "sheet",
            description: "Identifiant de la sheet où les données seront ajoutées.",
            required: true,
            type: "STRING",
          },
          ...getOptions(),
        ],
      },
      {
        name: "role",
        description: "Ajouter un bouton role.",
        type: 1,
        options: [
          {
            name: "role",
            description: "Role à attribué.",
            required: true,
            type: "ROLE",
          },
          ...getOptions(),
        ],
      },
    ],
  },
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    let msg;

    if (args.get("message")) {
      msg = await interaction.channel.messages.fetch(args.get("message"));
      if (!msg || msg.author != client.user) return msg.reply(messages.noMessage);
      if (args.get("content")) await msg.edit(args.get("content"));
    }

    if (!msg) msg = await interaction.channel.send(args.get("content") ?? "-");

    if (args.get("subcommand") == "link") {
      if (!pattern.test(args.get("url"))) {
        msg.delete();
        return interaction.editReply(messages.invalidUrl);
      }

      let component = new MessageActionRow().addComponents(
        new MessageButton().setURL(args.get("url")).setLabel(args.get("label")).setStyle("LINK")
      );
      await msg.edit({ components: [...msg.components, component] });
    }

    if (args.get("subcommand") == "gdoc") {
      if (!client.gdoc) {
        msg.delete();
        return interaction.editReply(messages.noGdoc);
      }
      let component = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("sheet:" + args.get("sheet"))
          .setLabel(args.get("label"))
          .setStyle(args.get("color") ?? "PRIMARY")
      );
      await msg.edit({ components: [...msg.components, component] });
    }

    if (args.get("subcommand") == "role") {
      let component = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("role:" + args.get("role"))
          .setLabel(args.get("label"))
          .setStyle(args.get("color") ?? "PRIMARY")
      );
      await msg.edit({ components: [...msg.components, component] });
    }
  },
};
