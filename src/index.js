const { Client, Collection, Intents } = require("discord.js");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig.js");
const { JsonDB } = require("node-json-db");
const Twit = require("twit");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

process.env.TZ = 'Europe/Paris'

const shutdown = async (e) => {
  console.log("Deconnecting...");
  await client?.stream?.close();
  await client?.connection?.destroy();
  await client.destroy();
  if (e) process.exit(0);
  return;
};

// Init DB
const guildId = process.env.ENV == "prod" ? process.env.PROD_GUILD : process.env.DEV_GUILD;
const db = new JsonDB(new Config(`db/${guildId}`, true, true, "/"));
exports.db = db;

// Init Discord Client
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  restRequestTimeout: 30000,
});
exports.client = client;

(async () => {
  // Init Twitter
  const T = new Twit({
    consumer_key: process.env.CONSUMER,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  });
  exports.T = T;

  // Init gdoc
  client.gdoc = null;

  // Client Login
  await client.login(process.env.ENV == "prod" ? process.env.PROD_TOKEN : process.env.DEV_TOKEN);

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

  await client.guild.commands.cache.forEach(async (c) => {
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
    client.on(name, (...args) => {
      try {
        event(...args);
      } catch (error) {
        console.log("Event error :\n", error);
      }
    });
  });

  client.user.setActivity(`/help`, { type: "LISTENING" });
  console.log("Connected");
})();

process.once("SIGHUP", () => shutdown(false));

process.on("SIGINT", () => shutdown(true));
