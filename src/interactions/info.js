const { CommandInteraction } = require("discord.js");
const moment = require("moment");
const { client } = require("..");

const messages = {
  mpSend: "Un message privée vous a été envoyé.",
};

module.exports = {
  data: {
    name: "Info",
    type: "USER",
    default_permission: false,
  },
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    if (client.gdoc == null) client.gdoc = await (await require("../utils/refreshGdoc.js"))();
    if (client.gdoc == false) return interaction.deferUpdate();
    const member = interaction.options.getUser("user");
    let message = [`**Infos de ${member.username} :**`];
    for (let i = 0; i < client.gdoc.sheetCount; i++) {
      const sheet = client.gdoc.sheetsByIndex[i];
      await sheet.loadHeaderRow();
      if (sheet.headerValues.includes("id")) {
        const rows = await sheet.getRows();
        const row = rows.find((r) => r.id == member.id);
        if (row) {
          message.push(`\n**${sheet.title}**, ${moment().to(moment(row.date, "DD-MM-YY HH:mm"))} :`);
          for (let c = 3; c < sheet.headerValues.length; c++) {
            message.push(`> ${sheet.headerValues[c]} : \`${row[sheet.headerValues[c]]}\` `);
          }
        }
      }
    }
    if (message.length == 1) message = [`Il n'y a pas d'infos sur ${member.username} !`];
    const dmChannel = await interaction.member.createDM();
    if (dmChannel) dmChannel.send(message.join("\n"));
    await interaction.editReply(messages.mpSend);
  },
};
