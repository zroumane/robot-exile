const Discord = require("discord.js");
const bot = new Discord.Client();
require("dotenv").config();

bot.login(process.env.TOKEN);

bot.on("voiceStateUpdate", (oldMember, newMember) => {
  let newUserChannel = newMember.voiceChannel;
  let oldUserChannel = oldMember.voiceChannel;

  if (oldUserChannel === undefined && newUserChannel !== undefined) {
    // User Joins a voice channel
  } else if (newUserChannel === undefined) {
    // User leaves a voice channel
  }
});
