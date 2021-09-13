const { Message, MessageEmbed } = require("discord.js");
const moment = require("moment");
moment.locale("fr");

/**
 * @param {Object} event
 * @param {Message} msg
 */
module.exports = (event, msg) => {
  let embed = msg.embeds[0] ?? new MessageEmbed();
  embed.setTitle(`Event : ${event.name}`);
  let date = moment(event.date);
  embed.setDescription(`Date : ${date.format("dddd Do MMMM YYYY, H:mm")}, ${moment().to(date)}.`);
  let totalMember = event.choices.reduce((total, current) => total + current.members.length)
  console.log(totalMember);
  embed.fields = event.choices.map((c) => {
    let name = `${c.emoji} ${c.name} (${c.members.length} - ${c.members.length * 100 / totalMember})`;
    let value = c.members.length == 0 ? "> -" : c.members.map((m) => `> <@${m}>`).join("\n");
    return { name, value };
  });
  return msg.edit({ embeds: [embed] });
};
