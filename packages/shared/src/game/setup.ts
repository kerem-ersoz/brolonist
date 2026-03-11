import {
  GameState,
  GamePhase,
  vertexKey,
  edgeKey,
} from '../types/game.js';
import {
  VertexId,
  EdgeId,
  vertexAdjacentHexes,
  hexEquals,
} from '../hex/coordinates.js';
import {
  BuildingType,
  TERRAIN_RESOURCE,
} from '../types/resources.js';
import { canPlaceSettlement, canPlaceRoad } from './rules.js';

/** Determine which player should place next in the setup snake draft. */
export function getSetupPlacementPlayer(state: GameState): string {
  return state.players[state.currentPlayerIndex].id;
}

/** Place a settlement during setup. Returns null if valid, error string otherwise. */
export function handleSetupSettlement(
  state: GameState,
  playerId: string,
  vertex: VertexId,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';

  const current = state.players[state.currentPlayerIndex];
  if (current.id !== playerId) return 'Not your turn';

  if (
    state.currentPhase !== GamePhase.SetupForward &&
    state.currentPhase !== GamePhase.SetupReverse
  )
    return 'Not in setup phase';

  const error = canPlaceSettlement(state, playerId, vertex, true);
  if (error) return error;

  // Place settlement (free during setup)
  state.board.vertexBuildings.set(vertexKey(vertex), {
    type: BuildingType.Settlement,
    playerId,
  });
  player.settlementsBuilt += 1;

  return null;
}

/** Place a road during setup. Returns null if valid, error string otherwise. */
export function handleSetupRoad(
  state: GameState,
  playerId: string,
  edge: EdgeId,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';

  const current = state.players[state.currentPlayerIndex];
  if (current.id !== playerId) return 'Not your turn';

  if (
    state.currentPhase !== GamePhase.SetupForward &&
    state.currentPhase !== GamePhase.SetupReverse
  )
    return 'Not in setup phase';

  const error = canPlaceRoad(state, playerId, edge, true);
  if (error) return error;

  // Place road (free during setup)
  state.board.edgeBuildings.set(edgeKey(edge), {
    type: BuildingType.Road,
    playerId,
  });
  player.roadsBuilt += 1;

  return null;
}

/** Distribute initial resources from the second settlement's adjacent hexes. */
export function distributeInitialResources(
  state: GameState,
  playerId: string,
  vertex: VertexId,
): void {
  if (state.setupRound !== 2) return;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;

  const adjHexes = vertexAdjacentHexes(vertex);
  for (const adjHex of adjHexes) {
    const hex = state.board.hexes.find((h) => hexEquals(h.coord, adjHex));
    if (!hex) continue;
    const resource = TERRAIN_RESOURCE[hex.terrain];
    if (!resource) continue;
    player.resources[resource] += 1;
  }
}

/** Advance setup to the next player or transition to playing phase. Mutates state. */
export function advanceSetupPhase(state: GameState): void {
  const playerCount = state.players.length;

  if (state.currentPhase === GamePhase.SetupForward) {
    // Forward round: player 0 → 1 → ... → last
    const nextIdx = (state.currentPlayerIndex + 1) % playerCount;
    if (nextIdx === 0) {
      // Wrapped around — forward round complete, switch to reverse
      // Stay on the last player (they go again in reverse)
      state.currentPhase = GamePhase.SetupReverse;
      state.setupRound = 2;
    } else {
      state.currentPlayerIndex = nextIdx;
    }
  } else if (state.currentPhase === GamePhase.SetupReverse) {
    // Reverse round: last → ... → 1 → 0
    if (state.currentPlayerIndex === 0) {
      // First player done — setup complete, start playing
      state.currentPhase = GamePhase.RollDice;
      state.status = 'playing';
      state.turnNumber = 1;
      // currentPlayerIndex stays at 0 (first player starts)
    } else {
      state.currentPlayerIndex = state.currentPlayerIndex - 1;
    }
  }

  // Next player always starts by placing a settlement
  state.setupAction = 'settlement';
}
