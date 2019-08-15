let lodash = require("lodash");
let moment = require("moment");
let TimeFormat = require('hh-mm-ss');

const {
  dialogflow,
  Suggestions,
  SimpleResponse,
  Table,
  Button
} = require("actions-on-google");
const googleSpreadsheet = require("./googleSpreadsheet");
const functions = require("firebase-functions");
const constants = require('./constant');
const app = dialogflow({ debug: true });

let users = [];
let names = [];
let projects = [];
let individualEntries = [];

app.intent("Default Welcome Intent", conv => {
  if (conv.user.last.seen) {
    conv.ask(`Welcome back to Time Sheet`);
  } else {
    const ssml = `<speak>Welcome to Time sheet. I will assist you to know about your teams daily task as well the over all time taken for each project.</speak>`
    conv.ask(ssml);

  }
  conv.ask(
    new Suggestions(["Todays entries", "Yesterday entries", "Team", "Projects"])
  );

  const tabName = "Time Data";
  const startCell = "A2";
  const endCell = "F";
  users = [];
  names = [];
  googleSpreadsheet
    .getDataFromSpreadsheet(tabName, startCell, endCell)
    .then(results => {
      console.log('resultes is', results);
      lodash.map(results, result => {
        users.push(result);
        names.push(result[1]);
        projects.push(result[2]);
      });
    })
    .catch(error => {
      throw new Error(error);
    });
});

app.intent("Default Welcome Intent - team", conv => {
  conv.ask(`Here is your team`);
  let filteredNames = lodash.uniq(names);
  let sortedNames = filteredNames.sort();
  const teamNames = lodash.map(sortedNames, (name, index) => {
    return [(index + 1).toString(), name];
  });
  conv.ask(
    new Table({
      dividers: true,
      columns: ["S.No", "Name"],
      rows: teamNames
    })
  );
  conv.ask(
    new Suggestions(["Todays entries", "Yesterday entries", "Projects", "Exit"])
  );
});

app.intent("Default Welcome Intent - projects", conv => {
  conv.ask(`Here is the list of projects your team is handling`);
  let filteredProjects = lodash.uniq(projects);
  let sortedProjects = filteredProjects.sort();
  const projectNames = lodash.map(sortedProjects, (name, index) => {
    let selectedUser = [];
    lodash.map(users, user => {
      if (user[2] === name) {
        selectedUser.push(moment.duration(user[4]).asSeconds());
      }
    });
    const totalHours = lodash.sum(selectedUser);
    const convertedHrs = TimeFormat.fromS(totalHours, "hh:MM");
    return [(index + 1).toString(), name, convertedHrs];
  });
  conv.ask(
    new Table({
      dividers: true,
      columns: ["S.No.", "Name", "Total.Hrs"],
      rows: projectNames,
      buttons: new Button({
        title: "View More",
        url: constants.SPREAD_SHEET_URL
      })
    })
  );
  conv.ask(
    new Suggestions(["Todays entries", "Yesterday entries", "Team", "Exit"])
  );
});

app.intent("Default Welcome Intent - Todays entries", conv => {
  const currentDate = moment().format("M/D/YYYY");
  let entries = [];
  let entryNames = [];
  let allEntries = [];
  individualEntries = [];

  lodash.map(users, user => {
    if (lodash.includes(user[0], currentDate)) {
      entries.push(user);
      entryNames.push(user[1]);
      allEntries.push({ name: user[1], project: user[2], hours: moment.duration(user[4]).asSeconds() });
    }
  });
  if (lodash.size(entries) > 0) {
    let filteredNames = lodash.uniq(names);
    let filteredEntryNames = lodash.uniq(entryNames);

    const result = lodash.differenceWith(
      filteredNames,
      filteredEntryNames,
      lodash.isEqual
    );
    const sortedResult = result.sort();

    const unfilledNames = lodash.map(sortedResult, (name, index) => {
      return [(index + 1).toString(), name];
    });

    lodash.map(allEntries, (entry, index) => {
      individualEntries.push([
        (index + 1).toString(),
        entry.name,
        entry.project,
        TimeFormat.fromS(entry.hours, 'hh:mm')
      ]);
    });

    if (lodash.size(result) > 0) {
      if (conv.screen) {
        conv.ask(
          `Seems some of your team members has not filled the time sheet. Here is the list`
        );
        conv.ask(
          new Table({
            dividers: true,
            columns: ["S.No", "Name"],
            rows: unfilledNames
          })
        );
      }
    } else {
      conv.ask('Great! Everyone in your team has filled the time sheet.');
    }
    conv.ask(new Suggestions(["View entries", "Exit"]));
  } else {
    conv.ask(`Oops! No one has made entries today`);
    conv.ask(new Suggestions(["Yesterday entries", "Projects", "Team", "Exit"]));
  }
});

app.intent("Default Welcome Intent - Yesterday entries", conv => {
  const yesterdayDate = moment()
    .subtract(1, "day")
    .format("M/D/YYYY");
  let entries = [];
  let entryNames = [];
  let allEntries = [];
  individualEntries = [];

  lodash.map(users, user => {
    if (lodash.includes(user[0], yesterdayDate)) {
      entries.push(user);
      entryNames.push(user[1]);
      allEntries.push({ name: user[1], project: user[2], hours: moment.duration(user[4]).asSeconds() });
    }
  });

  if (lodash.size(entries) > 0) {
    let filteredNames = lodash.uniq(names);
    let filteredEntryNames = lodash.uniq(entryNames);

    const result = lodash.differenceWith(
      filteredNames,
      filteredEntryNames,
      lodash.isEqual
    );
    const sortedResult = result.sort();

    const unfilledNames = lodash.map(sortedResult, (name, index) => {
      return [(index + 1).toString(), name];
    });

    lodash.map(allEntries, (entry, index) => {
      individualEntries.push([
        (index + 1).toString(),
        entry.name,
        entry.project,
        TimeFormat.fromS(entry.hours, 'hh:mm')
      ]);
    });

    if (lodash.size(result) > 0) {
      if (conv.screen) {
        conv.ask(
          `Seems some of your team mates has not filled the time sheet. Here is the list`
        );
        conv.ask(
          new Table({
            dividers: true,
            columns: ["S.No", "Name"],
            rows: unfilledNames
          })
        );
      }
    } else {
      conv.ask('Great! Everyone in your team has filled the time sheet.');
    }
    conv.ask(new Suggestions(["View entries", "Exit"]));
  } else {
    conv.ask(`Oops! No one has made entries yesterday`);
    conv.ask(new Suggestions(["Todays entries", "Projects", "Team", "Exit"]));
  }
});

app.intent("Default Welcome Intent - Todays entries - View entries", conv => {
  conv.ask(`Here is the entries made by coding town team today`);
  conv.ask(
    new Table({
      dividers: true,
      columns: ["S.No", "Name", "project", "Total.Hrs"],
      rows: individualEntries,
      buttons: new Button({
        title: "View Sheet",
        url: constants.SPREAD_SHEET_URL
      })
    })
  );
  conv.ask(new Suggestions(["Yesterday entries", "Team", "Projects", "Exit"]));
});

app.intent(
  "Default Welcome Intent - Yesterday entries - View entries",
  conv => {
    conv.ask(`Here is the entries made by coding town team yesterday`);
    conv.ask(
      new Table({
        dividers: true,
        columns: ["S.No", "Name", "project", "Total.Hrs"],
        rows: individualEntries,
        buttons: new Button({
          title: "View Sheet",
          url: constants.SPREAD_SHEET_URL
        })
      })
    );
    conv.ask(new Suggestions(["Todays entries", "Team", "Projects", "Exit"]));
  }
);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
