const db = require('./db');

class Server {
  _connectedClients = new Map();

  constructor(players) {
    this._players = players;
  }

  listen(io) {
    io.on('connection', socket => {
      console.log(`${socket.handshake.address}: connecting client...`);

      // cliendId is abstract client identifier.
      // It can be anything from player identity to transient
      // short-term user authentication token.
      //
      // Once real authentication model is in place,
      // authentication will be done by angular side
      // and user token will be provided here.
      //
      // Or it can always be a string concatenation of login and password.
      socket.on('auth', clientId => {
        console.log(`${socket.handshake.address}: authentication request received with client ID ${clientId}.`);

        if (!clientId) {
          socket.disconnect();
          console.log(`${socket.handshake.address}: client did not send a valid client ID. Disconnected.`);
          return;
        }

        if (this._connectedClients.has(clientId)) {
          socket.disconnect();
          console.log(`${clientId}: tried to connect again. Disconnected.`);
          return;
        }

        const player = this._players.findByClientId(clientId);
        if (!player) {
          socket.disconnect();
          console.log(`${clientId}: player with this client ID is not found. Disconnected.`);
          return;
        }

        this._setupCommands(clientId, socket);
        this._connectedClients.set(clientId, socket);

        console.log(`${clientId}: connected from ${socket.handshake.address}.`);

        const position = this._getUniquePlayerPosition(player);
        this._sendUpdateToPosition(position);

        socket.on('disconnect', () => {
          this._connectedClients.delete(clientId);
          console.log(`${clientId}: disconnected.`);

          const disconnectedPlayer = this._players.findByClientId(clientId);
          const disconnectedPlayerPosition = this._getUniquePlayerPosition(disconnectedPlayer);
          this._sendUpdateToPosition(disconnectedPlayerPosition);
        });
      });
    });
  }

  // Returns a unique identifier of the 'position' (room, location, road)
  // where player is located.
  // Players with the same 'position' can see each other.
  _getUniquePlayerPosition(player) {
    if (player.roadId) {
      const road = db.roads.find(r => r.roadId == player.roadId);

      if (!road.backwardRoadId) {
        return `r${road.roadId}_`;
      }

      if (road.roadId < road.backwardRoadId) {
        return `r${road.roadId}_${road.backwardRoadId}`;
      }

      return `r${road.backwardRoadId}_${road.roadId}`;
    }

    return `l${player.locationId}`;
  }

  // Builds and sends updated state for every player at given location.
  _sendUpdateToPosition(position) {
    this._connectedClients.forEach((socket, clientId) => {
      const player = this._players.findByClientId(clientId);
      const playerPosition = this._getUniquePlayerPosition(player);

      if (playerPosition != position) {
        return;
      }

      const state = this._makeState(clientId);
      socket.emit('state', state);

      console.log(`Sent state update to ${clientId}.`);
      console.log(state);
    })
  }

  _setupCommands(clientId, socket) {
    console.log(`Setting up command handlers for ${clientId}.`);

    socket.on('enterLocation', locationId => {
      const player = this._players.findByClientId(clientId);
      const previousPosition = this._getUniquePlayerPosition(player);

      if (player.locationId == locationId) {
        console.log(`${clientId} tried to go to location ${locationId} but already at this location. Aborted.`);
        return;
      }

      const location = db.locations.find(location => location.locationId == player.locationId);
      if (!location.locations || !location.locations.includes(locationId)) {
        console.log(`${clientId} can't go to location ${locationId} from ${player.locationId}.`);
        return;
      }

      player.locationId = locationId;
      this._players.save(player);
      console.log(`${clientId} moved to location ${locationId}.`);

      const currentPosition = this._getUniquePlayerPosition(player);
      this._sendUpdateToPosition(previousPosition);
      this._sendUpdateToPosition(currentPosition);
    });

    socket.on('enterRoad', roadId => {
      const player = this._players.findByClientId(clientId);
      const previousPosition = this._getUniquePlayerPosition(player);

      if (player.roadId) {
        console.log(`${clientId} tried to enter road ${roadId} while already being on the road ${player.roadId}. Aborted.`);
        return;
      }

      const road = db.roads.find(road => road.roadId == roadId);
      if (road.fromLocationId != player.locationId) {
        console.log(`${clientId} cannot move to road ${roadId} from location ${player.locationId}. Aborted.`);
        return;
      }

      player.roadId = roadId;
      player.movementProgress = 0;
      this._players.save(player);
      console.log(`${clientId} moved to road ${roadId}.`);

      const currentPosition = this._getUniquePlayerPosition(player);
      this._sendUpdateToPosition(previousPosition);
      this._sendUpdateToPosition(currentPosition);
    });

    socket.on('move', distance => {
      const player = this._players.findByClientId(clientId);
      const previousPosition = this._getUniquePlayerPosition(player);

      if (!player.roadId) {
        console.log(`${clientId} is not at any road and tried to move. Aborted.`);
        return;
      }

      const road = db.roads.find(road => road.roadId == player.roadId);

      player.movementProgress += distance;

      if (player.movementProgress > road.distance) {
        player.roadId = undefined;
        player.movementProgress = undefined;
        player.locationId = road.toLocationId;
        console.log(`${clientId} arrived at location ${player.locationId}.`);
      }

      this._players.save(player);

      const currentPosition = this._getUniquePlayerPosition(player);
      this._sendUpdateToPosition(currentPosition);

      if (previousPosition != currentPosition) {
        this._sendUpdateToPosition(previousPosition);
      }
    });

    socket.on('turnAround', () => {
      const player = this._players.findByClientId(clientId);
      const previousPosition = this._getUniquePlayerPosition(player);

      if (!player.roadId) {
        console.log(`${clientId} is not at any road to turn around. Aborted.`);
        return;
      }

      const road = db.roads.find(road => road.roadId == player.roadId);

      if (!road.backwardRoadId) {
        console.log(`${clientId} cannot turn around on road ${road.roadId} because it doesn't have a way back. Aborted.`);
        return;
      }

      if (player.movementProgress == 0) {
        player.roadId = undefined;
        player.movementProgress = undefined;
        console.log(`${clientId} returned to his location ${player.locationId} because he did not move.`);
      }
      else {
        const newRoad = db.roads.find(x => x.roadId == road.backwardRoadId);

        // Recalculate movement progress.
        const oldDistance = road.distance;
        const oldProgress = player.movementProgress;
        const newDistance = newRoad.distance;
        const newProgress = Math.floor(newDistance - newDistance * oldProgress / oldDistance);
        if (newProgress == 0) {
          newProgress = 1;
        }

        player.roadId = road.backwardRoadId;
        player.movementProgress = newProgress;

        console.log(`${clientId} turned around. Now at road ${player.roadId}.`);
      }

      this._players.save(player);

      const currentPosition = this._getUniquePlayerPosition(player);
      this._sendUpdateToPosition(currentPosition);

      if (previousPosition != currentPosition) {
        this._sendUpdateToPosition(previousPosition);
      }
    });
  }

  _makeState(clientId) {
    const player = this._players.findByClientId(clientId);
    const playerPosition = this._getUniquePlayerPosition(player);
    let playersHere = Array.from(this._connectedClients.keys()).filter(id => {
      const otherPlayer = this._players.findByClientId(id);
      const otherPlayerPosition = this._getUniquePlayerPosition(otherPlayer);

      return playerPosition == otherPlayerPosition;
    });

    if (player.roadId) {
      const road = db.roads.find(r => r.roadId == player.roadId);

      playersHere = playersHere.map(id => {
        const otherPlayer = this._players.findByClientId(id);
        const otherPlayerRoad = db.roads.find(r => r.roadId == otherPlayer.roadId);

        let otherPlayerMovementProgress = otherPlayer.movementProgress / otherPlayerRoad.distance * 100;
        if (player.roadId != otherPlayer.roadId) {
          otherPlayerMovementProgress = 100 - otherPlayerMovementProgress;
        }
        otherPlayerMovementProgress = Math.floor(otherPlayerMovementProgress);

        return {
          clientId: otherPlayer.clientId,
          movementProgress: otherPlayerMovementProgress
        };
      });
    } else {
      playersHere = playersHere.map(id => {
        return {
          clientId: id
        };
      });
    }

    return {
      locationId: player.locationId,
      roadId: player.roadId,
      playersHere: playersHere
    };
  }
}

module.exports = Server;
