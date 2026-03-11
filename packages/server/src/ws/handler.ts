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
  handleDiscardCards,
  handleTradeOffer,
  handleTradeRespond,
  handleTradeConfirm,
  handleTradeCancel,
  handleTradeWithBank,
  handleEndTurn,
  handlePassSpecialBuild,
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
      handleMessage(playerId, playerName, msg);
    } catch {
      hub.send(playerId, 'error', { code: 'PARSE_ERROR', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    hub.removeClient(playerId);
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
      handleUpdateConfig(playerId, msg.payload as { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string });
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

function handleUpdateConfig(playerId: string, payload: { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string }): void {
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

function handleChat(playerId: string, payload: { message: string }): void {
  const client = hub.getClient(playerId);
  if (client?.gameId) {
    hub.broadcast(client.gameId, 'chat', { playerId, message: payload.message });
  }
}

function getGameId(playerId: string): string {
  return hub.getClient(playerId)?.gameId ?? '';
}
