const { db, client } = require("../index.js");
const removeFromArray = require("../utils/removeFromArray.js");

const messages = {
  channel: "Vous devez fournir un salon de type texte.",
  role: "Vous devez fournir un role valide.",
  config: "Voici la configuration twitch :\n> Salon: %c\n> Role: %r\n> Message: `%m`",
  streamerList: "Voici la liste des streamers : ",
  noStreamer: "Il n'y a pas de streamer enregistré.",
  notFound: "L'utilisateur est introuvable.",
  removed: "L'utilisateur à été désenregistré.",
  added: "L'utilisateur %u à été enregistré.",
};

module.exports = {
  data: {
    name: "twitch",
    description: "Commandes twitch",
    defaultPermission: false,
    options: [
      {
        name: "add",
        description: "Ajouter un streamer",
        type: 1,
        options: [
          {
            name: "user",
            description: "Membre à ajouter",
            required: "true",
            type: "USER",
          },
        ],
      },
      {
        name: "remove",
        description: "Supprimer un streamer",
        type: 1,
        options: [
          {
            name: "user",
            description: "Membre à supprimer",
            required: "true",
            type: "USER",
          },
        ],
      },
      {
        name: "list",
        description: "Voir la liste des streamers",
        type: 1,
      },
      {
        name: "config",
        description: "Configurer l'annonce des streams",
        type: 1,
        options: [
          {
            name: "channel",
            description: "Salon où afficher les streamers",
            required: false,
            type: "CHANNEL",
          },
          {
            name: "role",
            description: 'Role "en live"',
            required: false,
            type: "ROLE",
          },
          {
            name: "message",
            description: "Message d'annonce d'un stream (%u sera remplacer par la mention du membre et %g par le jeu)",
            required: false,
            type: "STRING",
          },
        ],
      },
    ],
  },
  execute: async (interaction, args) => {
    if (args.get("subcommand") == "list") {
      const streamers = db.getData("/twitch/streamers");
      return interaction.editReply(
        streamers.lenght == 0
          ? messages.noStreamer
          : messages.streamerList + streamers.map((s) => `<@${s.id}>`).join(", ")
      );
    }

    if (args.get("subcommand") == "add") {
      const member = await client.guild.members.resolve(args.get("user"));
      if (!member) return interaction.editReply(messages.notFound);
      db.push("/twitch/streamers[]", { id: member.id });
      interaction.editReply(messages.added.replace("%u", `<@${member.id}>`));
    }

    if (args.get("subcommand") == "remove") {
      const result = await removeFromArray("/twitch/streamers", args.get("user"), "id");
      if (!result) return interaction.editReply(messages.notFound);
      interaction.editReply(messages.removed);
    }

    if (args.get("subcommand") == "config") {
      if (args.get("channel")) {
        const channel = await client.guild.channels.resolve(args.get("channel"));
        if (!channel || channel?.type != "GUILD_TEXT") return interaction.editReply(messages.channel);
        db.push("/twitch/config/channel", channel.id);
      }

      if (args.get("role")) {
        const role = await client.guild.roles.resolve(args.get("role"));
        if (!role) return interaction.editReply(messages.role);
        db.push(`/twitch/config/role`, role.id);
      }

      if (args.get("message")) {
        db.push(`/twitch/config/message`, args.get("message"));
      }

      const config = db.getData("/twitch/config");

      interaction.editReply(
        messages.config
          .replace("%c", config.channel ? `<#${config.channel}>` : "-")
          .replace("%r", config.role ? `<@&${config.role}>` : "-")
          .replace("%m", config.message ?? "-")
      );
    }

    return;
  },
};
