import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 8080);
const wss = new WebSocketServer({ port });

/** @type {Map<string, Set<any>>} */
const rooms = new Map();

function safeSend(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(payload);
}

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}

function broadcastToRoom(code, sender, payload, filterRole = null) {
  const room = rooms.get(code);
  if (!room) return;
  for (const client of room) {
    if (client === sender) continue;
    if (filterRole && client.role !== filterRole) continue;
    safeSend(client, payload);
  }
}

wss.on('connection', (ws) => {
  ws.role = 'unknown';
  ws.code = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      safeSend(ws, JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (msg.type === 'join') {
      const code = String(msg.code || '').replace(/[^0-9]/g, '').slice(0, 8);
      const role = msg.role === 'host' ? 'host' : 'viewer';
      if (code.length < 4) {
        safeSend(ws, JSON.stringify({ type: 'error', message: 'Session code is required' }));
        return;
      }
      const room = getRoom(code);
      if ([...room].some((client) => client.role === role)) {
        safeSend(ws, JSON.stringify({ type: 'error', message: `Session already has a ${role}` }));
        return;
      }
      ws.code = code;
      ws.role = role;
      room.add(ws);
      safeSend(ws, JSON.stringify({ type: 'joined', role, code }));
      broadcastToRoom(code, ws, JSON.stringify({ type: 'peer_joined', role }), null);
      return;
    }

    if (!ws.code) {
      safeSend(ws, JSON.stringify({ type: 'error', message: 'Join a room first' }));
      return;
    }

    // Host -> viewers: screen frames
    if (msg.type === 'frame' && ws.role === 'host') {
      broadcastToRoom(ws.code, ws, JSON.stringify(msg), 'viewer');
      return;
    }

    // Viewer -> host: remote touch events
    if ((msg.type === 'tap' || msg.type === 'swipe') && ws.role === 'viewer') {
      broadcastToRoom(ws.code, ws, JSON.stringify(msg), 'host');
      return;
    }
  });

  ws.on('close', () => {
    if (ws.code && rooms.has(ws.code)) {
      const room = rooms.get(ws.code);
      room.delete(ws);
      broadcastToRoom(ws.code, ws, JSON.stringify({ type: 'peer_left', role: ws.role }), null);
      if (room.size === 0) rooms.delete(ws.code);
    }
  });
});

console.log(`RemoteAssist signaling server running on ws://0.0.0.0:${port}`);
