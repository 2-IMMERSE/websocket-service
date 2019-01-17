/*
Copyright [2018] [Cisco and/or its affiliates]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

class Lobby {
  constructor(logger) {
    this.logger = logger;
  }

  connect(io) {
    io.of('/lobby').on('connection', (socket) => {
      this._onConnect(socket);
    });
  }

  _onConnect(socket) {
    let req = socket.request.query;

    socket.userName = socket.request.userName ? socket.request.username : 'guest';

    if (!req.lobbyId) {
      socket.disconnect(0);
    } else {
      socket.on('JOIN', (id, ack) => {
        this._onJoin(socket, id, ack);
      });

      socket.on('LEAVE', (id, ack) => {
        this._onLeave(socket);
      });

      socket.on('BROADCAST', (msg) => {
        this._onBroadcast(socket, msg);
      });

      socket.on('RTCSIGNAL', (msg) => {
        this._onRTCSignal(socket, msg);
      });

      this._onJoin.call(this, socket, req.lobbyId, (err) => {
        if (!err) {
          socket.nsp.in(req.lobbyId).clients((err, ids) => {
            ids.splice(ids.indexOf(socket.id), 1);

            socket.emit('PEERS', (err) ? [] : ids);
          })
        }
      });

      socket.on('disconnect', () => {
        if (socket.currentLobbyid) {
          this._onLeave.call(this, socket, socket.currentLobbyId);
        }
      });
    }
  }

  _onJoin(socket, id, ack) {
    if (socket.currentLobbyId) {
      let err = new Error('ERROR: Cannot join lobby ' + id + ', ' + socket.id
          + ' is already a member of lobby ' + socket.currentLobbyId);
      'function' === typeof ack && ack();
    } else {
      socket.join(id, (err) => {
        if (err) {

        } else {
          socket.currentLobbyId = id;
          socket.nsp.in(id).emit('JOINED', socket.id);
        }

        'function' === typeof ack && ack();
      });
    }
  }

  _onLeave(socket, id, ack) {
    if (!socket.currentLobbyId || socket.currentLobbyId !== id) {
      let err = new Error('ERROR: ' + socket.id + ' is not a member of lobby ' + id);
      'function' === typeof ack && ack();
    } else {
      socket.leave(id, (err) => {
        if (err) {

        } else {
          socket.currentLobbyId = null;
          socket.nsp.in(id).emit('LEFT', socket.id);
        }
        'function' === typeof ack && ack();
      })
    }
  }

  _onBroadcast(socket, msg) {
    socket.nsp.in(sg.lobbyId).emit('MESSAGE', {
      from: socket.id,
      message: msg.message
    });
  }

  _onRTCSignal(socket, msg) {
    socket.broadcast.to(msg.to).emit('RTCSIGNAL', msg);
  }
}

exports = module.exports = Lobby;
