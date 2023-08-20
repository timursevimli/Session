'use strict';

const http = require('node:http');

const Client = require('./client.js');
const Session = require('./session.js');

const routing = {
  '/': async () => '<h1>welcome to homepage</h1><hr>',
  '/start': async (client) => {
    Session.start(client);
    return `Session token is: ${client.token}`;
  },
  '/destroy': async (client) => {
    const { token } = await Session.delete(client);
    return token ? `Session destroyed: ${token}` : 'Session not found!';
  },
  '/api/method1': async (client) => {
    if (client.session) {
      client.session.set('method1', 'called');
      return { data: 'example result' };
    } else {
      return { data: 'access is denied' };
    }
  },
  '/api/method2': async (client) => {
    if (client.session) client.session.set('method2', 'called');
    return {
      url: client.req.url,
      headers: client.req.headers,
    };
  },
  '/api/method3': async (client) => {
    if (!client.session) return 'No session found';
    client.session.set('method3', 'called');
    return [...client.session.entries()]
      .map(([key, value]) => `<b>${key}</b>: ${value}<br>`)
      .join();
  }
};

const types = {
  object: JSON.stringify,
  string: (s) => s,
  number: (n) => n.toString(),
  undefined: () => 'not found',
};

const httpError = (res, code, msg) => {
  res.statusCode = code;
  res.end(msg);
};

http.createServer(async (req, res) => {
  const client = await Client.getInstance(req, res);
  const { method, url, headers } = req;
  console.log(`${method} ${url} ${headers.cookie}`);
  const handler = routing[url];
  res.on('finish', () => {
    if (client.session) client.session.save();
  });
  if (!handler) return void httpError(res, 404, 'Not Found 404');
  handler(client)
    .then(
      (data) => {
        const type = typeof data;
        const serializer = types[type];
        const result = serializer(data);
        client.sendCookie();
        res.end(result);
      },
      (err) => {
        httpError(res, 500, 'Server Error 500');
        console.log(err);
      }
    );
}).listen(8000);
