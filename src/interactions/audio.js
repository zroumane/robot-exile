const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const { CommandInteraction } = require("discord.js");
const https = require("https");
const fs = require("fs");
const { client, db } = require("../index.js");
const refreshCommand = require("../utils/refreshCommand.js");
const removeFromArray = require("../utils/removeFromArray.js");

const messages = {
  noRegisterAudio: "Il n'y a pas d'audio enregistrer.",
  audioList: "Voici la liste des fichiers audio :\n",

  nochannel: "Vous devez être connecté à un salon.",
  playing: "En train de jourt `%t`.",
  noaudio: "Cet audio n'existe pas.",

  sendAudio: "Envoyer un fichier audio dans les 20 secondes.",
  noAudioSend: "L'opétation est annulé.",

  audioAdded: "L'audio a été ajouté, `%c` pour le jouer.",
  deleted: "L'audio a bien été supprimé.",
  dlerror: "Une erreur est survenue lors du téléchargement de l'audio.",
};

client.player = createAudioPlayer();
client.connection = null;

client.player.on(AudioPlayerStatus.Idle, () => {
  try {
    client.connection.destroy();
    client.player.stop();
  } catch (e) {}
});

const getAudioTag = () => {
  return db.getData("/audio").map((a) => {
    return {
      name: a.tag,
      value: a.tag,
    };
  });
};

const getData = () => {
  return {
    name: "audio",
    description: "Commande Audio",
    defaultPermission: false,
    options: [
      {
        name: "play",
        description: "Jouer un audio",
        type: 1,
        options: [
          {
            name: "tag",
            description: "Tag de l'audio à jouer",
            type: "STRING",
            required: true,
            choices: getAudioTag(),
          },
        ],
      },
      {
        name: "add",
        description: "Ajouter un audio",
        type: 1,
        options: [
          {
            name: "tag",
            description: "Tag de l'audio à ajouter",
            type: "STRING",
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "Supprimer un audio",
        type: 1,
        options: [
          {
            name: "tag",
            description: "Tag de l'audio à supprimer",
            type: "STRING",
            required: true,
            choices: getAudioTag(),
          },
        ],
      },
      {
        name: "list",
        description: "Voir la liste des audio",
        type: 1,
      },
    ],
  };
};

module.exports = {
  data: getData(),
  /**
   * @param {CommandInteraction} interaction
   */
  execute: async (interaction, args) => {
    const audio = db.getData("/audio");
    let dest = `./audio/${client.guild.id}/`;

    if (args.get("subcommand") == "list") {
      let files = fs.readdirSync(dest);

      files.forEach((file) => {
        if (!audio.find((a) => a.file == file)) {
          fs.unlinkSync(dest + file);
        }
      });

      return interaction.editReply(
        audio.length == 0
          ? messages.noRegisterAudio
          : messages.audioList +
              audio
                .map((a) => {
                  return `\`${a.tag}\` : ${a.file}`;
                })
                .join("\n")
      );
    }

    const tag = args.get("tag");

    if (args.get("subcommand") == "add") {
      let channel = interaction.channel;

      const filter = (m) => {
        return (
          m.member == interaction.member &&
          m.attachments.first() &&
          m.attachments.first().contentType.startsWith("audio")
        );
      };

      channel
        .awaitMessages({ filter, max: 1, time: 20 * 1000 })
        .then((c) => {
          const attachment = c.first().attachments.first();
          if (!fs.existsSync(dest)) fs.mkdirSync(dest);
          dest += attachment.name;
          let file = fs.createWriteStream(dest);
          https
            .get(attachment.url, (response) => {
              response.pipe(file);
              file.on("finish", async () => {
                await removeFromArray("/audio", tag, "tag");
                db.push(`/audio[]`, { tag: tag, file: attachment.name });
                interaction.followUp(messages.audioAdded.replace("%c", `/audio play ${tag}`));
                refreshCommand(interaction.command, getData());
                return file.close();
              });
            })
            .on("error", (e) => {
              interaction.followUp(messages.dlerror);
              return file.close();
            });
        })
        .catch((e) => interaction.followUp(messages.noAudioSend));

      return interaction.editReply(messages.sendAudio);
    }

    let object = audio.find((a) => a.tag == tag);
    if (!object) return interaction.editReply(messages.noaudio);
    dest += object.file;

    if (args.get("subcommand") == "remove") {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      await removeFromArray("/audio", tag, "tag");
      interaction.editReply(messages.deleted);
      return refreshCommand(interaction.command, getData());
    }

    if (args.get("subcommand") == "play") {
      let channel = interaction.member.voice.channel;
      if (!channel) return interaction.editReply(messages.nochannel);
      client.connection = await joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
      client.connection.subscribe(client.player);
      client.player.play(createAudioResource(dest));
      return interaction.editReply(messages.playing.replace("%t", object.tag));
    }
  },
};
