import { DMChannel, Message, User } from "discord.js";
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import { db } from "./index.js";

const doc = new GoogleSpreadsheet(process.env.DOC_METIER);

await doc.useServiceAccountAuth({
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
});

await doc.loadInfo();
const sheet = doc.sheetsByIndex[0];
await sheet.loadHeaderRow();
const headerValues = sheet.headerValues;

/**
 *
 * @param {User} user
 * @param {DMChannel} channel
 * @param {GoogleSpreadsheetRow} row
 * @param {number} index
 */
const metierMessageLoop = async (user, channel, row, index) => {
  if (index == 15) {
    row.date = new Date().toISOString().replace("T", " ").replace(".", " ").slice(0, 19);
    row.id = user.id;
    row.pseudo = user.username;
    channel.send("L'opération est terminée.");
    await row.save();
  } else {
    channel.send(
      `Quel est votre niveau pour le métier ${headerValues[index]} ? (Actuel : ${row["_rawData"][index] ?? 0})`
    );
    channel
      .awaitMessages((m) => m.author == user, { max: 1, time: 60000 })
      .then((c) => {
        let msg = c.first().content;
        if (msg == 0) {
          row["_rawData"][index] = row["_rawData"][index] ?? 0;
          return metierMessageLoop(user, channel, row, index + 1);
        }
        let lvl = parseInt(msg);
        if (isNaN(lvl) || msg < 0 || msg > 200) {
          channel.send("Vous devez fournir un nombre compris entre 0 et 200. (0 pour passer la question)");
          return metierMessageLoop(user, channel, row, index);
        }
        row["_rawData"][index] = msg;
        return metierMessageLoop(user, channel, row, index + 1);
      })
      .catch(() => {
        channel.send("Le temps d'attente est écoulé, l'opperation est annulé.");
      });
  }
};

/**
 * @param {Message} msg
 */
export const metier = async (msg) => {
  let rows = await sheet.getRows();
  let metierChannel = db.getData("/metier/channel");
  if (msg.channel.id != metierChannel) {
    return msg.reply(`cette commande est seulement utilisable dans <#${metierChannel}>`);
  }
  let match;
  rows.forEach((row) => {
    if (row.id == msg.author.id) match = row;
  });
  let channel = msg.author.dmChannel;
  if (!channel) channel = await msg.author.createDM();
  channel.send(`Bonjour ${msg.author.username}. Vous aurez 60 secondes pour répondre à chaque questions.`);
  metierMessageLoop(msg.author, channel, match ?? (await sheet.addRow(Array(15).fill(0))), 3);
  msg.reply("un message vous a été envoyé.");
};
