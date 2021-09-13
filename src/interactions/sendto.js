const { CommandInteraction } = require("discord.js");
const { client } = require("..");

const messages = {
  invalidMessage: "Ce message est invalide ou n'hexiste pas.",
  invalidRole: "Ce role est invalide ou n'hexiste pas.",
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
    if (!role) return interaction.editReply(message.invalidRole);
    for (const [k, member] of role.members) {
      try {
        if (member.user.bot) return;
        const dmChannel = await member.createDM();
        dmChannel.send(message.content);
      } catch (error) {
        console.log(erreur);
      }
    }
  },
};
