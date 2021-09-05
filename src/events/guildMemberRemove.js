const { client, db } = require("../index.js");

module.exports = {
  once: false,
  execute: async (member) => {
    if (!db.exists("/welcome/channel")) return;
    const channel = client.guild.channels.cache.get(db.getData("/welcome/channel"));
    if (!channel) return;

    if (db.exists("/welcome/remove")) channel.send(db.getData("/welcome/remove").replace("%u", `<@${member.id}>`));
  },
};
