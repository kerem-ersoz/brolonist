import type { WebSocket } from 'ws';
import { hub } from './hub.js';
import {
  handleStartGame,
  handleRollDice,
  handlePlaceSettlement,
  handlePlaceRoad,
  handlePlaceCity,
  handleBuyDevCard,
  handlePlayDevCard,
  handleMoveRobber,
  handleDiscardCards,
  handleTradeOffer,
  handleTradeRespond,
  handleTradeWithBank,
  handleEndTurn,
  getGame,
} from './gameHandler.js';
import { filterStateForPlayer } from './sync.js';

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
    // Game actions — delegated to gameHandler
    case 'start_game':
      handleStartGame(playerId, msg.payload as Parameters<typeof handleStartGame>[1]);
      break;
    case 'roll_dice':
      handleRollDice(playerId, getGameId(playerId));
      break;
    case 'place_settlement':
      handlePlaceSettlement(playerId, getGameId(playerId), msg.payload as Parameters<typeof handlePlaceSettlement>[2]);
      break;
    case 'place_road':
      handlePlaceRoad(playerId, getGameId(playerId), msg.payload as Parameters<typeof handlePlaceRoad>[2]);
      break;
    case 'place_city':
      handlePlaceCity(playerId, getGameId(playerId), msg.payload as Parameters<typeof handlePlaceCity>[2]);
      break;
    case 'buy_dev_card':
      handleBuyDevCard(playerId, getGameId(playerId));
      break;
    case 'play_dev_card':
      handlePlayDevCard(playerId, getGameId(playerId), msg.payload as Parameters<typeof handlePlayDevCard>[2]);
      break;
    case 'move_robber':
      handleMoveRobber(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleMoveRobber>[2]);
      break;
    case 'discard_cards':
      handleDiscardCards(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleDiscardCards>[2]);
      break;
    case 'trade_offer':
      handleTradeOffer(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleTradeOffer>[2]);
      break;
    case 'trade_respond':
      handleTradeRespond(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleTradeRespond>[2]);
      break;
    case 'trade_with_bank':
      handleTradeWithBank(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleTradeWithBank>[2]);
      break;
    case 'end_turn':
      handleEndTurn(playerId, getGameId(playerId));
      break;
    default:
      hub.send(playerId, 'error', { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${msg.type}` });
  }
}

function handleJoinGame(playerId: string, payload: { gameId: string }): void {
  hub.joinRoom(playerId, payload.gameId);
  hub.broadcast(payload.gameId, 'player_joined', { playerId }, playerId);

  // Tell the client their player ID
  hub.send(playerId, 'player_id', { playerId });

  // Send current game state if the game has been started
  const state = getGame(payload.gameId);
  if (state) {
    hub.send(playerId, 'game_state', filterStateForPlayer(state, playerId));
  } else {
    // Game exists in lobby but not yet started — send lobby confirmation
    hub.send(playerId, 'action_result', { success: true, type: 'join_game', gameId: payload.gameId });
  }
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

function getGameId(playerId: string): string {
  return hub.getClient(playerId)?.gameId ?? '';
}
