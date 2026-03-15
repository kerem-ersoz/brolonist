import type { WebSocket } from 'ws';
import { hub } from './hub.js';
import {
  handleRollDice,
  handlePlaceSettlement,
  handlePlaceRoad,
  handlePlaceCity,
  handleBuyDevCard,
  handlePlayDevCard,
  handleMoveRobber,
  handleStealFrom,
  handleDiscardCards,
  handleTradeOffer,
  handleTradeRespond,
  handleTradeConfirm,
  handleTradeCancel,
  handleTradeWithBank,
  handleEndTurn,
  handlePassSpecialBuild,
  handleRequestSpecialBuild,
  handleCancelSpecialBuild,
  handleDevGiveResources,
  handleDevGiveDevCard,
  handleDevRollSeven,
  getGame,
  initializeGame,
  scheduleBotTurn,
  type PlayerInit,
} from './gameHandler.js';
import { filterStateForPlayer } from './sync.js';
import {
  getLobbyGame,
  addPlayerToLobby,
  removePlayerFromLobby,
  setPlayerReady,
  addBotToLobby,
  removeBotFromLobby,
  canStartGame,
  updateLobbyConfig,
} from '../lobby/lobbyStore.js';
import type { GameConfig } from '@brolonist/shared';
import { BoardShape } from '@brolonist/shared';

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
  seq?: number;
}

// Rate limiter: track message timestamps per player
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_MESSAGES = 30; // 30 messages per 5 seconds
const MAX_MESSAGE_SIZE = 4096; // 4KB max payload

function isRateLimited(playerId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(playerId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitMap.set(playerId, recent);
  return recent.length > RATE_LIMIT_MAX_MESSAGES;
}

export function handleConnection(ws: WebSocket, playerId: string, playerName: string): void {
  hub.addClient(playerId, playerName, ws);

  ws.on('message', (data) => {
    try {
      const raw = data.toString();
      if (raw.length > MAX_MESSAGE_SIZE) {
        hub.send(playerId, 'error', { code: 'MESSAGE_TOO_LARGE', message: 'Message exceeds size limit' });
        return;
      }
      if (isRateLimited(playerId)) {
        hub.send(playerId, 'error', { code: 'RATE_LIMITED', message: 'Too many messages, slow down' });
        return;
      }
      const msg: WsMessage = JSON.parse(raw);
      handleMessage(playerId, playerName, msg);
    } catch {
      hub.send(playerId, 'error', { code: 'PARSE_ERROR', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    // Only remove if this is still the active connection for this player
    // (prevents a stale close event from nuking a newer reconnection)
    const current = hub.getClient(playerId);
    if (current?.ws === ws) {
      hub.removeClient(playerId);
    }
  });
}

function handleMessage(playerId: string, playerName: string, msg: WsMessage): void {
  switch (msg.type) {
    case 'join_game':
      handleJoinGame(playerId, playerName, msg.payload as { gameId: string });
      break;
    case 'leave_game':
      handleLeaveGame(playerId);
      break;
    case 'ready':
      handleReady(playerId, msg.payload as { ready: boolean });
      break;
    case 'add_bot':
      handleAddBot(playerId, msg.payload as { strategy?: string });
      break;
    case 'remove_bot':
      handleRemoveBot(playerId, msg.payload as { botId: string });
      break;
    case 'kick_player':
      handleKickPlayer(playerId, msg.payload as { targetId: string });
      break;
    case 'chat':
      handleChat(playerId, msg.payload as { message: string });
      break;
    case 'start_game':
      handleStartGameFromLobby(playerId);
      break;
    case 'update_config':
      handleUpdateConfig(playerId, msg.payload as { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string; customMapConfig?: { tileCount: number; shape: string; seed?: string; resourceRatio?: number; desertRatio?: number; waterRatio?: number } });
      break;
    case 'change_color':
      handleChangeColor(playerId, msg.payload as { color: string });
      break;
    // Game actions — delegated to gameHandler
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
    case 'steal_from':
      handleStealFrom(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleStealFrom>[2]);
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
    case 'trade_confirm':
      handleTradeConfirm(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleTradeConfirm>[2]);
      break;
    case 'trade_cancel':
      handleTradeCancel(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleTradeCancel>[2]);
      break;
    case 'trade_with_bank':
      handleTradeWithBank(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleTradeWithBank>[2]);
      break;
    case 'end_turn':
      handleEndTurn(playerId, getGameId(playerId));
      break;
    case 'pass_special_build':
      handlePassSpecialBuild(playerId, getGameId(playerId));
      break;
    case 'request_special_build':
      handleRequestSpecialBuild(playerId, getGameId(playerId));
      break;
    case 'cancel_special_build':
      handleCancelSpecialBuild(playerId, getGameId(playerId));
      break;
    // Dev/debug actions (dev mode only)
    case 'dev_give_resources':
      handleDevGiveResources(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleDevGiveResources>[2]);
      break;
    case 'dev_give_devcard':
      handleDevGiveDevCard(playerId, getGameId(playerId), msg.payload as Parameters<typeof handleDevGiveDevCard>[2]);
      break;
    case 'dev_roll_seven':
      handleDevRollSeven(playerId, getGameId(playerId));
      break;
    default:
      hub.send(playerId, 'error', { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${msg.type}` });
  }
}

function broadcastLobbyState(gameId: string): void {
  const lobby = getLobbyGame(gameId);
  if (!lobby) return;
  const members = hub.getRoomMembers(gameId);
  for (const pid of members) {
    hub.send(pid, 'lobby_state', lobby);
  }
}

function handleJoinGame(playerId: string, playerName: string, payload: { gameId: string }): void {
  hub.joinRoom(playerId, payload.gameId);

  // Tell the client their player ID
  hub.send(playerId, 'player_id', { playerId });

  // Send current game state if the game has been started
  const state = getGame(payload.gameId);
  if (state) {
    hub.send(playerId, 'game_state', filterStateForPlayer(state, playerId));
    return;
  }

  // Game is in lobby — add player and broadcast lobby state
  const lobby = addPlayerToLobby(payload.gameId, playerId, playerName);
  if (!lobby) {
    // Lobby doesn't exist (server may have restarted)
    hub.send(playerId, 'error', { code: 'GAME_NOT_FOUND', message: 'Game not found. It may have expired.' });
    return;
  }
  hub.broadcast(payload.gameId, 'player_joined', { playerId }, playerId);
  broadcastLobbyState(payload.gameId);
}

function handleLeaveGame(playerId: string): void {
  const client = hub.getClient(playerId);
  if (client?.gameId) {
    const gameId = client.gameId;
    removePlayerFromLobby(gameId, playerId);
    hub.leaveRoom(playerId, gameId);
    hub.broadcast(gameId, 'player_left', { playerId });
    broadcastLobbyState(gameId);
  }
}

function handleReady(playerId: string, payload: { ready: boolean }): void {
  const client = hub.getClient(playerId);
  if (client?.gameId) {
    setPlayerReady(client.gameId, playerId, payload.ready);
    broadcastLobbyState(client.gameId);
  }
}

function handleAddBot(playerId: string, payload: { strategy?: string }): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;
  const lobby = getLobbyGame(client.gameId);
  if (!lobby || lobby.hostId !== playerId) {
    hub.send(playerId, 'error', { code: 'NOT_HOST', message: 'Only the host can add bots' });
    return;
  }
  const result = addBotToLobby(client.gameId, payload.strategy ?? 'random');
  if (!result) {
    hub.send(playerId, 'error', { code: 'LOBBY_FULL', message: 'Lobby is full' });
    return;
  }
  broadcastLobbyState(client.gameId);
}

function handleRemoveBot(playerId: string, payload: { botId: string }): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;
  const lobby = getLobbyGame(client.gameId);
  if (!lobby || lobby.hostId !== playerId) {
    hub.send(playerId, 'error', { code: 'NOT_HOST', message: 'Only the host can remove bots' });
    return;
  }
  removeBotFromLobby(client.gameId, payload.botId);
  broadcastLobbyState(client.gameId);
}

function handleKickPlayer(playerId: string, payload: { targetId: string }): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;
  const lobby = getLobbyGame(client.gameId);
  if (!lobby || lobby.hostId !== playerId) {
    hub.send(playerId, 'error', { code: 'NOT_HOST', message: 'Only the host can kick players' });
    return;
  }
  if (payload.targetId === playerId) return;
  removePlayerFromLobby(client.gameId, payload.targetId);
  hub.send(payload.targetId, 'kicked', { gameId: client.gameId });
  hub.leaveRoom(payload.targetId, client.gameId);
  broadcastLobbyState(client.gameId);
}

function handleUpdateConfig(playerId: string, payload: { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string; customMapConfig?: { tileCount: number; shape: string; seed?: string; resourceRatio?: number; desertRatio?: number; waterRatio?: number } }): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;
  const lobby = getLobbyGame(client.gameId);
  if (!lobby || lobby.hostId !== playerId) {
    hub.send(playerId, 'error', { code: 'NOT_HOST', message: 'Only the host can change settings' });
    return;
  }
  updateLobbyConfig(client.gameId, payload);
  broadcastLobbyState(client.gameId);
}

function handleChangeColor(playerId: string, payload: { color: string }): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;
  const lobby = getLobbyGame(client.gameId);
  if (!lobby) return;
  const validColors = ['red', 'blue', 'white', 'orange', 'green', 'brown', 'purple', 'teal', 'pink', 'black'];
  if (!validColors.includes(payload.color)) {
    hub.send(playerId, 'error', { code: 'INVALID_COLOR', message: 'Invalid color' });
    return;
  }
  // Check if color is already taken by another player
  const taken = lobby.players.some(p => p.id !== playerId && p.color === payload.color);
  if (taken) {
    hub.send(playerId, 'error', { code: 'COLOR_TAKEN', message: 'That color is already taken' });
    return;
  }
  const player = lobby.players.find(p => p.id === playerId);
  if (player) {
    player.color = payload.color;
    broadcastLobbyState(client.gameId);
  }
}

function handleStartGameFromLobby(playerId: string): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;
  const gameId = client.gameId;

  const lobby = getLobbyGame(gameId);
  if (!lobby) {
    hub.send(playerId, 'error', { code: 'NO_LOBBY', message: 'Lobby not found' });
    return;
  }
  if (lobby.hostId !== playerId) {
    hub.send(playerId, 'error', { code: 'NOT_HOST', message: 'Only the host can start the game' });
    return;
  }

  const check = canStartGame(gameId);
  if (!check.ok) {
    hub.send(playerId, 'error', { code: 'CANNOT_START', message: check.reason ?? 'Cannot start game' });
    return;
  }

  const playerInits: PlayerInit[] = lobby.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isBot: p.isBot,
    botStrategy: p.botStrategy as PlayerInit['botStrategy'],
  }));

  const config: GameConfig = {
    maxPlayers: lobby.players.length,
    victoryPoints: lobby.config.victoryPoints,
    mapType: lobby.config.mapType as GameConfig['mapType'],
    turnTimerSeconds: lobby.config.turnTimerSeconds,
    discardTimerSeconds: 30,
    isPrivate: lobby.config.isPrivate,
    ...(lobby.config.customMapConfig ? {
      customMapConfig: {
        tileCount: lobby.config.customMapConfig.tileCount,
        shape: lobby.config.customMapConfig.shape as BoardShape,
        ...(lobby.config.customMapConfig.seed !== undefined ? { seed: lobby.config.customMapConfig.seed } : {}),
        ...(lobby.config.customMapConfig.resourceRatio !== undefined ? { resourceRatio: lobby.config.customMapConfig.resourceRatio } : {}),
        ...(lobby.config.customMapConfig.desertRatio !== undefined ? { desertRatio: lobby.config.customMapConfig.desertRatio } : {}),
        ...(lobby.config.customMapConfig.waterRatio !== undefined ? { waterRatio: lobby.config.customMapConfig.waterRatio } : {}),
      },
    } : {}),
  };

  lobby.status = 'playing';

  const state = initializeGame(gameId, playerInits, config);

  // Broadcast full game state to each player (filtered)
  const members = hub.getRoomMembers(gameId);
  for (const pid of members) {
    hub.send(pid, 'game_state', filterStateForPlayer(state, pid));
  }

  // Trigger bot turns if the first player is a bot
  scheduleBotTurn(gameId);
}

const MAX_CHAT_LENGTH = 300;

function handleChat(playerId: string, payload: { message: string }): void {
  const client = hub.getClient(playerId);
  if (!client?.gameId) return;

  let msg = typeof payload.message === 'string' ? payload.message : '';
  msg = msg.trim().slice(0, MAX_CHAT_LENGTH);
  if (!msg) return;

  // Strip HTML tags to prevent XSS
  msg = msg.replace(/<[^>]*>/g, '');

  hub.broadcast(client.gameId, 'chat', { playerId, message: msg });
}

function getGameId(playerId: string): string {
  return hub.getClient(playerId)?.gameId ?? '';
}
