const { db } = require("../index.js");
const setEvent = require("../utils/setEvent.js");

module.exports = async (reaction, user) => {
  const emoji = reaction.emoji.name;
  const id = reaction.message.id;
  const index = db.getIndex("/event", id, "id");
  if (index == "-1") return;
  const msgEvent = await reaction.message.fetch();
  const event = db.getData(`/event[${index}]`);
  event.choices.forEach(async (c, i) => {
    if (c.emoji == emoji) {
      db.push(
        `/event[${index}]/choices[${i}]/members`,
        c.members.filter((m) => m != user.id)
      );
    }
  });
  setEvent(event, msgEvent);
};
