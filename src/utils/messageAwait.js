const { User, DMChannel } = require("discord.js");
const { GoogleSpreadsheetRow } = require("google-spreadsheet");
const moment = require("moment");
const { client } = require("../index.js");

const dmChannelMessage = {
  invalidAnswer: "La valeur doit etre comprise entre %l et %m.",
  operationEnded: "L'opération est terminée.",
  countdownEnded: "Le temps d'attente est écoulé, l'opperation est annulé.",
};

/**
 *
 * @param {User} user
 * @param {DMChannel} channel
 * @param {GoogleSpreadsheetRow} row
 * @param {Array} questions
 */
const messageAwait = async (user, channel, row, questions, choices) => {
  if (!questions.length) {
    row.date = moment().format("DD-MM-YY HH:mm");
    channel.send(dmChannelMessage.operationEnded);
    client.gdoc.current = client.gdoc.current.filter((u) => u != user.id);
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
              channel.send(dmChannelMessage.invalidAnswer.replace("%l", contraint[0]).replace("%m", contraint[1]));
              return messageAwait(user, channel, row, questions, choices);
            }
          }
          row["_rawData"][questions[0].column - 1] = questions[0].replace
            ? client.gdoc.choices.find((c) => c.key == questions[0].replace + "-" + msg).value
            : ` ${msg}`;
        }
        questions.shift();
        return messageAwait(user, channel, row, questions, choices);
      })
      .catch((e) => {
        console.log(e);
        if (row.date == 0) row.delete();
        channel.send(dmChannelMessage.countdownEnded);
        client.gdoc.current = client.gdoc.current.filter((u) => u != user.id);
      });
  }
};

module.exports = messageAwait;
