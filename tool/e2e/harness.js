#!/usr/bin/env node
'use strict';
// Starts, on loopback only:
//   * a fake emulator gateway   (HTTP, /api/state)
//   * an sshd                   (password auth, direct-tcpip allowed)
//   * a hub that speaks the ws-cf-tunnel /connect protocol and pipes every
//     client straight to the sshd (hub + agent collapsed into one process)
// and prints one JSON line with the settings a client needs.
const http = require('node:http');
const net = require('node:net');
const { Server } = require('ssh2');
const { utils } = require('ssh2');
const { WebSocketServer } = require('ws');

const AUTH_TOKEN = 'e2e-client-token';
const SERVER_ID = 'e2e-server';
const USER = 'tester';
const PASS = 'p@ss w0rd';

const gateway = http.createServer((req, res) => {
  if (req.url.startsWith('/api/state')) {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ ok: true, host: req.headers.host }));
  }
  res.statusCode = 404;
  res.end('not found');
});

const hostKey = utils.generateKeyPairSync('ed25519').private;
const sshd = new Server({ hostKeys: [hostKey] }, (client) => {
  client.on('authentication', (ctx) => {
    if (ctx.method === 'password' && ctx.username === USER && ctx.password === PASS) return ctx.accept();
    ctx.reject(['password']);
  });
  client.on('ready', () => {
    client.on('tcpip', (accept, reject, info) => {
      if (info.destIP !== '127.0.0.1' || info.destPort !== gateway.address().port) return reject();
      const ch = accept();
      const up = net.connect(info.destPort, '127.0.0.1');
      ch.pipe(up).pipe(ch);
      ch.on('close', () => up.destroy());
      up.on('close', () => ch.close());
      up.on('error', () => ch.close());
    });
  });
  client.on('error', () => {});
});

const hub = http.createServer((_, res) => { res.statusCode = 426; res.end(); });
const wss = new WebSocketServer({ noServer: true });
hub.on('upgrade', (req, socket, head) => {
  const refuse = (code) => { socket.write(`HTTP/1.1 ${code} X\r\nConnection: close\r\n\r\n`); socket.destroy(); };
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/connect') return refuse(404);
  if (req.headers.authorization !== `Bearer ${AUTH_TOKEN}`) return refuse(403);
  if (req.headers['x-server-id'] !== SERVER_ID) return refuse(503);
  wss.handleUpgrade(req, socket, head, (ws) => {
    const tcp = net.connect(sshd.address().port, '127.0.0.1');
    tcp.setNoDelay(true);
    ws.on('message', (data, isBinary) => {
      if (isBinary) tcp.write(data);
      else if (data.toString() === 'fin') tcp.end();
    });
    tcp.on('data', (d) => ws.send(d, { binary: true }));
    tcp.on('close', () => ws.close(1000, 'target closed'));
    tcp.on('error', () => ws.close(1011, 'error'));
    ws.on('close', () => tcp.destroy());
  });
});

const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', r));
(async () => {
  await listen(gateway);
  await listen(sshd);
  await listen(hub);
  console.log(JSON.stringify({
    tunnelUrl: `ws://127.0.0.1:${hub.address().port}`,
    authToken: AUTH_TOKEN,
    serverId: SERVER_ID,
    sshUser: USER,
    sshPassword: PASS,
    remotePort: gateway.address().port,
  }));
})();
process.on('SIGTERM', () => process.exit(0));
