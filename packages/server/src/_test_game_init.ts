import { createLobbyGame, addBotToLobby, setPlayerReady, canStartGame } from './lobby/lobbyStore.js';
import { initializeGame } from './ws/gameHandler.js';
import type { PlayerInit } from './ws/gameHandler.js';
import type { GameConfig } from '@brolonist/shared';

const lobby = createLobbyGame('host1', 'HostPlayer');
console.log('1. Game created:', lobby.name);

addBotToLobby(lobby.id, 'random');
setPlayerReady(lobby.id, 'host1', true);
console.log('2. Bot added, players:', lobby.players.length);

const check = canStartGame(lobby.id);
console.log('3. Can start:', check);

const playerInits = lobby.players.map((p) => ({
  id: p.id,
  name: p.name,
  isBot: p.isBot,
  botStrategy: p.botStrategy,
}));

const config = {
  maxPlayers: lobby.players.length,
  victoryPoints: lobby.config.victoryPoints,
  mapType: lobby.config.mapType,
  turnTimerSeconds: lobby.config.turnTimerSeconds,
  discardTimerSeconds: 30,
  isPrivate: lobby.config.isPrivate,
};

console.log('4. Config:', JSON.stringify(config));

try {
  const state = initializeGame('test-game', playerInits as PlayerInit[], config as GameConfig);
  console.log('5. Game initialized! Status:', state.status, 'Phase:', state.currentPhase);
  console.log('   Players:', state.players.length, 'Hexes:', state.board.hexes.length);

  const mapReplacer = (_key: string, value: unknown): unknown =>
    value instanceof Map ? Object.fromEntries(value) : value;
  const serialized = JSON.parse(JSON.stringify(state, mapReplacer));
  console.log('6. Serialization OK. Board keys:', Object.keys(serialized.board));
} catch (e) {
  console.error('CRASH:', e);
}
