import Discord from "discord.js";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig.js";
import dotenv from "dotenv";
dotenv.config();

// Init Database
export let db = new JsonDB(
  new Config(`db/${process.env.ENV == "prod" ? process.env.PROD_GUILD : process.env.DEV_GUILD}`, true, true, "/")
);

// Init Discord Bot Client
export const client = new Discord.Client();
client.login(process.env.ENV == "prod" ? process.env.PROD_TOKEN : process.env.DEV_TOKEN);
client.on("ready", async () => {
  console.log("Connected");
  client.user.setActivity(`.help`, { type: "LISTENING" });
  let { voice } = await import("./voice.js");
  let { metier } = await import("./metier.js");

  client.on("message", (msg) => {
    if (msg.content.startsWith(".voice")) {
      voice(msg);
    }

    if (msg.content.startsWith(".métier")) {
      metier(msg);
    }

    if (msg.content.startsWith(".help")) {
      msg.channel.send(`\`\`\`Commandes :
        .help
          : Afficher ce message
        .voice (add|remove) <Id Channel> <?prefix>
          : Ajouter ou supprimer un channel de création vocale
        .métier
          : Mettre à jour vos lvl de métiers dans le gdoc\`\`\``);
    }
  });
});
