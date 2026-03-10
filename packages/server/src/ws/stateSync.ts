import { PlayerStatus } from '@brolonist/shared';
import { hub } from './hub.js';
import { filterStateForPlayer } from './sync.js';
import { getGame } from './gameHandler.js';

export function handleReconnect(playerId: string, gameId: string): void {
  const state = getGame(gameId);
  if (!state) {
    hub.send(playerId, 'error', { code: 'E007', message: 'Game not found' });
    return;
  }

  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    hub.send(playerId, 'error', { code: 'E007', message: 'Not in game' });
    return;
  }

  // Mark player as active again
  if (player.status === PlayerStatus.Disconnected) {
    player.status = PlayerStatus.Active;
    hub.broadcast(gameId, 'player_joined', { playerId, reconnected: true });
  }

  // Send full game state
  hub.send(playerId, 'game_state', filterStateForPlayer(state, playerId));
}
