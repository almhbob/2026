import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createSignalingServer } from './server.js';

function startServer() {
  const wss = createSignalingServer(0);
  return new Promise((resolve) => {
    wss.once('listening', () => resolve({ wss, port: wss.address().port }));
  });
}

function connect(port) {
  return new WebSocket(`ws://127.0.0.1:${port}`);
}

function nextMessage(ws) {
  return new Promise((resolve) => {
    ws.once('message', (raw) => resolve(JSON.parse(String(raw))));
  });
}

function closeAll(...sockets) {
  for (const ws of sockets) ws.close();
}

test('host and viewer can join the same session code', async () => {
  const { wss, port } = await startServer();
  try {
    const host = connect(port);
    await new Promise((resolve) => host.once('open', resolve));
    host.send(JSON.stringify({ type: 'join', role: 'host', code: '123456' }));
    const hostReply = await nextMessage(host);
    assert.deepEqual(hostReply, { type: 'joined', role: 'host', code: '123456' });

    const viewer = connect(port);
    await new Promise((resolve) => viewer.once('open', resolve));
    const hostSeesPeer = nextMessage(host);
    viewer.send(JSON.stringify({ type: 'join', role: 'viewer', code: '123456' }));
    const viewerReply = await nextMessage(viewer);
    assert.deepEqual(viewerReply, { type: 'joined', role: 'viewer', code: '123456' });
    assert.deepEqual(await hostSeesPeer, { type: 'peer_joined', role: 'viewer' });

    closeAll(host, viewer);
  } finally {
    wss.close();
  }
});

test('a second device cannot silently join as an extra viewer of the same session', async () => {
  const { wss, port } = await startServer();
  try {
    const host = connect(port);
    await new Promise((resolve) => host.once('open', resolve));
    host.send(JSON.stringify({ type: 'join', role: 'host', code: '654321' }));
    await nextMessage(host);

    const viewer1 = connect(port);
    await new Promise((resolve) => viewer1.once('open', resolve));
    viewer1.send(JSON.stringify({ type: 'join', role: 'viewer', code: '654321' }));
    await nextMessage(viewer1);

    const viewer2 = connect(port);
    await new Promise((resolve) => viewer2.once('open', resolve));
    viewer2.send(JSON.stringify({ type: 'join', role: 'viewer', code: '654321' }));
    const rejection = await nextMessage(viewer2);
    assert.equal(rejection.type, 'error');

    closeAll(host, viewer1, viewer2);
  } finally {
    wss.close();
  }
});

test('a screen frame from the host only reaches the viewer, and a tap only reaches the host', async () => {
  const { wss, port } = await startServer();
  try {
    const host = connect(port);
    await new Promise((resolve) => host.once('open', resolve));
    host.send(JSON.stringify({ type: 'join', role: 'host', code: '111222' }));
    await nextMessage(host);

    const viewer = connect(port);
    await new Promise((resolve) => viewer.once('open', resolve));
    const hostSeesPeer = nextMessage(host);
    viewer.send(JSON.stringify({ type: 'join', role: 'viewer', code: '111222' }));
    await nextMessage(viewer);
    await hostSeesPeer;

    const viewerGetsFrame = nextMessage(viewer);
    host.send(JSON.stringify({ type: 'frame', code: '111222', jpeg: 'ZmFrZQ==' }));
    assert.deepEqual(await viewerGetsFrame, { type: 'frame', code: '111222', jpeg: 'ZmFrZQ==' });

    const hostGetsTap = nextMessage(host);
    viewer.send(JSON.stringify({ type: 'tap', code: '111222', x: 0.5, y: 0.5 }));
    assert.deepEqual(await hostGetsTap, { type: 'tap', code: '111222', x: 0.5, y: 0.5 });

    closeAll(host, viewer);
  } finally {
    wss.close();
  }
});

test('joining without a valid session code is rejected', async () => {
  const { wss, port } = await startServer();
  try {
    const client = connect(port);
    await new Promise((resolve) => client.once('open', resolve));
    client.send(JSON.stringify({ type: 'join', role: 'host', code: '12' }));
    const reply = await nextMessage(client);
    assert.equal(reply.type, 'error');
    client.close();
  } finally {
    wss.close();
  }
});
