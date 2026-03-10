import type { WebSocket } from 'ws';
import { hub } from './hub.js';

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
  seq?: number;
}

export function handleConnection(ws: WebSocket, playerId: string, playerName: string): void {
  hub.addClient(playerId, playerName, ws);

  ws.on('message', (data) => {
    try {
      const msg: WsMessage = JSON.parse(data.toString());
      handleMessage(playerId, msg);
    } catch {
      hub.send(playerId, 'error', { code: 'PARSE_ERROR', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    hub.removeClient(playerId);
  });
}

function handleMessage(playerId: string, msg: WsMessage): void {
  switch (msg.type) {
    case 'join_game':
      handleJoinGame(playerId, msg.payload as { gameId: string });
      break;
    case 'leave_game':
      handleLeaveGame(playerId);
      break;
    case 'ready':
      handleReady(playerId, msg.payload as { ready: boolean });
      break;
    case 'chat':
      handleChat(playerId, msg.payload as { message: string });
      break;
    // Game actions will be added in ws-game-handler todo
    default:
      hub.send(playerId, 'error', { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${msg.type}` });
  }
}

function handleJoinGame(playerId: string, payload: { gameId: string }): void {
  hub.joinRoom(playerId, payload.gameId);
  hub.broadcast(payload.gameId, 'player_joined', { playerId }, playerId);
  hub.send(playerId, 'action_result', { success: true, type: 'join_game' });
}

function handleLeaveGame(playerId: string): void {
  const client = hub.getClient(playerId);
  if (client?.gameId) {
    const gameId = client.gameId;
    hub.leaveRoom(playerId, gameId);
    hub.broadcast(gameId, 'player_left', { playerId });
  }
}

function handleReady(playerId: string, payload: { ready: boolean }): void {
  const client = hub.getClient(playerId);
  if (client?.gameId) {
    hub.broadcast(client.gameId, 'player_ready', { playerId, ready: payload.ready });
  }
}

function handleChat(playerId: string, payload: { message: string }): void {
  const client = hub.getClient(playerId);
  if (client?.gameId) {
    hub.broadcast(client.gameId, 'chat', { playerId, message: payload.message });
  }
}
