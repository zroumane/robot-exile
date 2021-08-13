import { DMChannel, Message, User } from "discord.js";
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import moment from "moment";
import { db } from "./index.js";

const messages = {
  already: "Vous avez déjà une opération en cours.",
  welcome: "Bonjour %u. Vous aurez 60 secondes pour répondre à chaque questions.",
  invalidAnswer: "La valeur doit etre comprise entre %l et %m.",
  operationEnded: "L'opération est terminée.",
  wrongChannel: "Cette commande est seulement utilisable dans <#%i>",
  countdownEnded: "Le temps d'attente est écoulé, l'opperation est annulé.",
  dmSend: "Vous allez recevoir un message privée.",
  error: "Une erreur est survenue.",
};

let current = [];

const doc = new GoogleSpreadsheet(process.env.GDOC);

await doc.useServiceAccountAuth({
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
});

await doc.loadInfo();

const q = await doc.sheetsById[process.env.QUESTION_SHEET].getRows();
const c = await doc.sheetsById[process.env.CHOICE_SHEET].getRows();

/**
 *
 * @param {User} user
 * @param {DMChannel} channel
 * @param {GoogleSpreadsheetRow} row
 * @param {Array} questions
 */
const messageAwait = async (user, channel, row, questions) => {
  if (!questions.length) {
    row.date = moment().format("DD-MM-YY HH:mm");
    channel.send(messages.operationEnded);
    current = current.filter((u) => u != user.id);
    await row.save();
  } else {
    channel.send(`${questions[0].question} (Valeur actuelle : ${row["_rawData"][questions[0].column - 1]})`);
    channel
      .awaitMessages({ filter: (m) => m.author == user, max: 1, time: 60000 })
      .then((collector) => {
        let msg = collector.first().content;
        let contraint = questions[0].contraint.split("-");
        let int = parseInt(msg);
        if (isNaN(int) || int < contraint[0] || int > contraint[1]) {
          channel.send(messages.invalidAnswer.replace("%l", contraint[0]).replace("%m", contraint[1]));
          return messageAwait(user, channel, row, questions);
        }
        row["_rawData"][questions[0].column - 1] = questions[0].replace
          ? c.find((c) => c.key == questions[0].replace + "-" + int).value
          : int;
        questions.shift();
        return messageAwait(user, channel, row, questions);
      })
      .catch((e) => {
        if (row.date == 0) row.delete();
        channel.send(messages.countdownEnded);
        current = current.filter((u) => u != user.id);
      });
  }
};

/**
 * @param {Message} msg
 */
export const gdoc = async (msg, type) => {
  let user = msg.author;
  if (current.find((u) => u == user.id)) return msg.reply(messages.already);
  let data = db.getData("/gdoc/" + type);
  if (msg.channel.id != data.channel) return msg.reply(messages.wrongChannel.replace("%i", data.channel));
  // try {
  let questions = q.filter((q) => q.sheet == data.sheet);
  let rows = await doc.sheetsById[data.sheet].getRows();
  let row =
    rows.find((row) => row.id == user.id) ??
    (await doc.sheetsById[data.sheet].addRow(Array(3 + questions.length).fill(0)));
  row.id = user.id;
  row.pseudo = user.username;
  let channel = await user.createDM();
  channel.send(messages.welcome.replace("%u", user.username));
  msg.reply(messages.dmSend);
  current.push(user.id);
  messageAwait(user, channel, row, questions);
  // } catch (e) {
  //   return msg.reply(messages.error);
  // }
};
