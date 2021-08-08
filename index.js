const Discord = require("discord.js");
const { JsonDB } = require("node-json-db");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig.js");
require("dotenv").config();

var db = new JsonDB(new Config("database", true, false, "/"));

const client = new Discord.Client();
client.login(process.env.TOKEN);
client.on("ready", () => {
  console.log("Connected");
  client.user.setActivity(`.help`, { type: "LISTENING" });
});

const registerGuild = (guild) => {
  if (!db.exists(`/guilds/${guild.id}`)) {
    db.push(`/guilds/${guild.id}`, { voice: { init: [], created: [] } });
  }
};

const unRegisterChannel = async (channel) => {
  let guildInit = db.getData(`/guilds/${channel.guild.id}/voice/init`);
  let guildCreated = db.getData(`/guilds/${channel.guild.id}/voice/created`);
  db.push(
    `/guilds/${channel.guild.id}/voice/init`,
    guildInit.filter((c) => c.id != channel.id),
    true
  );
  db.push(
    `/guilds/${channel.guild.id}/voice/created`,
    guildCreated.filter((c) => c != channel.id),
    true
  );
};

const checkPermission = (guild, user) => {
  let member = guild.members.cache.get(user.id);
  return member.hasPermission("ADMINISTRATOR") || member.id == process.env.DEV_DISCORD_ID;
};

client.on("guildCreate", function (guild) {
  registerGuild(guild);
});

client.on("guildDelete", function (guild) {
  db.delete(`/guilds/${guild.id}`);
});

client.on("message", (msg) => {
  registerGuild(msg.guild);
  if (msg.content.startsWith(".voice")) {
    if (!checkPermission(msg.guild, msg.author)) return msg.reply("vous n'avez pas la permission");
    let args = msg.content.split(" ");
    if (args[1] != "add" && args[1] != "remove") return msg.reply("argument(s) invalide(s).");
    let channelId = args[2];
    if (!channelId) return msg.reply("vous devez fournir l'identifiant d'un channel.");
    let guildId = msg.guild.id;
    let channel = msg.guild.channels.cache.get(channelId);
    if (!channel || channel.type != "voice") return msg.reply("ce channel est invalide.");
    unRegisterChannel(channel).then(() => {
      if (args[1] == "add") {
        db.push(`/guilds/${guildId}/voice/init[]`, { id: channel.id, prefix: args[3] ?? null });
        return msg.reply("le channel a bien été ajouté.");
      }
      return msg.reply("le channel a bien été supprimé.");
    });
  }

  if (msg.content.startsWith(".help")) {
    msg.channel.send(`\`\`\`Commandes :
    .help
      : Afficher ce message
    .voice (add|remove) <Id Channel>
      : Ajouter ou supprimer un channel de création vocale\`\`\``);
  }
});

client.on("channelDelete", (channel) => unRegisterChannel(channel));

client.on("voiceStateUpdate", async (oldState, newState) => {
  let guild = oldState?.guild ?? newChannel?.guild;
  let member = await guild.members.fetch(oldState.id);
  let oldChannel = oldState.channel;
  let newChannel = newState.channel;
  if (newChannel && newChannel != oldChannel) {
    let initChannel = db.getData(`/guilds/${guild.id}/voice/init`).find((c) => c.id === newChannel.id);
    if (initChannel) {
      guild.channels
        .create(`${initChannel.prefix ?? ""} de ${member.nickname ?? member.user.username}`, {
          type: "voice",
          permissionOverwrites: [
            {
              id: member.id,
              allow: ["MANAGE_CHANNELS"],
            },
          ],
          parent: newChannel.parent,
        })
        .then((c) => {
          member.voice.setChannel(c);
          db.push(`/guilds/${guild.id}/voice/created[]`, c.id);
        });
    }
  }

  if (oldChannel) {
    let guildChannel = db.getData(`/guilds/${guild.id}/voice/created`);
    if (oldChannel.members.size == 0) {
      if (!guildChannel.includes(oldChannel.id)) return;
      oldChannel.delete();
      db.push(
        `/guilds/${guild.id}/voice/created`,
        guildChannel.filter((c) => c != oldChannel.id),
        true
      );
    }
  }
});
