const { Message, MessageEmbed } = require("discord.js");
const { client } = require("../index.js");
const moment = require("moment");
moment.locale("fr");

/**
 * @param {Object} event
 * @param {Message} msg
 */
module.exports = async (event, msg) => {
  const embed = msg.embeds[0] ?? new MessageEmbed();
  embed.setTitle(`Event : ${event.name}`);
  const date = moment(event.date);
  embed.setDescription(`Date : ${date.format("dddd Do MMMM YYYY, H:mm")}, ${moment().to(date)}.`);
  const users = [];
  for (const c of event.choices) {
    const reaction = await msg.reactions.resolve(c.emoji);
    if (!reaction || !reaction.me) {
      await msg.react(c.emoji);
      users.push(new Map());
    } else users.push(await reaction.users.fetch());
  }
  const total = users.map((l) => l.size - 1).reduce((a, n) => a + n);
  embed.fields = [];
  for (const c of event.choices) {
    const u = users[event.choices.indexOf(c)];
    u.delete(client.user.id);
    const name = `${c.emoji} ${c.name} (${u.size} - ${u.size == 0 ? "0" : Math.round((u.size * 1000) / total) / 10}%)`;
    const value = `> ${
      u.size == 0
        ? "-"
        : Array.from(u.values())
            .map((u) => `<@${u.id}>`)
            .join(", ")
    }`;
    embed.addField(name, value);
  }
  return await msg.edit({ embeds: [embed] });
};
