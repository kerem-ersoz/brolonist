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
  ResourceType,
  ALL_RESOURCES,
} from '../types/resources.js';
import {
  VertexDirection,
  vertexAdjacentHexes,
  hexEquals,
} from '../hex/coordinates.js';

/** Advance to next player (clockwise). */
export function nextPlayerIndex(state: GameState): number {
  let idx = state.currentPlayerIndex;
  const startIdx = idx;
  do {
    idx = (idx + 1) % state.players.length;
    if (idx === startIdx) break; // All players quit — avoid infinite loop
  } while (state.players[idx].status === PlayerStatus.Quit);
  return idx;
}

/** Advance to previous player (counter-clockwise, for setup round 2). */
export function prevPlayerIndex(state: GameState): number {
  let idx = state.currentPlayerIndex;
  const startIdx = idx;
  do {
    idx = (idx - 1 + state.players.length) % state.players.length;
    if (idx === startIdx) break; // All players quit — avoid infinite loop
  } while (state.players[idx].status === PlayerStatus.Quit);
  return idx;
}

/** Roll two six-sided dice. */
export function rollDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
}

export interface DistributeResult {
  distribution: Record<string, Resources>;
  blockedResources: ResourceType[];
}

/**
 * Distribute resources based on dice roll.
 * Returns per-player resource gains and applies them to player state.
 * If the bank does not have enough of a resource to fulfil all entitled players,
 * that resource is not distributed to anyone (official Catan rule).
 */
export function distributeResources(
  state: GameState,
  diceSum: number,
): DistributeResult {
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

  // Compute bank supply: 19 per resource minus all players' holdings
  const bankSupply = emptyResources();
  for (const r of ALL_RESOURCES) bankSupply[r] = 19;
  for (const p of state.players) {
    for (const r of ALL_RESOURCES) bankSupply[r] -= p.resources[r];
  }

  // Check total demand per resource; if demand exceeds bank supply, block that resource
  const totalDemand = emptyResources();
  for (const resources of Object.values(finalDistribution)) {
    for (const r of ALL_RESOURCES) totalDemand[r] += resources[r];
  }

  const blockedResources: ResourceType[] = [];
  for (const r of ALL_RESOURCES) {
    if (totalDemand[r] > 0 && totalDemand[r] > bankSupply[r]) {
      blockedResources.push(r);
      // Zero out this resource for all players
      for (const resources of Object.values(finalDistribution)) {
        resources[r] = 0;
      }
    }
  }

  // Apply distribution to player resources
  for (const [playerId, resources] of Object.entries(finalDistribution)) {
    const player = state.players.find((p) => p.id === playerId);
    if (player && player.status !== PlayerStatus.Quit) {
      player.resources = addResources(player.resources, resources);
    }
  }

  return { distribution: finalDistribution, blockedResources };
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

  // Only enter special build if 5+ players AND at least one player opted in
  const optedIn = state.specialBuildRequests.filter(
    (id) => id !== player.id && state.players.some((p) => p.id === id && p.status !== PlayerStatus.Quit),
  );
  state.specialBuildRequests = [];

  if (state.players.length >= 5 && optedIn.length > 0) {
    state.currentPhase = GamePhase.SpecialBuild;
    state.specialBuildOrder = optedIn;
    state.specialBuildCurrentIndex = 0;
  } else {
    state.currentPlayerIndex = nextPlayerIndex(state);
    state.turnNumber++;
    state.currentPhase = GamePhase.RollDice;
  }
}

/** Advance to the next player in the special build phase, or transition to the next turn. */
export function advanceSpecialBuild(state: GameState): void {
  state.specialBuildCurrentIndex++;
  if (state.specialBuildCurrentIndex >= state.specialBuildOrder.length) {
    // All players had their chance — advance to next player's roll
    state.currentPlayerIndex = nextPlayerIndex(state);
    state.turnNumber++;
    state.currentPhase = GamePhase.RollDice;
    state.specialBuildOrder = [];
    state.specialBuildCurrentIndex = 0;
  }
}

/** Add a log entry with an automatic timestamp. */
export function addLogEntry(state: GameState, entry: Omit<GameLogEntry, 'timestamp'>): void {
  state.log.push({ ...entry, timestamp: new Date().toISOString() });
}
