const { db } = require("../index.js");

/**
 * @param {string} path
 * @param {string} key
 * @param {string} value
 */
module.exports = async (path, value, key) => {
  const index = db.getIndex(`${path}`, value, key);
  if (index != "-1") {
    db.delete(`${path}[${index}]`);
    return true;
  }
  return false;
};
