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

const listenForever = async (getStream, cb, atempt) => {
  try {
    for await (const { data } of getStream()) cb(data);
  } catch (error) {
    client.ownerChannel.send("Error" + error);
    return setTimeout(() => {
      listenForever(getStream, cb, atempt + 1);
    }, 2 ** atempt * 1000);
  }
};

const reloadStream = async () => {
  var twitter = db.getData("/twitter");
  if (twitter.length == 0) return;
  if (client.stream) client.stream.close();

  const res = await T.get("tweets/search/stream/rules");
  if (res.data && res.data.length > 0) {
    await T.post("tweets/search/stream/rules", {
      delete: { ids: res.data.map((r) => r.id) },
    });
  }
  await T.post("tweets/search/stream/rules", {
    add: twitter.map((u) => {
      return { value: `from:${u.name} -is:retweet -is:reply`, tag: `from ${u.name}` };
    }),
  });

  listenForever(
    () => {
      client.stream = T.stream("tweets/search/stream", {
        "tweet.fields": ["author_id"],
      });
      return client.stream;
    },
    (data) => {
      let user = twitter.find((u) => u.id == data.author_id);
      if (user) {
        let channel = client.guild.channels.cache.get(user.channel);
        if (channel) channel.send(`https://twitter.com/${user.name}/status/${data.id}`);
      }
    },
    1
  );
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
        const user = (await T.get("users/by/username/" + name)).data;
        const obj = { channel: channel.id, id: user.id, name: user.username };
        db.push(`/twitter[]`, obj);
        reloadStream();
        interaction.editReply(messages.added);
      } catch (e) {
        interaction.editReply(messages.nofound);
      }
      return refreshCommand(interaction.command, getData());
    }
  },
};
