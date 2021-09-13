const { Message, MessageEmbed } = require("discord.js");
const moment = require("moment");
moment.locale("fr");

/**
 * @param {Object} event
 * @param {Message} msg
 */
module.exports = (event, msg) => {
  const embed = msg.embeds[0] ?? new MessageEmbed();
  embed.setTitle(`Event : ${event.name}`);
  const date = moment(event.date);
  embed.setDescription(`Date : ${date.format("dddd Do MMMM YYYY, H:mm")}, ${moment().to(date)}.`);
  const totalMember = event.choices.reduce((total, current) => total + current.members.length, 0);
  embed.fields = event.choices.map((c) => {
    const name = `${c.emoji} ${c.name} (${c.members.length} - ${
      c.members.length == 0 ? "0" : (c.members.length * 100) / totalMember
    }%)`;
    const value = c.members.length == 0 ? "> -" : c.members.map((m) => `> <@${m}>`).join("\n");
    return { name, value };
  });
  return msg.edit({ embeds: [embed] });
};
