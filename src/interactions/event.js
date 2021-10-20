const { CommandInteraction, MessageEmbed } = require("discord.js");
const { db, client } = require("../index.js");
const refreshCommand = require("../utils/refreshCommand.js");
const removeFromArray = require("../utils/removeFromArray.js");
const setEvent = require("../utils/setEvent.js");
const moment = require("moment");

moment.locale("fr");

const messages = {
  noRegisterEvent: "Il n'y a pas d'event enregistré.",
  eventList: "Voici la liste des events :\n",
  invalidArgument: "Argument(s) invalide(s).",
  wrongDateFormat: "Le format de la date est incorecte. (ex: .event nom 23/06 19:45)",
  maxChoice: "Le nombre maximum de choix est 10 et il doit y avoir autant d'emojis que de choix.",
  onlyBasicEmojis: "Seulement les emojis standart sont autorisés.",
  eventNotFound: "Cet événement n'existe pas.",
  eventUpdated: "L'événement a bien été modifié.",
  eventDeleted: "L'événement a bien été supprimé.",
};

/**
 * @param {Moment} date
 * @param {Map} args
 * @returns
 */
const getDate = (date, args) => {
  if (args.get("month")) date.set("M", args.get("month") - 1);
  if (args.get("day")) date.set("D", args.get("day"));
  if (args.get("hour") != undefined) date.set("h", args.get("hour"));
  if (args.get("minute") != undefined) date.set("m", args.get("minute"));
  date.set("s", 0);
  date.set("ms", 0);
  if (date < moment()) date.add(1, "year");
  if (!date.isValid) return false;
  return date.utc().format();
};

const getEventOption = (required) => {
  return [
    {
      name: "name",
      description: "Nom de l'event.",
      type: "STRING",
      required: required,
    },
    {
      name: "month",
      description: "Mois de l'event.",
      type: "INTEGER",
      required: required,
    },
    {
      name: "day",
      description: "Jour de l'event.",
      type: "INTEGER",
      required: required,
    },
    {
      name: "hour",
      description: "Heure de l'event.",
      type: "INTEGER",
      required: required,
    },
    {
      name: "minute",
      description: "Minute de l'event.",
      type: "INTEGER",
      required: required,
    },
  ];
};

const getData = () => {
  let events = db.getData("/event");

  for (const [i, event] of events.entries()) {
    if (moment().diff(moment(event.date)) > 0) {
      removeFromArray("/event", event.id, "id");
      events.splice(i, 1);
    }
  }

  events = events.map((e) => {
    return {
      name: `${e.name}, ${moment().to(e.date)}`,
      value: e.id,
    };
  });

  return {
    name: "event",
    description: "Command Event",
    defaultPermission: false,
    options: [
      {
        name: "list",
        description: "Voir la liste des events.",
        type: 1,
      },
      {
        name: "call",
        description: "Appeler les membres d'une event.",
        type: 1,
        options: [
          {
            name: "event",
            description: "Event à appeler.",
            type: "STRING",
            required: true,
            choices: events,
          },
          {
            name: "target",
            description: "Choix à appeler (ex: '⚔️ ; 🛡️').",
            type: "STRING",
            required: false,
          },
        ],
      },
      {
        name: "add",
        description: "Ajouter un event.",
        type: 1,
        options: [
          ...getEventOption(true),
          {
            name: "choix",
            description: "Nom des choix (ex: 'DPS ; Tank ; Heal')",
            type: "STRING",
            required: true,
          },
          {
            name: "emojis",
            description: "Emojis des choix (ex: '⚔️ ; 🛡️ ; ❤️')",
            type: "STRING",
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "Supprimer un event.",
        type: 1,
        options: [
          {
            name: "event",
            description: "Identifiant de l'event à supprimer",
            type: "STRING",
            required: true,
            choices: events,
          },
        ],
      },
      {
        name: "update",
        description: "Modifier un event.",
        type: 1,
        options: [
          {
            name: "event",
            description: "Identifiant de l'event à supprimer",
            type: "STRING",
            required: true,
            choices: events,
          },
          ...getEventOption(false),
        ],
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
    if (args.get("subcommand") == "call") {
      const id = args.get("event");
      const target =
        args
          .get("target")
          ?.split(";")
          ?.map((e) => e.trim()) ?? [];
      const index = db.getIndex("/event", id, "id");
      if (index == "-1") return interaction.editReply(messages.eventNotFound);
      const event = db.getData(`/event[${index}]`);
      const msgEvent = await interaction.channel.messages.fetch(id);
      if (!msgEvent) return interaction.editReply(messages.eventNotFound);
      let str = [`**Event : ${event.name}**`];
      for (const c of event.choices) {
        const reaction = msgEvent.reactions.resolve(c.emoji);
        if (!reaction) return;
        const users = await reaction.users.fetch();
        users.delete(client.user.id);
        if ((target.length == 0 || target.includes(c.emoji)) && users.size > 0)
          str.push(
            `${c.emoji} : ${Array.from(users.values())
              .map((u) => `<@${u.id}>`)
              .join(", ")}`
          );
      }
      return interaction.channel.send(str.join("\n"));
    }

    if (args.get("subcommand") == "list") {
      const events = db.getData("/event");
      events.forEach((e, i) => {
        if (moment(e.date) < moment()) db.delete(`/event[${i}]`);
      });
      interaction.editReply(
        events.length == 0
          ? messages.noRegisterEvent
          : messages.eventList +
              events
                .map((e) => {
                  return `\`${e.name}\`, ${moment().to(e.date)},  ${e.choices.map((c) => c.emoji).join(" ")}`;
                })
                .join("\n")
      );
    }

    if (args.get("subcommand") == "remove") {
      let result = await removeFromArray("/event", args.get("event"), "id");
      if (result) interaction.editReply(messages.eventDeleted);
      else interaction.editReply(messages.eventNotFound);
    }

    if (args.get("subcommand") == "add") {
      let date = getDate(moment(), args);
      if (!date) return interaction.editReply(messages.wrongDateFormat);

      let choices = args.get("choix").split(";");
      if (args.get("emojis").includes("<")) return interaction.editReply(messages.onlyBasicEmojis);
      let emojis = args.get("emojis").split(";");
      if (choices.length > 10 || choices.length != emojis.length) return interaction.editReply(messages.maxChoice);

      choices = choices.map((c, i) => {
        return { name: c, emoji: emojis[i].trim() };
      });

      let eventMsg = await interaction.channel.send({ embeds: [new MessageEmbed({ title: "..." })] });
      let event = {
        id: eventMsg.id,
        name: args.get("name"),
        date: date,
        choices: choices,
      };
      db.push(`/event[]`, event);
      setEvent(event, eventMsg);
      choices.forEach((c) => eventMsg.react(c.emoji));
    }

    if (args.get("subcommand") == "update") {
      const id = args.get("event");
      const index = db.getIndex("/event", id, "id");
      const msgEvent = await interaction.channel.messages.fetch(id);

      if (index == "-1" || !msgEvent) return interaction.editReply(messages.eventNotFound);

      let event = db.getData(`/event[${index}]`);
      if (args.get("name")) event.name = args.get("name");

      const date = getDate(moment(event.date), args);
      if (!date) return interaction.editReply(messages.wrongDateFormat);
      else event.date = date;

      db.push(`/event[${id}]/`, event);
      setEvent(event, msgEvent);
      interaction.editReply(messages.eventUpdated);
    }

    return refreshCommand(interaction.command, getData());
  },
};
