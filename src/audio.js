import { Message } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import { checkChannel, checkPermission, db } from "./index.js";

const messages = {
  nochannel: "Vous devez être connecté à un salon.",
  notag: "Vous devez fournir un tag.",
  incorrectFormat: "Le fichier attaché doit être un fichier audio.",
  audioAdded: "L'audio a été ajouté, `%c` pour le jouer.",
  noaudio: "Cet audio n'existe pas.",
  deleted: "L'audio a bien été supprimé",
};

/**
 * @param {Message} msg
 */
export const audio = (msg) => {
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
    if (!audio[tag.slice(1)]) return msg.reply(messages.noaudio);
    db.delete(`/audio/tag/${tag.slice(1)}`);
    return msg.reply(messages.deleted);
  }

  let file = msg.attachments.first();
  if (file) {
    if (!file.contentType.startsWith("audio")) return msg.reply(messages.incorrectFormat);
    db.push(`/audio/tag/${tag}`, file.url);
    return msg.reply(messages.audioAdded.replace("%c", `.audio ${tag}`));
  }

  let channel = msg.member.voice.channel;
  if (!channel) return msg.reply(messages.nochannel);

  if (!audio[tag]) return msg.reply(messages.noaudio);
  let url = audio[tag];

  let connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  player.on(AudioPlayerStatus.Idle, () => {
    try {
      connection.destroy();
      player.stop();
    } catch (e) {}
  });
  player.play(createAudioResource(url));
  connection.subscribe(player);
};
