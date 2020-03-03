const fs = require('fs');

class PlayerRepository {
  _needsPersisting = false;
  _players = new Map();

  findByClientId(clientId) {
    if (!this._players.has(clientId)) {
      this._players.set(clientId, {
        clientId: clientId,
        name: clientId,
        locationId: 1
      });
    }
 
    return this._players.get(clientId);
  }

  save(player) {
    this._players.set(player.clientId, player);

    this._needsPersisting = true;
  }

  load() {
    const content = fs.readFileSync('db.json');
    const players = JSON.parse(content);

    this._players = new Map();
    players.forEach(p => {
      this._players.set(p.clientId, p);
    });
  }

  persist() {
    if (!this._needsPersisting) {
      return;
    }

    const content = JSON.stringify(Array.from(this._players.values()));
    fs.writeFile("db.json", content, 'utf8', err => {
      if (err) {
        console.log('An error occurred when trying to persist players to disk.');
        return console.log(err);
      }

      // TODO: Make an observable, sublcribe and debounce. It's safer.
      this._needsPersisting = false;
      console.log('Players have been successfully persisted to disk.');
    });
  }
}

module.exports = PlayerRepository;
