const iconv = require('iconv-lite');
const encodings = require('iconv-lite/encodings');

iconv.encodings = encodings;

const express = require('express');
const bodyparser = require('body-parser');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const db = require('../db/index');

const schema = buildSchema(`
  type Query {
    hello(data: String!): String,
    sup: Int,
    rollDice(numDice: Int!, numSides: Int): [Int],
    getAlerts: String
  }
  type Mutation {
    createPerson(name: String, age: Int) : Person!
  }

  type Person {
    name: String!,
    age: Int!
  }
`);

const root = {
  hello: ({ data }) => {
    return ((data) => {
      console.log(data);
      return data;
    })(data);
  },
  sup: () => 1 + 1,
  rollDice: ({ numDice, numSides }) => {
    const output = [];
    for (let i = 0; i < numDice; i += 1) {
      output.push(1 + Math.floor(Math.random() * (numSides || 6)));
    }
    return output;
  },
  createPerson: ({ name, age }) => {
    const person = new Person();
    person.name = name;
    person.age = age;
  },
  getAlerts: () => {
    return db.getAlerts().then((alerts) => {
      return JSON.stringify((alerts.map(alert => alert.dataValues)));
    });
  },
};


const app = express();

app.use(bodyparser.json());
app.use(express.static(`${__dirname}/../client/dist`));
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true,
}));

// app.get('/api/feed', (req, res) => {
//   db.getAlerts().then((alerts) => {
//     res.status(200).send(alerts.map(alert => alert.dataValues));
//   });
// });

app.get('/api/coordinates', (req, res) => {
  console.log('grabbing coordinates...');
  db.getCoordinates().then((coordinates) => {
    res.status(201).send(coordinates.map(data => data.dataValues));
  });
});

app.get('/api/media', (req, res) => {
  console.log('grabbing media files...');
  db.getMedia().then((files) => {
    res.status(201).send(files.map(data => data.dataValues));
  });
});

app.post('/api/events', (req, res) => {
  const {
    latitude, longitude, category, timeStamp,
  } = req.body;
  // console.log(latitude, longitude, category, timeStamp);
  db.findOrCreateEvent(category, latitude, longitude, timeStamp)
    .then((event) => { // the result will be the event object that was just created
      console.log('server returns: ', event);
      res.send(event);
    });
});

app.post('/api/alerts', (req, res) => {
//   console.log(req.body);
  const {
    EventId, category, latitude, longitude, notes, photo, photoTag,
  } = req.body;

  db.createAlert(EventId, category, latitude, longitude, notes, photo, photoTag)
    .then(db.getAlerts)
    .then((alerts) => {
      res.status(201).send(alerts.map(alert => alert.dataValues));
    });
});

module.exports = app;