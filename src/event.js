import { Message, MessageEmbed } from "discord.js";
import { db, client, checkPermission } from "./index.js";
import moment from "moment";

moment.locale("fr");

const messages = {
  invalidArgument: "Argument(s) invalide(s).",
  wrongDateFormat: "Le format de la date est incorecte. (ex: .event nom 23/06 19:45)",
  maxChoice: "Le nombre maximum de choix est 10.",
  onlyBasicEmojis: "Seulement les emojis standart sont autorisés.",
  eventNotFound: "Cet événement n'existe pas.",
  eventUpdated: "L'événement a bien été modifié.",
  eventDeleted: "L'événement a bien été supprimé.",
};

const checkEvent = () => {
  let events = db.getData("/event/");
  Object.keys(events).forEach((e) => {
    if (moment(events[e].date) < moment()) db.delete(`/event/${e}/`);
  });
};

const getDate = (str) => {
  let date = moment(str.trim(), "DD-MM hh:mm");
  if (!date.isValid) return false;
  if (date < moment()) date.add(1, "year");
  return date;
};

/**
 * @param {Message} msg
 */
const setEvent = (event, msg) => {
  checkEvent();
  let embed = msg.embeds[0] ?? new MessageEmbed();
  embed.setTitle(`Event : ${event.name}`);
  let date = moment(event.date);
  embed.setDescription(`Date : ${date.format("dddd Do MMMM YYYY, H:mm")}, ${moment().to(date)}.`);
  embed.fields = event.choices.map((c) => {
    let name = `${c.emoji} ${c.name} (${c.members.length})`;
    let value = c.members.length == 0 ? "> -" : c.members.map((m) => `> <@${m}>`).join("\n");
    return { name, value };
  });
  msg.edit({ embeds: [embed] });
};

/**
 * @param {Message} msg
 */
export const event = async (msg) => {
  checkEvent();
  if (!checkPermission(msg)) return;
  let args = msg.content.split('"');
  if (args.length < 5) return msg.reply(messages.invalidArgument);
  let date = getDate(args[2]);
  if (!date) return msg.reply(messages.wrongDateFormat);
  let choices = args[3].split(";");
  if (args[4].includes("<")) return msg.reply(messages.onlyBasicEmojis);
  let emojis = args[4].trim().split(" ");
  if (choices.length > 10) return msg.reply(messages.maxChoice);
  choices = choices.map((c, i) => {
    return { name: c, emoji: emojis[i], members: [] };
  });
  let eventMsg = await msg.channel.send({ embeds: [new MessageEmbed({ title: "..." })] });
  let event = {
    name: args[1],
    date: date.format(),
    choices: choices,
  };
  db.push(`/event/${eventMsg.id}/`, event);
  setEvent(event, eventMsg);
  choices.forEach((c) => eventMsg.react(c.emoji));
};

client.on("messageReactionAdd", async (reaction, user) => {
  if (user == client.user) return;
  let emoji = reaction.emoji.name;
  if (db.exists(`/event/${reaction.message.id}/`)) {
    let msgEvent = await reaction.message.fetch();
    let reactions = msgEvent.reactions.cache;
    let event = db.getData(`/event/${msgEvent.id}/`);
    reactions.forEach(async (r, e) => {
      let choiceIndex = event.choices.findIndex((c) => c.emoji == e);
      if (choiceIndex < 0 || e != emoji) {
        await r.users.fetch();
        return r.users.remove(user.id);
      }
      db.push(`/event/${msgEvent.id}/choices[${choiceIndex}]/members[]`, user.id);
    });
    setEvent(event, msgEvent);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  let emoji = reaction.emoji.name;
  if (db.exists(`/event/${reaction.message.id}/`)) {
    let msgEvent = await reaction.message.fetch();
    let event = db.getData(`/event/${msgEvent.id}`);
    event.choices.forEach((c, i) => {
      if (c.emoji == emoji) {
        db.push(
          `/event/${msgEvent.id}/choices[${i}]/members`,
          c.members.filter((m) => m != user.id)
        );
      }
    });
    setEvent(event, msgEvent);
  }
});

/**
 * @param {Message} msg
 */
export const update = async (msg) => {
  checkEvent();
  if (!checkPermission(msg)) return;
  let args = msg.content.split('"');
  let name, date;
  let id = args[0].split(" ")[2];
  args.length == 1 ? (date = `${args[0].split(" ")[3]} ${args[0].split(" ")[4]}`) : (name = args[1]);
  if (!id || (!name && date.includes("undefined")) || (!date && !name)) return msg.reply(messages.invalidArgument);
  try {
    let msgEvent = await msg.channel.messages.fetch(id);
    if (!db.exists(`/event/${msgEvent.id}/`)) throw null;
    let event = db.getData(`/event/${msgEvent.id}/`);
    if (name) event.name = name;
    if (date) {
      event.date = getDate(date);
      if (!date) return msg.reply(messages.wrongDateFormat);
    }
    db.push(`/event/${msgEvent.id}/`, event);
    setEvent(event, msgEvent);
    msg.reply(messages.eventUpdated);
  } catch (error) {
    return msg.reply(messages.eventNotFound);
  }
};

/**
 * @param {Message} msg
 */
export const remove = async (msg) => {
  if (!checkPermission(msg)) return;
  let args = msg.content.split(" ");
  if (args.length != 3) return msg.reply(messages.invalidArgument);
  try {
    let eventMsg = await msg.channel.messages.fetch(args[2]);
    if (!db.exists(`/event/${eventMsg.id}/`)) throw null;
    db.delete(`/event/${eventMsg.id}/`);
    eventMsg.delete();
    msg.reply(messages.eventDeleted);
  } catch (error) {
    return msg.reply(messages.eventNotFound);
  }
};

/**
 * @param {Message} msg
 */
export const call = async (msg) => {
  if (!checkPermission(msg)) return;
  let args = msg.content.split(" ");
  if (args.length < 3) return msg.reply(messages.invalidArgument);
  if (!db.exists(`/event/${args[2]}/`)) return msg.reply(messages.eventNotFound);
  let event = db.getData(`/event/${args[2]}/`);
  args.splice(0, 3);
  let str = [`**Event : ${event.name}**`];
  event.choices.forEach((c) => {
    if ((args.length == 0 || args.includes(c.emoji)) && c.members.length > 0)
      str.push(`${c.emoji} : ${c.members.map((m) => `<@${m}>`).join(", ")}`);
  });
  return msg.channel.send(str.join("\n"));
};
