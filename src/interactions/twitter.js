const { CommandInteraction } = require("discord.js");
const { client, T, db } = require("../index.js");
const refreshCommand = require("../utils/refreshCommand.js");
const removeFromArray = require("../utils/removeFromArray.js");

const messages = {
  noAcount: "Il n'y a pas de compte enregistré.",
  added: "Le compte a été enregistré.",
  removed: "Le compte a été désenregistré.",
  nofound: "Le compte n'hésite pas.",
  accountListe: "Voici la liste des comptes enregistrées :\n",
  noChannel: "Vous devez fournir un salon textuel",
};

let stream = null;

const sendTweet = (tweet) => {
  if (tweet.in_reply_to_status_id) return;
  if (tweet.retweeted_status) return;
  let user = db.getData("/twitter").find((u) => u.id == tweet?.user?.id_str);
  if (user) {
    let channel = client.guild.channels.cache.get(user.channel);
    if (channel) channel.send(`https://twitter.com/${user.name}/status/${tweet.id_str}`);
  }
};

const reloadStream = async () => {
  var twitter = db.getData("/twitter");
  if (twitter.length == 0) return;
  if (stream) stream.stop();
  stream = T.stream("statuses/filter", { follow: twitter.map((u) => u.id) });
  stream.on("tweet", sendTweet);
  stream.on("error", () => {
    new Promise((resolve) => setTimeout(resolve, 5000));
    stream.stop();
    reloadStream;
  });
};

reloadStream();

const getData = () => {
  return {
    name: "twitter",
    description: "Command twitter",
    defaultPermission: false,
    options: [
      {
        name: "add",
        description: "Ajouter un compte",
        type: 1,
        options: [
          {
            type: "STRING",
            name: "compte",
            description: "@ du compte à ajouter",
            required: true,
          },
          {
            type: "CHANNEL",
            name: "channel",
            description: "Salon ou les tweets apparaîtrons.",
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "Supprimer un compte",
        type: 1,
        options: [
          {
            type: "STRING",
            name: "compte",
            description: "@ du compte à supprimer",
            required: true,
            choices: db.getData("/twitter").map((u) => {
              return {
                name: "@" + u.name,
                value: u.name,
              };
            }),
          },
        ],
      },
      {
        name: "list",
        description: "Voir la liste des compte",
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
      const twitter = db.getData("/twitter");
      let str = twitter.map((u) => `\`@${u.name}\` dans le salon <#${u.channel}>`);
      return interaction.editReply(str.length == 0 ? messages.noAcount : messages.accountListe + str.join("\n"));
    }

    const name = args.get("compte");

    if (args.get("subcommand") == "remove") {
      await removeFromArray("/twitter", name, "name");
      interaction.editReply(messages.removed);
    }

    if (args.get("subcommand") == "add") {
      try {
        const channel = client.guild.channels.cache.get(args.get("channel"));
        if (!channel.type == "GUILD_TEXT") return interaction.editReply(messages.noChannel);
        await removeFromArray("/twitter", name, "name");
        const user = (await T.get("users/lookup", { screen_name: name })).data[0];
        const obj = { channel: channel.id, id: user["id_str"], name: user.screen_name };
        db.push(`/twitter[]`, obj);
        interaction.editReply(messages.added);
      } catch (e) {
        interaction.editReply(messages.nofound);
      }
      reloadStream();
      return refreshCommand(interaction.command, getData());
    }
  },
};
