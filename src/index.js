import { Client, Guild, GuildMember, Intents, MessageEmbed } from "discord.js";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig.js";
import dotenv from "dotenv";
dotenv.config();

// Init Database
export let db = new JsonDB(
  new Config(`db/${process.env.ENV == "prod" ? process.env.PROD_GUILD : process.env.DEV_GUILD}`, true, true, "/")
);

// Init Discord Bot Client
export const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

client.login(process.env.ENV == "prod" ? process.env.PROD_TOKEN : process.env.DEV_TOKEN);
client.on("ready", async () => {
  console.log("Connected");
  client.user.setActivity(`.help`, { type: "LISTENING" });
  let { voice } = await import("./voice.js");
  let { metier } = await import("./metier.js");
  let { event, update, remove } = await import("./event.js");

  client.on("messageCreate", (msg) => {
    switch (true) {
      case msg.content.startsWith(".voice"): {
        return voice(msg);
      }
      case msg.content.startsWith(".métier"): {
        return metier(msg);
      }
      case msg.content.startsWith(".event add"): {
        return event(msg);
      }
      case msg.content.startsWith(".event update"): {
        return update(msg);
      }
      case msg.content.startsWith(".event remove"): {
        return remove(msg);
      }
      case msg.content.startsWith(".help"): {
        return msg.channel.send("Help message en cours de fabrication");
      }
    }
  });
});

/**
 * @param {GuildMember} member
 * @returns
 */
export const checkPermission = (member) => {
  if (member.roles.cache.has(process.env.ADMIN_ID) || member.id == process.env.ZEPHYR_ID) return true;
  msg.reply("vous n'avez pas la permission d'utiliser cette commande.");
  return false;
};

//   `\`\`\`Commandes :
// .help
// : Afficher ce message
// .voice (add|remove) <Id Channel> <?prefix>
// : Ajouter ou supprimer un channel de création vocale
// .métier
// : Mettre à jour vos lvl de métiers dans le gdoc\`\`\``);
//   }
