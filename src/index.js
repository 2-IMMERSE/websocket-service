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

const commander = require('commander');
const Server = require('./server.js');
const Cluster = require('./cluster.js');

commander
  .option('-p, --port <port>', 'Port to listen on', 3000)
  .option('-S, --https', 'Support HTTPS with self-signed certificate')
  .option('-r, --redis <service>', 'Redis service to use for websocket persistance. Use [host:port] for local services')
  .option('-d, --database <db>', 'Redis db to use for client persistance', 0)
  .option('-c, --consul-host <host>', 'Consul host', 'https://consul.service.consul:8500')
  .option('-v, --verbose', 'Verbose logging', false)
  .parse(process.argv);

const opts = {
  logLevel: commander.verbose ? 'DEBUG' : 'INFO',
  https: commander.https,
  redis: commander.redis,
  db: commander.database,
  consul: commander.consulHost,
  port: commander.port
};

let server;
if (commander.redis) {
  server = new Cluster(opts);
} else {
  server = new Server(opts);
}

server.listen();
