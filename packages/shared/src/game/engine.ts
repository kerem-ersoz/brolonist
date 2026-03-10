import {
  GameState,
  GamePhase,
  PlayerStatus,
  getCurrentPlayer,
  GameLogEntry,
} from '../types/game.js';
import {
  TERRAIN_RESOURCE,
  addResources,
  emptyResources,
  totalCards,
  BuildingType,
  Resources,
} from '../types/resources.js';
import {
  VertexDirection,
  vertexAdjacentHexes,
  hexEquals,
} from '../hex/coordinates.js';

/** Advance to next player (clockwise). */
export function nextPlayerIndex(state: GameState): number {
  let idx = state.currentPlayerIndex;
  do {
    idx = (idx + 1) % state.players.length;
  } while (state.players[idx].status === PlayerStatus.Quit && idx !== state.currentPlayerIndex);
  return idx;
}

/** Advance to previous player (counter-clockwise, for setup round 2). */
export function prevPlayerIndex(state: GameState): number {
  let idx = state.currentPlayerIndex;
  do {
    idx = (idx - 1 + state.players.length) % state.players.length;
  } while (state.players[idx].status === PlayerStatus.Quit && idx !== state.currentPlayerIndex);
  return idx;
}

/** Roll two six-sided dice. */
export function rollDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
}

/**
 * Distribute resources based on dice roll.
 * Returns per-player resource gains and applies them to player state.
 */
export function distributeResources(
  state: GameState,
  diceSum: number,
): Record<string, Resources> {
  // Iterate all vertex buildings and check which producing hexes they touch.
  const finalDistribution: Record<string, Resources> = {};

  for (const [key, building] of state.board.vertexBuildings) {
    const parts = key.split(',');
    if (parts.length !== 3) continue;
    const q = parseInt(parts[0], 10);
    const r = parseInt(parts[1], 10);
    const dir = parts[2] as VertexDirection;
    const vertex = { hex: { q, r }, direction: dir };

    const adjHexes = vertexAdjacentHexes(vertex);
    for (const adjHex of adjHexes) {
      const hex = state.board.hexes.find(
        (h) => hexEquals(h.coord, adjHex) && h.numberToken === diceSum,
      );
      if (!hex) continue;
      if (hexEquals(hex.coord, state.robberPosition)) continue;

      const resource = TERRAIN_RESOURCE[hex.terrain];
      if (!resource) continue;

      const amount = building.type === BuildingType.City ? 2 : 1;
      if (!finalDistribution[building.playerId]) {
        finalDistribution[building.playerId] = emptyResources();
      }
      finalDistribution[building.playerId][resource] += amount;
    }
  }

  // Apply distribution to player resources
  for (const [playerId, resources] of Object.entries(finalDistribution)) {
    const player = state.players.find((p) => p.id === playerId);
    if (player && player.status !== PlayerStatus.Quit) {
      player.resources = addResources(player.resources, resources);
    }
  }

  return finalDistribution;
}

/** Check which players must discard (>7 cards when 7 is rolled). */
export function getPlayersWhoMustDiscard(state: GameState): string[] {
  return state.players
    .filter((p) => p.status !== PlayerStatus.Quit && totalCards(p.resources) > 7)
    .map((p) => p.id);
}

/** Transition game phase. */
export function transitionPhase(state: GameState, newPhase: GamePhase): void {
  state.currentPhase = newPhase;
}

/** End turn and advance to the next player or special build phase. */
export function endTurn(state: GameState): void {
  const player = getCurrentPlayer(state);
  player.devCardPlayedThisTurn = false;

  state.activeTradeOffers = [];

  if (state.players.length >= 5) {
    state.currentPhase = GamePhase.SpecialBuild;
    state.specialBuildOrder = state.players
      .filter((p) => p.status !== PlayerStatus.Quit && p.id !== player.id)
      .map((p) => p.id);
    state.specialBuildCurrentIndex = 0;
  } else {
    state.currentPlayerIndex = nextPlayerIndex(state);
    state.turnNumber++;
    state.currentPhase = GamePhase.RollDice;
  }
}

/** Add a log entry with an automatic timestamp. */
export function addLogEntry(state: GameState, entry: Omit<GameLogEntry, 'timestamp'>): void {
  state.log.push({ ...entry, timestamp: new Date().toISOString() });
}
