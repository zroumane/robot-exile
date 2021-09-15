const { Presence } = require("discord.js");
const { db, client } = require("../index.js");

const getLive = (presence) => {
  if (!presence?.activities) return null;
  return presence.activities.find((a) => a.type == "STREAMING");
};

(async () => {
  const role = client.guild.roles.resolve(db.getData("/twitch/config").role);
  if (!role) return;
  try {
    role.members.forEach((member) => {
      if (!member.presence.activities.find((r) => r.type == "STREAMING")) {
        member.roles.remove(role);
      }
    });
  } catch (e) {}
})();

module.exports = {
  /**
   * @param {Presence} oldPresence
   * @param {Presence} newPresence
   */
  execute: async (oldPresence, newPresence) => {
    const oldStreamActivity = getLive(oldPresence);
    const newStreamActivity = getLive(newPresence);
    if ((!oldStreamActivity && !newStreamActivity) || (oldStreamActivity && newStreamActivity)) return;
    const config = db.getData("/twitch/config");
    if (!config.role || !config.channel || db.count("/twitch/streamers") == 0) return;
    const member = newPresence.member;
    const index = db.getIndex("/twitch/streamers", member.user.id, "id");
    if (index == "-1") return;
    const role = await client.guild.roles.resolve(config.role);
    const channel = await client.guild.channels.resolve(config.channel);
    if (!role || !channel) return;
    if (!oldStreamActivity && newStreamActivity) {
      try {
        member.roles.add(role);
        const activity = getLive(newPresence);
        const url = activity.url;
        const embed = {
          color: "#451093",
          title: activity.details ?? "Stream",
          url: url,
          author: {
            name: url.split("/").reverse()[0],
            icon_url: member.user.avatarURL(),
          },
          thumbnail: {
            url: member.user.avatarURL(),
          },
          fields: [
            {
              name: "Jeu",
              value: activity.state,
            },
          ],
          image: {
            url: activity.assets.largeImageURL(),
          },
        };

        channel.send({ embeds: [embed] });
      } catch (e) {}
    } else if (oldStreamActivity && !newStreamActivity) {
      try {
        member.roles.remove(role);
      } catch (e) {}
    }
  },
};
