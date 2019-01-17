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

const log4js = require('log4js');

class Logger {
  constructor(level = 'INFO') {
    let source = process.env.LOG_NAME || 'WebsocketServiceTest';

    log4js.configure({
      appenders: [
        {
          type: 'console',
          ws: {
            type: 'pattern',
            pattern: '2-Immerse subSource:%c level:%p %m sourcetime:%d{ISO8601_WITH_TZ_OFFSET} source:' + source,
          }
        }
      ],
      levels: {
        ws: level
      },
      replaceConsole: true
    });

    this.logr = log4js.getLogger('ws');
  }

  debug(msg, data = {}) {
    this.logr.debug(this._format(msg, data));
  }

  info(msg, data = {}) {
    this.logr.info(this._format(msg, data));
  }

  error(msg, data = {}) {
    this.logr.error(this._format(msg, data));
  }

  _format(msg, data = {}) {
    if (msg instanceof Error) {
      msg = msg.stack;
    }

    let prefix = "";
    Object.keys(data).forEach((key) => {
      prefix += " " + key + ":" + JSON.stringify(data[key]) + " ";
    });

    return prefix + "logmessage:'" + msg.toString().replace(/'/g, "\"") + "'";
  }
}

exports = module.exports = Logger;
