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

// @ts-check
'use strict';

class Trigger {
  constructor(logger) {
    this.logger = logger;
  }

  connect(io) {
    io.of('/trigger').on('connection', (socket) => {
      this._onConnect(socket);
    });
  }

  _onConnect(socket) {
    socket.on('JOIN', (id, ack) => {
      socket.documentid = id;
      this._onJoin(socket, id, ack);
    });

    socket.on('LEAVE', (id, ack) => {
      socket.documentid = undefined;
      this._onLeave(socket, ack);
    });

    socket.on('BROADCAST_EVENTS', (id, data) => {
      this._onEvents(socket, id, data);
    });

    socket.on('BROADCAST_UPDATES', (id, data) => {
      this._onUpdates(socket, id, data);
    });

    socket.on('BROADCAST_STATUS', (id, data) => {
      this._onStatus(socket, id, data);
    });
  }

  _onJoin(socket, id, ack) {
    socket.join(id, () => {
      this.logger.debug("Client " + socket.id + " joined channel " + id);
      'function' === typeof ack && ack();
    });
  }

  _onLeave(socket, id, ack) {
    socket.leave(id, () => {
      this.logger.debug("Client " + socket.id + " left channel " + id);
      'function' === typeof ack && ack();
    });
  }

  _onEvents(socket, id, data) {
    this.logger.debug("Forwarding event data to channel " + id);
    socket.to(id).emit("EVENTS", data);
  }

  _onUpdates(socket, id, data) {
    this.logger.debug("Forwarding update data to channel " + id);
    socket.to(id).emit("UPDATES", data);
  }

  _onStatus(socket, id, data) {
    this.logger.debug("Forwarding status data to channel " + id);
    socket.to(id).emit("STATUS", data);
  }
}

exports = module.exports = Trigger;
