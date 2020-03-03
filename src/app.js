const app = require('express')();
app.listen(30200, () => {
  console.log("DB API is running on port 30200.");
});
setupApi();

const http = require('http').Server(app);
const io = require('socket.io')(http);

const PlayerRepository = require('./player.repository');
const players = new PlayerRepository();
players.load();
const persistence = setInterval(() => {
  players.persist();
}, 1000);

const Server = require('./server');
const server = new Server(players);

server.listen(io);
http.listen(30100);

function setupApi() {
  const db = require('./db');

  // Making DB safe.
  db.locations.forEach(l => {
    if (!l.locations) {
      l.locations = [];
    }
  });

  app.get('/db', (req, res) => {
    res.json(db);
  });

  app.get('/locations/:locationId', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    const location = db.locations.find(l => l.locationId == req.params.locationId);

    const locations = location.locations.map(locationId => {
      const l = db.locations.find(x => x.locationId == locationId);

      return {
        locationId: l.locationId,
        name: l.name,
        description: l.description
      };
    });

    const roads = db.roads.filter(road => road.fromLocationId == location.locationId).map(road => {
      return {
        roadId: road.roadId,
        name: road.name,
        description: road.description
      };
    });

    res.json({
      name: location.name,
      description: location.description,
      locations: locations,
      roads: roads
    });
  });

  app.get('/roads/:roadId', (req, res) => {
    const road = db.roads.find(road => road.roadId == req.params.roadId);

    const fromLocation = db.locations.find(location => location.locationId == road.fromLocationId);
    const toLocation = db.locations.find(location => location.locationId == road.toLocationId);

    res.json({
      name: road.name,
      description: road.description
    });
  });

  app.get('/texts/:length', (req, res) => {
    const text = 'We believe that we can change the things around us in accordance with our desires—we believe it because otherwise we can see no favourable outcome. We do not think of the outcome which generally comes to pass and is also favourable: we do not succeed in changing things in accordance with our desires, but gradually our desires change. The situation that we hoped to change because it was intolerable becomes unimportant to us. We have failed to surmount the obstacle, as we were absolutely determined to do, but life has taken us round it, led us beyond it, and then if we turn round to gaze into the distance of the past, we can barely see it, so imperceptible has it become';

    res.json(text.substr(0, req.params.length));
  });

  app.get('/phrase', (req, res) => {
    res.json('phrase');
  });
}
