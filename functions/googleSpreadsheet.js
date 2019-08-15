const { google } = require("googleapis");
const constants = require("./constant");

function getDataFromSpreadsheet(tabName, startCell, endCell) {
  return new Promise((resolve, reject) => {
    const sheets = google.sheets({
      version: "v4",
      auth: constants.SPREAD_SHEET_API_KEY
    });

    sheets.spreadsheets.values.get(
      {
        spreadsheetId: constants.SPREAD_SHEET_ID,
        range: `${tabName}!${startCell}:${endCell}`
      },
      (err, res) => {
        if (err) reject("The API returned an error: " + err);

        const rows = res.data.values;

        resolve(rows);
      }
    );
  });
}

exports.getDataFromSpreadsheet = getDataFromSpreadsheet;
