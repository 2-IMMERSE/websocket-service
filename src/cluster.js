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

const url = require('url');
const adapter = require('socket.io-redis');
const redis = require('redis');
const Server = require('./server.js');

class Cluster extends Server {
  constructor(opts = {}) {
    super(opts);
  }

  listen() {
    this.logger.info("Waiting for Redis...");

    this._configureRedis(() => {
      // set clients to access redis
      this.clients = this.client;

      super.listen();
    });
  }

  _configureRedis(callback) {
    if (this.opts.redis.indexOf(':') == -1) {
      let consulURL = url.parse(this.opts.consul);
      let consulConfig = {
        host: consulURL.hostname,
        port: consulURL.port,
        secure: consulURL.protocol == 'https:',
        rejectUnauthorized: false
      };

      this.logger.debug('Looking up redis service (' + this.opts.redis + ')...', consulConfig);

      let consul = require('consul')(consulConfig);

      consul.catalog.service.nodes(this.opts.redis, (err, res) => {
        if (err) {
          this.logger.error(err);
        }

        if (typeof res == "undefined" || res.length == 0 || err) {
          this.logger.error("Redis service not found");
          process.exit();
        }

        this._createClient(res[0].ServiceAddress, res[0].ServicePort);

        callback && callback();
      });
    } else {
      let [host, port] = this.opts.redis.split(':');

      this._createClient(host, port);

      callback && callback();
    }
  }

  _createClient(host, port) {
    let config = {
      host: host,
      port: port,
      db: this.opts.db
    };

    this.logger.debug('Connecting to redis...', config);

    this.client = redis.createClient(config);
    this.pubClient = redis.createClient(config);
    this.subClient = redis.createClient(config)

    this.io.adapter(adapter({
      pubClient: this.pubClient,
      subClient: this.subClient
    }));
  }

  // we duplicate the normal server methods here
  // this is because the cluster adapter api isn't the same
  _onJoin(socket, data, ack) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }


    if (!req.name) {
      return;
    }

    socket.adapter.remoteJoin(socket.id, req.room, (err) => {
      if (err) throw err;

      'function' === typeof ack && ack();

      this.clients.set(socket.id, req.name, () => {
        this.logger.debug('JOIN: ' + socket.id + ' == ' + req.name);
      });
    });
  }

  _onLeave(socket, data) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    if (!req.room) {
      return;
    }

    socket.adapter.remoteLeave(socket.id, req.room, (err) => {
      if (err) throw err;

      'function' === typeof ack && ack();

      this.logger.debug('LEAVE: ' + socket.id + ' has left ' + req.room);
    });
  }

  _onNotify(socket, data) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    this.clients.get(socket.id, (err, sender) => {
      if (err) throw err;

      this._sendToRoom(socket, req.room, req.message, sender);
    });
  }

  _sendToRoom(socket, room, message, sender = 'unknown') {
    if (sender == null) {
      sender = 'unknown';
    }

    socket.broadcast.to(room).emit('EVENT', {
      sender: sender,
      room: room,
      message: message
    });

    this.logger.debug('NOTIFY: ' + room + ' => ' + message);
  }

  _onClients(socket, data) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    if (!req.room) {
      return;
    }

    this.io.of(socket.nsp.name).adapter.clients([req.room], (err, ids) => {
      let batch = ids.map((id) => {
        return ['get', id];
      });

      this.clients.batch(batch).exec((err, clients) => {
        if (err) throw err;

        socket.emit('CLIENTS', {
          room: req.room,
          clients: clients
        });
      });
    });
  }

  _onDisconnect(socket) {
    this.clients.del(socket.id, (err) => {
      if (err) throw err;

      this.logger.debug('DISCONNECT: ' + socket.id);
    });
  }
}

exports = module.exports = Cluster;
