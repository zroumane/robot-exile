const removeFromArray = require("../utils/removeFromArray.js");

module.exports = async ({ id }) => {
  await removeFromArray("/voice/init", id, "channel");
  await removeFromArray("/voice/created", id, "channel");
};
