const { client } = require("../index.js");

/**
 * @param {CommandInteraction} command
 * @param {Object} data
 */
module.exports = async (command, data) => {
  client.interactions.get(command.name).data = data;
  return await client.guild.commands.edit(command.id, data);
};
