const { db, client } = require("../index.js");
const setEvent = require("../utils/setEvent.js");

module.exports = {
  execute: async (reaction, user) => {
    if (user == client.user) return;
    const emoji = reaction.emoji.name;
    const id = reaction.message.id;
    const index = db.getIndex("/event", id, "id");
    if (index == "-1") return;
    const msgEvent = await reaction.message.fetch();
    const reactions = msgEvent.reactions.cache;
    const event = db.getData(`/event[${index}]`);
    reactions.forEach(async (r, e) => {
      let choiceIndex = event.choices.findIndex((c) => c.emoji == e);
      if (choiceIndex < 0 || e != emoji) {
        await r.users.fetch();
        return r.users.remove(user.id);
      }
      db.push(`/event[${index}]/choices[${choiceIndex}]/members[]`, user.id);
    });
    setEvent(event, msgEvent);
  },
};
