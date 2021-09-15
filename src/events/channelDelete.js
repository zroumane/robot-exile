const removeFromArray = require("../utils/removeFromArray.js");

module.exports = {
  execute: async ({ id }) => {
    await removeFromArray("/voice/init", id, "channel");
    await removeFromArray("/voice/created", id, "channel");
  },
};
