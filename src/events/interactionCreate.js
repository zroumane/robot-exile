const { Interaction } = require("discord.js");
const { client } = require("../index.js");
const messageAwait = require("../utils/messageAwait.js");

const messages = {
  mpSend: "Un message privée vous as été envoyé.",
  roleAdded: "Le rôle \"%r\" vous a été assigné.",
  roleRemoved: "Le rôle \"%r\" vous a été retiré.",
};

module.exports = {
  /**
   * @param {Interaction} interaction
   */
  execute: async (interaction) => {
    if (interaction.isCommand()) {
      const args = new Map();

      for (let option of interaction.options.data) {
        if (option.type === "SUB_COMMAND") {
          if (option.name) args.set("subcommand", option.name);
          option.options?.forEach((x) => {
            args.set(x.name, x.value);
          });
        } else if (option.value) args.set(option.name, option.value);
      }
      
      await interaction.reply({ content: "Loading...", ephemeral: true });

      try {
        client.interactions.get(interaction.commandName)?.execute(interaction, args);
      } catch (err) {
        console.error("Interaction error :\n", err);
      }

    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("sheet")) {
        if (!client.gdoc) return interaction.deferUpdate();
        const sheetId = interaction.customId.slice(6);
        try {
          let sheet = await client.gdoc.sheetsById[sheetId];
          if (!sheet) throw "no sheet";
          let user = interaction.user;
          if (client.gdoc.current.find((u) => u == user.id)) return interaction.deferUpdate();
          let questions = client.gdoc.questions.filter((q) => q.sheet == sheetId);
          let rows = await sheet.getRows();
          let row = rows.find((row) => row.id == user.id) ?? (await sheet.addRow(Array(3 + questions.length).fill(0)));
          row.id = user.id;
          row.pseudo = user.username;
          let channel = await user.createDM();
          channel.send(`Bonjour ${user.username} !`);
          client.gdoc.current.push(user.id);
          interaction.reply({ content: messages.mpSend, ephemeral: true });
          messageAwait(user, channel, row, questions);
        } catch (e) {
          console.log(e);
        }
      } else if (interaction.customId.startsWith("role")) {
        let role = client.guild.roles.resolve(interaction.customId.slice(5));
        if (!role) return interaction.deferUpdate();
        let member = interaction.member;
        try {
          if (role.members.get(member.id)) {
            member.roles.remove(role);
            interaction.reply({ content: messages.roleRemoved.replace('%r', role.name), ephemeral: true });
          } else {
            member.roles.add(role);
            interaction.reply({ content: messages.roleAdded.replace('%r', role.name), ephemeral: true });
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
  },
};
