const { db } = require("../index.js");
const setEvent = require("../utils/setEvent.js");

module.exports = async (reaction, user) => {
  const index = db.getIndex("/event", reaction.message.id, "id");
  if (index == "-1") return;
  const msgEvent = await reaction.message.fetch();
  const event = db.getData(`/event[${index}]`);
  setEvent(event, msgEvent);
};
