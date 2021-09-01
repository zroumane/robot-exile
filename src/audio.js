import { Message } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import { checkChannel, checkPermission, db, guild } from "./index.js";

import fs from "fs";
import https from "https";

const messages = {
  nochannel: "Vous devez être connecté à un salon.",
  notag: "Vous devez fournir un tag.",
  incorrectFormat: "Le fichier attaché doit être un fichier audio.",
  audioAdded: "L'audio a été ajouté, `%c` pour le jouer.",
  noaudio: "Cet audio n'existe pas.",
  deleted: "L'audio a bien été supprimé.",
  dlerror: "Une erreur est survenue lors du téléchargement de l'audio.",
};

const player = createAudioPlayer();

let connection = null;

player.on(AudioPlayerStatus.Idle, () => {
  try {
    connection.destroy();
    player.stop();
  } catch (e) {}
});

/**
 * @param {Message} msg
 */
export const audio = async (msg) => {
  if (!checkPermission(msg)) return;

  let args = msg.content.split(" ");
  let data = db.getData("/audio/");

  if (!checkChannel(msg, data.channel)) return;

  let audio = data.tag;

  if (args.length == 1) {
    let reponse =
      Object.keys(audio).length == 0
        ? "Il n'y a pas d'audio enregistrer."
        : "Voici la liste des fichiers audio :\n" +
          Object.keys(audio)
            .map((t) => `\`${t}\` : ${audio[t]}`)
            .join("\n");
    return msg.reply(reponse);
  }

  let tag = args[1];
  if (!tag) return msg.reply(messages.notag);

  if (tag.startsWith("-")) {
    let _tag = tag.slice(1);
    if (!audio[_tag]) return msg.reply(messages.noaudio);
    fs.unlinkSync(`./audio/${guild.id}/${audio[_tag]}`);
    db.delete(`/audio/tag/${_tag}`);
    return msg.reply(messages.deleted);
  }

  let attachment = msg.attachments.first();

  if (attachment) {
    const dest = `./audio/${guild.id}/${attachment.name}`;

    if (!attachment.contentType.startsWith("audio")) return msg.reply(messages.incorrectFormat);
    db.push(`/audio/tag/${tag}`, attachment.name);

    if (!fs.existsSync(`./audio/${guild.id}`)) fs.mkdirSync(`./audio/${guild.id}`);

    let file = fs.createWriteStream(dest);
    https
      .get(attachment.url, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          msg.reply(messages.audioAdded.replace("%c", `.audio ${tag}`));
          file.close();
        });
      })
      .on("error", function (e) {
        msg.reply(messages.dlerror);
      });
    return;
  }

  let channel = msg.member.voice.channel;
  if (!channel) return msg.reply(messages.nochannel);

  if (!audio[tag]) return msg.reply(messages.noaudio);

  connection = await joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
  connection.subscribe(player);
  player.play(createAudioResource(`./audio/${guild.id}/${audio[tag]}`));
};
