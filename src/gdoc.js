import { DMChannel, Message, User, MessageActionRow, MessageButton } from "discord.js";
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import moment from "moment";
import { client } from "./index.js";

const messages = {
  intruction: "Clique sur le bouton correspondant pour mettre à jour tes données.",
  gdoc: "Gdoc des Exilés",
  already: "Vous avez déjà une opération en cours.",
  welcome: "Bonjour %u.",
  invalidAnswer: "La valeur doit etre comprise entre %l et %m.",
  operationEnded: "L'opération est terminée.",
  wrongChannel: "Cette commande est seulement utilisable dans <#%i>",
  countdownEnded: "Le temps d'attente est écoulé, l'opperation est annulé.",
  dmSend: "Vous allez recevoir un message privé.",
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
    if (questions[0].prefix) channel.send(questions[0].prefix.split(";").join("\n"));
    channel.send(`${questions[0].question} (Valeur actuelle : ${row["_rawData"][questions[0].column - 1]})`);
    channel
      .awaitMessages({ filter: (m) => m.author == user, max: 1, time: 60000 })
      .then((collector) => {
        let msg = collector.first().content;
        if (msg != ".") {
          if (questions[0].contraint) {
            let contraint = questions[0].contraint.split("-");
            msg = parseInt(msg);
            if (isNaN(msg) || msg < contraint[0] || msg > contraint[1]) {
              channel.send(messages.invalidAnswer.replace("%l", contraint[0]).replace("%m", contraint[1]));
              return messageAwait(user, channel, row, questions);
            }
          }
          row["_rawData"][questions[0].column - 1] = questions[0].replace
            ? c.find((c) => c.key == questions[0].replace + "-" + msg).value
            : ` ${msg}`;
        }
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

client.on("interactionCreate", async (button) => {
  if (!button.isButton()) return;
  let sheetId = button.customId;
  let sheet = await doc.sheetsById[sheetId];
  if (!sheet) throw "no sheet";
  let user = button.user;
  if (current.find((u) => u == user.id)) return button.deferUpdate();
  try {
    let questions = q.filter((q) => q.sheet == sheetId);
    let rows = await sheet.getRows();
    let row = rows.find((row) => row.id == user.id) ?? (await sheet.addRow(Array(3 + questions.length).fill(0)));
    row.id = user.id;
    row.pseudo = user.username;
    let channel = await user.createDM();
    channel.send(messages.welcome.replace("%u", user.username));
    current.push(user.id);
    messageAwait(user, channel, row, questions);
    return button.deferUpdate();
  } catch (e) {}
});

/**
 * @param {Message} msg
 */
export const gdoc = (msg) => {
  let args = msg.content.split(" ");
  if (msg.deletable) msg.delete();
  if (args.length < 3) return;
  let components = [
    new MessageActionRow().addComponents(
      new MessageButton()
        .setURL(`https://docs.google.com/spreadsheets/d/${args[1]}`)
        .setLabel(messages.gdoc)
        .setStyle("LINK")
    ),
  ];
  for (let i = 2; i < args.length; i++) {
    let data = args[i].split(":");
    components.push(
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(data[0])
          .setLabel(data[1] == "" ? `Boutton` : data[1])
          .setStyle("PRIMARY")
      )
    );
  }
  msg.channel.send({ content: messages.intruction, components: components });
};
