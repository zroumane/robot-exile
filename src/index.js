const { Client, Collection, Intents } = require("discord.js");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig.js");
const { JsonDB } = require("node-json-db");
const Twitter = require("twitter-v2");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

// Init DB
let guildId = process.env.ENV == "prod" ? process.env.PROD_GUILD : process.env.DEV_GUILD;
exports.db = db = new JsonDB(new Config(`db/${guildId}`, true, true, "/"));

// Init Discord Client
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});
exports.client = client;

const shutdown = async (e) => {
  console.log("Deconnecting...");
  await client?.stream?.close();
  await client?.connection?.destroy();
  await client.destroy();
  if (e) process.exit(0);
  return;
};

(async () => {
  // Init Twitter
  exports.T = new Twitter({
    consumer_key: process.env.CONSUMER,
    consumer_secret: process.env.CONSUMER_SECRET,
  });

  // Init gdoc
  client.gdoc = await (await require("./utils/refreshGdoc.js"))();

  // Client Login
  await client.login(process.env.ENV == "prod" ? process.env.PROD_TOKEN : process.env.DEV_TOKEN);
  client.user.setActivity(`/help`, { type: "LISTENING" });

  // Init some utils
  await client.guilds.fetch();
  client.guild = client.guilds.cache.get(guildId);
  await client.guild.members.fetch();
  client.ownerChannel = await client.guild.members.cache.get(process.env.ZEPHYR_ID).createDM();

  // Init interactions
  client.interactions = new Collection();
  const interactions = fs.readdirSync("./src/interactions").filter((file) => file.endsWith(".js"));
  for (const interaction of interactions) {
    const command = await require(`./interactions/${interaction}`);
    client.interactions.set(command.data.name, command);
  }
  await client.guild.commands.set(client.interactions.map((i) => i.data));

  client.guild.commands.cache.forEach(async (c) => {
    await c.permissions.set({
      permissions: [
        {
          id: process.env.ZEPHYR_ID,
          type: "USER",
          permission: true,
        },
        {
          id: process.env.ADMIN_ID,
          type: "ROLE",
          permission: true,
        },
      ],
    });
  });

  // Init events
  const events = fs.readdirSync("./src/events").filter((file) => file.endsWith(".js"));
  events.forEach(async (file) => {
    const name = file.split(".")[0];
    const event = await require(`./events/${file}`);
    if (event.once) client.once(name, (...args) => event.execute(...args));
    else client.on(name, (...args) => event.execute(...args));
  });

  console.log("Connected");
})();

process.once("SIGHUP", () => shutdown(false));

process.on("SIGINT", () => shutdown(true));
