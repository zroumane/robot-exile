import { Client, Guild, GuildMember, Intents, MessageEmbed, MessageAttachment } from "discord.js";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig.js";
import dotenv from "dotenv";
dotenv.config();

// Init Database
export const db = new JsonDB(
  new Config(`db/${process.env.ENV == "prod" ? process.env.PROD_GUILD : process.env.DEV_GUILD}`, true, true, "/")
);

// Init Discord Bot Client
export const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

const helpEmbed = {
  title: "Help !",
  description: `
    Voice les commandes du 🤖 Exilés. 
    \`<eventId>\` correspond à l'identifiant du message de l'event
    \`<channelId>\` correspondent à l'identifiant d'un salon vocal
    Pour accéder à ces identifiants vous devez activer les options développeurs
  `,
  fields: [
    {
      name: ".help",
      value: `
      Afficher ce message
      `,
    },
    {
      name: ".métier",
      value: `
        Lancer l'opération de référencement de vos métiers NW sur le gdoc
      `,
    },
    {
      name: ".perso",
      value: `
        Lancer l'opération de référencement de votre personnage NW sur le gdoc
      `,
    },
    {
      name: ".audio (Admin)",
      value: `
        Voir la liste des audio
        > \`.audio\`

        Jouer un audio enregistré
        > \`.audio <tag>\`
        Attachez un fichier audio pour
        l'enregistrer avec le tag inscrit

        Supprimer un audio
        > \`.audio -<tag>\`
      `,
    },
    {
      name: ".voice (Admin)",
      value: `
        Création d'un salon de création de salon
        > \`.voice add <channelId> <prefix>\`
        Le prefix non obligatoire sera situé dans le nom des salons créés
        
        Suppression d'un salon de création de salon
        > \`.voice remove <channelId>\`
      `,
    },
    {
      name: ".event (Admin)",
      value: `
      Créer un event
      > \`.event add "Guerre" 25/12 21:30 "tank;DPS;heal" 🛡️ ⚔️ ❤️\`

      Mettre à jour un event
      > \`.event update <eventId> "Nouveau titre"\`
      > \`.event update <eventId> 23/06 19:00\`

      Supprimer un event
      > \`.event remove <eventId>\`

      Mentionner les membres participants à un event
      > \`.event call <eventId>\`
      > \`.event call <eventId> ✅\` 
      `,
    },
    {
      name: "Crédit",
      value: `Bot développé par <@${process.env.ZEPHYR_ID}> pour les Exilés !`,
    },
  ],
};

export let guild = null;

client.login(process.env.ENV == "prod" ? process.env.PROD_TOKEN : process.env.DEV_TOKEN);

client.on("ready", async () => {
  console.log("Connected");

  await client.guilds.fetch();
  guild = client.guilds.cache.get(process.env.ENV == "prod" ? process.env.PROD_GUILD : process.env.DEV_GUILD);

  client.user.setActivity(`.help`, { type: "LISTENING" });
  let { voice } = await import("./voice.js");
  let { gdoc } = await import("./gdoc.js");
  let event = await import("./event.js");
  let { audio } = await import("./audio.js");

  client.on("messageCreate", (msg) => {
    switch (true) {
      /** Voice */
      case msg.content.startsWith(".voice"):
        return voice(msg);

      /** Gdoc */
      case msg.content.startsWith(".métier"):
        return gdoc(msg, "métier");

      case msg.content.startsWith(".perso"):
        return gdoc(msg, "perso");

      case msg.content.startsWith(".event add"):
        return event.event(msg);

      /** Event */
      case msg.content.startsWith(".event update"):
        return event.update(msg);

      case msg.content.startsWith(".event remove"):
        return event.remove(msg);

      case msg.content.startsWith(".event call"):
        return event.call(msg);

      /** Audio */
      case msg.content.startsWith(".audio"):
        return audio(msg);

      /** Other */
      case msg.content.startsWith(".help"):
        return msg.channel.send({ embeds: [helpEmbed] });

      case msg.content.startsWith(".raclette"):
        return msg.channel.send({ files: [new MessageAttachment("./assets/raclette.gif")] });
    }

    if (msg.content.startsWith(`<@!${client.user.id}>`)) return msg.reply("👋🤖");
  });
});

/**
 * @param {GuildMember} member
 * @returns
 */
export const checkPermission = (msg) => {
  if (msg.member.roles.cache.has(process.env.ADMIN_ID) || msg.member.id == process.env.ZEPHYR_ID) return true;
  msg.reply("Vous n'avez pas la permission d'utiliser cette commande.");
  return false;
};

/**
 * @param {GuildMember} member
 * @returns
 */
export const checkChannel = (msg, channelId) => {
  if (msg.channel.id == channelId) return true;
  msg.reply(`Cette commande est seulement utilisable dans <#${channelId}>`);
  return false;
};
