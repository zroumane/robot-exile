const { Interaction } = require("discord.js");
const { client } = require("../index.js");
const messageAwait = require("../utils/messageAwait.js");

const messages = {
  mpSend: "Un message privée vous a été envoyé.",
  already: "Vous avez déja dans une opération en cours.",
  roleAdded: 'Le rôle "%r" vous a été assigné.',
  roleRemoved: 'Le rôle "%r" vous a été retiré.',
  error: `Une erreur est survenue, contactez <@${process.env.ZEPHYR_ID}>`,
  suggestions: `Vous avez 5 min pour m'envoyer votre suggestion. (. pour annuler)`,
  suggestSend: `Merci, la suggestion a été transmise.`,
  countdownEnded: "Le temps d'attente est écoulé, l'opperation est annulé.",
};

/**
 * @param {Interaction} interaction
 */
module.exports = async (interaction) => {
  if (interaction.isCommand() || interaction.isContextMenu()) {
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
      await interaction.reply({ content: "Loading...", ephemeral: true });
      if (client.gdoc == null) client.gdoc = await (await require("../utils/refreshGdoc.js"))();
      if (client.gdoc == false) return interaction.deferUpdate();
      const sheetId = interaction.customId.slice(6);
      try {
        let sheet = await client.gdoc.sheetsById[sheetId];
        if (!sheet) throw "no sheet";
        let user = interaction.user;
        if (client.current.find((u) => u == user.id)) return await interaction.editReply(messages.already);
        let questions = client.gdoc.questions.filter((q) => q.sheet == sheetId);
        let rows = await sheet.getRows();
        let row = rows.find((row) => row.id == user.id) ?? (await sheet.addRow(Array(3 + questions.length).fill(0)));
        row.id = user.id;
        row.pseudo = user.username;
        let channel = await user.createDM();
        if (!channel) throw `${user.username}`;
        channel.send(`Bonjour ${user.username} !`);
        client.current.push(user.id);
        messageAwait(user, channel, row, questions);
        await interaction.editReply(messages.mpSend);
      } catch (e) {
        await interaction.editReply(messages.error);
        console.log("Gdoc button interaction reply error :", e);
      }
    } else if (interaction.customId.startsWith("role")) {
      let role = interaction.guild.roles.resolve(interaction.customId.slice(5));
      if (!role) return interaction.deferUpdate();
      let member = interaction.member;
      try {
        if (role.members.get(member.id)) {
          member.roles.remove(role);
          interaction.reply({ content: messages.roleRemoved.replace("%r", role.name), ephemeral: true });
        } else {
          member.roles.add(role);
          interaction.reply({ content: messages.roleAdded.replace("%r", role.name), ephemeral: true });
        }
      } catch (e) {
        console.log(e);
      }
    } else if (interaction.customId.startsWith("suggestion")) {
      await interaction.reply({ content: "Loading...", ephemeral: true });
      try {
        let user = interaction.user;
        if (client.current.find((u) => u == user.id)) return await interaction.editReply(messages.already);
        let channel = await interaction.guild.channels.fetch(interaction.customId.slice(11));
        const dmChannel = await user.createDM();
        if (dmChannel) {
          dmChannel.send(`Bonjour ${user.username} !`);
          dmChannel.send(messages.suggestions);
          client.current.push(user.id);
          await interaction.editReply(messages.mpSend);
        } else throw "Cant Send";
        dmChannel
          .awaitMessages({ filter: (m) => m.author == interaction.user, max: 1, time: 60 * 1000 * 5 })
          .then((collector) => {
            channel.send(`Suggestion de <@${user.id}> (${user.username}):\n> ${collector.first().content}`);
            client.current = client.current.filter((u) => u != user.id);
          })
          .catch((e) => {
            console.log("Message Suggestion error :\n", e);
            dmChannel.send(messages.countdownEnded);
            client.current = client.current.filter((u) => u != user.id);
          });
      } catch (e) {
        console.log("Suggestion", e);
        await interaction.editReply(messages.error);
      }
    }
  }
};
