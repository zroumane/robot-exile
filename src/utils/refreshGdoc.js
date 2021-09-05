const { GoogleSpreadsheet } = require("google-spreadsheet");
const { db } = require("../index.js");

module.exports = async () => {
  const data = db.getData("/gdoc");

  if (!data.question || !data.choice || !data.docId) return null;

  const doc = new GoogleSpreadsheet(data.docId);
  try {
    doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
  } catch (error) {
    return null;
  }

  doc.current = [];
  doc.questions = await doc.sheetsById[data.question].getRows();
  doc.choices = await doc.sheetsById[data.choice].getRows();

  if (!doc.questions || !doc.choices) return null;

  return doc;
};
