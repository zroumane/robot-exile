const { VoiceState } = require("discord.js");
const { db } = require("../index.js");
const removeFromArray = require("../utils/removeFromArray.js");

/**
 *
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 */
module.exports = async (oldState, newState) => {
  let guild = oldState?.guild ?? newChannel?.guild;
  let member = await guild.members.fetch(oldState.id);
  let oldChannel = oldState.channel;
  let newChannel = newState.channel;
  if (newChannel && newChannel != oldChannel) {
    let index = db.getIndex(`/voice/init`, newChannel.id, "channel");
    if (index != "-1") {
      let initChannel = db.getData(`/voice/init[${index}]`);
      guild.channels
        .create(`${initChannel.prefix ?? "Salon"} de ${member.nickname ?? member.user.username}`, {
          type: "GUILD_VOICE",
          parent: newChannel.parent,
        })
        .then(async (c) => {
          c.permissionOverwrites.create(member, { MANAGE_CHANNELS: true });
          member.voice.setChannel(c);
          db.push(`/voice/created[]`, { channel: c.id });
        });
    }
  }
  if (oldChannel && oldChannel.members.size == 0) {
    let result = await removeFromArray("/voice/created", oldChannel.id, "channel");
    if (result) {
      oldChannel.delete().catch((e) => {});
    }
  }
};
