import {
  GameState,
  Player,
  vertexKey,
  getCurrentPlayer,
} from '../types/game.js';
import {
  Resources,
  ResourceType,
  ALL_RESOURCES,
  totalCards,
  emptyResources,
  hasResources,
} from '../types/resources.js';
import {
  HexCoord,
  hexEquals,
  VertexDirection,
  vertexAdjacentHexes,
} from '../hex/coordinates.js';
import { PlayerStatus } from '../types/game.js';

/** Returns player IDs that must discard (>7 cards). Re-exported from engine. */
export { getPlayersWhoMustDiscard } from './engine.js';

/** Auto-discard random cards down to half (rounded down). */
export function autoDiscardRandom(player: Player, discardCount: number): Resources {
  const pool: ResourceType[] = [];
  for (const r of ALL_RESOURCES) {
    for (let i = 0; i < player.resources[r]; i++) {
      pool.push(r);
    }
  }
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const discarded = emptyResources();
  for (let i = 0; i < discardCount && i < pool.length; i++) {
    discarded[pool[i]] += 1;
  }
  executeDiscard(player, discarded);
  return discarded;
}

/** Validate a player's discard selection. Returns null if valid, error string otherwise. */
export function validateDiscard(player: Player, resources: Resources): string | null {
  const total = totalCards(player.resources);
  const discardTarget = Math.floor(total / 2);
  const discardTotal = totalCards(resources);
  if (discardTotal !== discardTarget)
    return `Must discard exactly ${discardTarget} cards, got ${discardTotal}`;
  if (!hasResources(player.resources, resources))
    return 'Player does not have the selected cards';
  return null;
}

/** Remove discarded cards from a player. Mutates player. */
export function executeDiscard(player: Player, resources: Resources): void {
  for (const r of ALL_RESOURCES) {
    player.resources[r] -= resources[r];
  }
}

/** Validate robber movement. Returns null if valid, error string otherwise. */
export function canMoveRobber(
  state: GameState,
  playerId: string,
  targetHex: HexCoord,
): string | null {
  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return 'Not your turn';
  if (hexEquals(state.robberPosition, targetHex)) return 'Must move robber to a different hex';
  const hexExists = state.board.hexes.some((h) => hexEquals(h.coord, targetHex));
  if (!hexExists) return 'Invalid hex';
  return null;
}

/** Move the robber to a new hex. Mutates state. */
export function executeRobberMove(state: GameState, targetHex: HexCoord): void {
  state.robberPosition = targetHex;
}

/** Get players with buildings adjacent to a hex, excluding the active player. */
export function getStealTargets(state: GameState, hex: HexCoord): string[] {
  const current = getCurrentPlayer(state);
  const targets = new Set<string>();

  for (const [key, building] of state.board.vertexBuildings) {
    if (building.playerId === current.id) continue;
    const parts = key.split(',');
    if (parts.length !== 3) continue;
    const q = parseInt(parts[0], 10);
    const r = parseInt(parts[1], 10);
    const dir = parts[2] as VertexDirection;
    const vertex = { hex: { q, r }, direction: dir };

    const adjHexes = vertexAdjacentHexes(vertex);
    if (adjHexes.some((h) => hexEquals(h, hex))) {
      const p = state.players.find((pl) => pl.id === building.playerId);
      if (p && p.status !== PlayerStatus.Quit && totalCards(p.resources) > 0) {
        targets.add(building.playerId);
      }
    }
  }

  return [...targets];
}

/** Steal a random card from one player and give it to another. Mutates state. */
export function executeSteal(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
): ResourceType | null {
  const from = state.players.find((p) => p.id === fromPlayerId);
  const to = state.players.find((p) => p.id === toPlayerId);
  if (!from || !to) return null;
  if (totalCards(from.resources) === 0) return null;

  const pool: ResourceType[] = [];
  for (const r of ALL_RESOURCES) {
    for (let i = 0; i < from.resources[r]; i++) {
      pool.push(r);
    }
  }
  const stolen = pool[Math.floor(Math.random() * pool.length)];
  from.resources[stolen] -= 1;
  to.resources[stolen] += 1;
  return stolen;
}
