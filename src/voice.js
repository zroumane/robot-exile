import { client, db } from "./index.js";

const checkPermission = (guild, user) => {
  let member = guild.members.cache.get(user.id);
  return member.hasPermission("ADMINISTRATOR") || member.id == process.env.ZEPHYR_ID;
};

const unRegisterChannel = async (channel) => {
  let guildInit = db.getData(`/voice/init`);
  let guildCreated = db.getData(`/voice/created`);
  db.push(
    `/voice/init`,
    guildInit.filter((c) => c.id != channel.id),
    true
  );
  db.push(
    `/voice/created`,
    guildCreated.filter((c) => c != channel.id),
    true
  );
};

export const voice = (msg) => {
  if (!checkPermission(msg.guild, msg.author))
    return msg.reply("vous n'avez pas la permission d'utiliser cette commande.");
  let args = msg.content.split(" ");
  if (args[1] != "add" && args[1] != "remove") return msg.reply("argument(s) invalide(s).");
  let channelId = args[2];
  if (!channelId) return msg.reply("vous devez fournir l'identifiant d'un channel.");
  let channel = msg.guild.channels.cache.get(channelId);
  if (!channel || channel.type != "voice") return msg.reply("ce channel est invalide.");
  unRegisterChannel(channel).then(() => {
    if (args[1] == "add") {
      db.push(`/voice/init[]`, { id: channel.id, prefix: args[3] ?? null });
      return msg.reply("le channel a bien été ajouté.");
    }
    return msg.reply("le channel a bien été supprimé.");
  });
};

client.on("channelDelete", (channel) => unRegisterChannel(channel));

client.on("voiceStateUpdate", async (oldState, newState) => {
  let guild = oldState?.guild ?? newChannel?.guild;
  let member = await guild.members.fetch(oldState.id);
  let oldChannel = oldState.channel;
  let newChannel = newState.channel;
  if (newChannel && newChannel != oldChannel) {
    let initChannel = db.getData(`/voice/init`).find((c) => c.id === newChannel.id);
    if (initChannel) {
      guild.channels
        .create(`${initChannel.prefix ?? "Salon"} de ${member.nickname ?? member.user.username}`, {
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
          db.push(`/voice/created[]`, c.id);
        });
    }
  }

  if (oldChannel) {
    let guildChannel = db.getData(`/voice/created`);
    if (oldChannel.members.size == 0) {
      if (!guildChannel.includes(oldChannel.id)) return;
      oldChannel.delete();
      db.push(
        `/voice/created`,
        guildChannel.filter((c) => c != oldChannel.id),
        true
      );
    }
  }
});
