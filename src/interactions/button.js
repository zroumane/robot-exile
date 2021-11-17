const { CommandInteraction, MessageActionRow, MessageButton } = require("discord.js");
const { client } = require("../index.js");

const messages = {
  noMessage: "Ce message du bot n'existe pas dans ce salon.",
  noGdoc: "La configuration actuelle du gdoc renvoie une erreur (`/gdoc`)",
  invalidUrl: "L'url est invalide",
  process: "La modification a été apporté.",
  invalidChannel: "Le salon spécifié n'est pas de type textuel.",
};

const addButton = async (msg, type, args, id) => {
  let component = new MessageActionRow().addComponents(
    new MessageButton().setLabel(args.get("label")).setStyle(args.get("color") ?? "PRIMARY")
  );
  if (type == "url") component.components[0].setURL(args.get("url")).setStyle("LINK");
  else component.components[0].setCustomId(type + ":" + id);
  await msg.edit({ components: [...msg.components, component] });
};

const pattern = RegExp(
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/
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
      {
        name: "suggestion",
        description: "Ajouter un bouton suggestion.",
        type: 1,
        options: [
          {
            name: "channel",
            description: "Salon ou sont envoyé les suggestions.",
            required: true,
            type: "CHANNEL",
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
    let isNew = false;

    if (args.get("message")) {
      msg = await interaction.channel.messages.fetch(args.get("message"));
      if (!msg || msg.author != client.user) return msg.reply(messages.noMessage);
      if (args.get("content")) await msg.edit(args.get("content"));
    }

    if (!msg) {
      msg = await interaction.channel.send(args.get("content") ?? "...");
      isNew = true;
    }

    if (args.get("subcommand") == "link") {
      if (!pattern.test(args.get("url"))) {
        if (isNew) msg.delete();
        return interaction.editReply(messages.invalidUrl);
      }
      addButton(msg, "url", args);
    }

    if (args.get("subcommand") == "gdoc") {
      if (!client.gdoc) {
        if (isNew) msg.delete();
        return interaction.editReply(messages.noGdoc);
      }
      addButton(msg, "sheet", args, args.get("sheet"));
    }

    if (args.get("subcommand") == "role") addButton(msg, "role", args, args.get("role"));

    if (args.get("subcommand") == "suggestion") {
      let channel = interaction.options.getChannel("channel");
      if (channel.type != "GUILD_TEXT") return interaction.editReply(messages.invalidChannel);
      addButton(msg, "suggestion", args, args.get("channel"));
    }

    return interaction.editReply(messages.process);
  },
};
