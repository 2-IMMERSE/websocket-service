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

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const redis = require('socket.io-redis');
const bodyParser = require('body-parser')
const Logger = require('./logger.js');
const Lobby = require('./lobby.js');
const Trigger = require('./trigger.js');

class Server {
  constructor(opts = {}) {
    this.log = new Logger();

    // defaults
    this.opts = Object.assign(this.defaults, opts);

    // create logger
    this.logger = new Logger(this.opts.logLevel, this.opts.logName);

    this._createApplication();
  }

  get defaults() {
    return {
      logLevel: 'INFO',
      port: 3000,
      https: false,
      keyPath: path.resolve(__dirname, '../certs/server.pem'),
      certPath: path.resolve(__dirname, '../certs/server.crt')
    };
  }

  listen() {
    this._registerListeners();

    // healthcheck endpoint
    this.app.get('/healthcheck', (req, res) => {
      res.send('OK');
    });

    // general bus endpoint
    this.app.post('/bus-message/:roomId', bodyParser.json(), (req, res) => {
      if (!req.body) return res.sendStatus(400);
      this.busNamespace.to(req.params.roomId).emit('EVENT', {
        sender: 'POST',
        room: req.params.roomId,
        message: req.body
      });

      this.logger.debug('HTTP POST NOTIFY: ' + req.params.roomId + ' => ' + req.body);
      res.send('OK');
    });

    this.server.listen(this.opts.port, () => {
      this.logger.info("Listening on port " + (this.opts.https ? 'HTTPS' : 'HTTP') + '/' + this.opts.port);
    });
  }

  _createApplication() {
    this.app = require('express')();

    if (this.opts.https) {
      this.server = require('https').createServer({
        key: fs.readFileSync(this.opts.keyPath),
        cert: fs.readFileSync(this.opts.certPath)
      }, this.app);
    } else {
      this.server = require('http').Server(this.app);
    }

    this.io = require('socket.io')(this.server);
  }

  _registerListeners() {
    this.io.on('connect_error', this.logger.error);

    const layoutClients = {};
    this.io.of('/layout').on('connection', (socket) => {
      this._onConnect(socket, layoutClients);
    });

    const busClients = {};
    this.busNamespace = this.io.of('/bus');
    this.busNamespace.on('connection', (socket) => {
      this._onConnect(socket, busClients);
    });

    const lobby = new Lobby(this.logger);
    lobby.connect(this.io);

    const trigger = new Trigger(this.logger);
    trigger.connect(this.io);
  }

  _onConnect(socket, nspClients) {
      
    socket.on('error', (error) => {
        this.logger.error('error', error);
    });
    
    socket.on('disconnecting', (reason) => {
      this.logger.debug('disconnecting', reason);
    });
    
    socket.on('JOIN', (data, ack) => {
      this.logger.debug('JOIN', {
        id: socket.id,
        data: data
      });

      this._onJoin(socket, data, ack, nspClients);
    });

    socket.on('LEAVE', (data, ack) => {
      this.logger.debug('LEAVE', {
        id: socket.id,
        data: data
      });

      this._onLeave(socket, data, ack);
    });

    socket.on('NOTIFY', (data) => {
      this.logger.debug('NOTIFY', {
        id: socket.id,
        data: data
      });

      this._onNotify(socket, data, nspClients);
    });

    socket.on('CLIENTS', (data) => {
      this.logger.debug('CLIENTS', {
        id: socket.id,
        data: data
      });

      this._onClients(socket, data, nspClients);
    });

    socket.on('disconnect', () => {
      this._onDisconnect(socket, nspClients);
    });
  }

  _onJoin(socket, data, ack, nspClients) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    if (!req.name) {
      return;
    }

    socket.join(req.room);
    nspClients[socket.id] = req.name;

    'function' === typeof ack && ack();

    this.logger.debug('JOIN: ' + socket.id + ' == ' + req.name);
  }

  _onLeave(socket, data, ack) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    if (!req.room) {
      return;
    }

    socket.leave(req.room);

    'function' === typeof ack && ack();

    this.logger.debug('LEAVE: ' + socket.id + ' has left ' + req.room);
  }

  _onNotify(socket, data, nspClients) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    socket.broadcast.to(req.room).emit('EVENT', {
      sender: nspClients.hasOwnProperty(socket.id) ? nspClients[socket.id] : 'unknown',
      room: req.room,
      message: req.message
    });

    this.logger.debug('NOTIFY: ' + req.room + ' => ' + req.message);
  }

  _onClients(socket, data, nspClients) {
    try {
      var req = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return;
    }

    this.io.of(socket.nsp.name).in(req.room).clients((err, ids) => {
      if (err) throw err;

      let clients = Object.keys(nspClients).map((id) => {
        return nspClients[id];
      });

      socket.emit('CLIENTS', {
        room: req.room,
        clients: clients
      });

      this.logger.debug('CLIENTS: ', clients);
    })
  }

  _onDisconnect(socket, nspClients) {
    delete nspClients[socket.id];
    this.logger.debug('DISCONNECT: ' + socket.id);
  }
}

exports = module.exports = Server;
