import Discord from "discord.js";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig.js";
import dotenv from "dotenv";
dotenv.config();

var db = new JsonDB(new Config("database", true, false, "/"));

const client = new Discord.Client();
client.login(process.env.TOKEN);
client.on("ready", () => {
  console.log("Connected");
  client.user.setActivity(`.help`, { type: "LISTENING" });
});

const unRegisterChannel = async (channel) => {
  let guildInit = db.getData(`/guilds/${channel.guild.id}/voice/init`);
  let inInitIndex = guildInit.indexOf(channel.id);
  let guildChannel = db.getData(`/guilds/${channel.guild.id}/voice/channel`);
  let inChannelIndex = guildChannel.indexOf(channel.id);
  if (inInitIndex >= 0) {
    db.push(`/guilds/${channel.guild.id}/voice/init`, guildInit.splice(inInitIndex, 1), true);
  } else if (inChannelIndex >= 0) {
    db.push(`/guilds/${channel.guild.id}/voice/channel`, guildChannel.splice(inChannelIndex, 1), true);
  }
};

const checkPermission = (guild, user) => {
  let member = guild.members.cache.get(user.id);
  return member.hasPermission("ADMINISTRATOR") || member.id == process.env.DEV_DISCORD_ID;
};

client.on("guildCreate", function (guild) {
  db.push(`/guilds/${guild.id}`, { voice: { init: [], channel: [] } });
});

client.on("guildDelete", function (guild) {
  db.delete(`/guilds/${guild.id}`);
});

client.on("message", (msg) => {
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
        db.push(`/guilds/${guildId}/voice/init[]`, channel.id);
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
    if (db.getData(`/guilds/${guild.id}/voice/init`).includes(newChannel.id)) {
      guild.channels
        .create(`Channel de ${member.nickname ?? member.user.username}`, {
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
          db.push(`/guilds/${guild.id}/voice/channel[]`, c.id);
        });
    }
  }

  if (oldChannel) {
    let guildChannel = db.getData(`/guilds/${guild.id}/voice/channel`);
    let inChannelIndex = guildChannel.indexOf(oldChannel.id);
    if (inChannelIndex < 0) return;
    if (oldChannel.members.size == 0) {
      oldChannel.delete();
      guildChannel.splice(inChannelIndex, 1);
      db.push(`/guilds/${guild.id}/voice/channel`, guildChannel, true);
    }
  }
});
