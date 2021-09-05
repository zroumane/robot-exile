const { CommandInteraction } = require("discord.js");
const { db, client } = require("../index.js");
const removeFromArray = require("../utils/removeFromArray.js");

const messages = {
  provideChannel: "Vous devez fournir un salon vocal.",
  channelList: "Voici la liste des salons de création vocal :\n",
  noChannel: "Il n'y a pas de salon de création vocal.",
  added: "Le salon à été enregistré.",
  removed: "Le salon à été désenregistré.",
  notfound: "Ce salon n'est pas enregistré.",
};

const getData = () => {
  return {
    name: "voice",
    description: "Commande vocal",
    defaultPermission: false,
    options: [
      {
        name: "add",
        description: "Ajouter un salon de création vocal",
        type: 1,
        options: [
          {
            type: "CHANNEL",
            name: "channel",
            description: "Salon à ajouter",
            required: true,
          },
          {
            type: "STRING",
            name: "prefix",
            description: "Prefix des salons créés",
            required: false,
          },
        ],
      },
      {
        name: "remove",
        description: "Supprimer un salon de création vocal",
        type: 1,
        options: [
          {
            type: "CHANNEL",
            name: "channel",
            description: "Salon à supprimer",
            required: true,
          },
        ],
      },
      {
        name: "list",
        description: "Voir les salons de création vocal",
        type: 1,
      },
    ],
  };
};

module.exports = {
  data: getData(),
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    if (args.get("subcommand") == "list") {
      const channel = db.getData("/voice/init");
      return interaction.editReply(
        channel.length == 0
          ? messages.noChannel
          : messages.channelList + channel.map((c) => `<#${c.channel}> ${c.prefix ?? ""}`).join("\n")
      );
    }

    let channel = client.guild.channels.cache.get(args.get("channel"));
    if (!channel || channel.type != "GUILD_VOICE") return interaction.editReply(messages.provideChannel);

    if (args.get("subcommand") == "remove") {
      let result = await removeFromArray("/voice/init", channel.id, "channel");
      if (result) return interaction.editReply(messages.removed);
      else return interaction.editReply(messages.notfound);
    }

    if (args.get("subcommand") == "add") {
      await removeFromArray("/voice/init", channel.id, "channel");
      db.push(`/voice/init[]/`, { channel: channel.id, prefix: args.get("prefix") ?? null });
      return interaction.editReply(messages.added);
    }
  },
};
