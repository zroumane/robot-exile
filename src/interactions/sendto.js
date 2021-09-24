const { CommandInteraction } = require("discord.js");
const { client } = require("..");

const sendMessage = async (member, message, n) => {
  try {
    if (member.user.bot) return;
    const dmChannel = await member.createDM();
    dmChannel.send(message);
    console.log(member.user.username, n);
  } catch (e) {
    console.log("SendTo Errro :", e);
  }
};

const messages = {
  invalidMessage: "Ce message est invalide ou n'hexiste pas.",
  invalidRole: "Ce role est invalide ou n'existe pas.",
  mpSend: "Le message a été envoyé à %n membre(s).",
};

module.exports = {
  data: {
    name: "sendto",
    description: "Envoyer un message privée à tous un role.",
    default_permission: false,
    options: [
      {
        name: "message",
        description: "Identifiant du message à envoyer.",
        type: "STRING",
        required: true,
      },
      {
        name: "role",
        description: "Role auquel envoyer le message",
        type: "ROLE",
        required: true,
      },
    ],
  },
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    await interaction.channel.messages.fetch([args.get("message")]);
    const message = interaction.channel.messages.cache.get(args.get("message"));
    if (!message) return interaction.editReply(messages.invalidMessage);
    const role = client.guild.roles.resolve(args.get("role"));
    if (!role) return interaction.editReply(messages.invalidRole);
    let n = 0;
    console.log(`Sending message ${message.id} by ${message.author.username}`);
    for (const [k, member] of role.members) {
      sendMessage(member, message.content, n);
      n++;
      1;
    }
    interaction.editReply(messages.mpSend.replace("%n", n));
  },
};
