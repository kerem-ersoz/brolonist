import {
  GameState,
  vertexKey,
  edgeKey,
} from '../types/game.js';
import {
  EdgeId,
  VertexId,
  edgeAdjacentVertices,
  vertexAdjacentEdges,
  edgeEquals,
  vertexEquals,
} from '../hex/coordinates.js';
import { BuildingType } from '../types/resources.js';

/**
 * Calculate the longest contiguous road for a player using DFS.
 * An opponent's settlement/city on the path breaks continuity.
 */
export function calculateLongestRoad(state: GameState, playerId: string): number {
  // Collect all edges belonging to this player
  const playerEdges: EdgeId[] = [];
  for (const [key, building] of state.board.edgeBuildings) {
    if (building.playerId === playerId && building.type === BuildingType.Road) {
      const parts = key.split(',');
      if (parts.length !== 3) continue;
      const q = parseInt(parts[0], 10);
      const r = parseInt(parts[1], 10);
      const dir = parts[2] as EdgeId['direction'];
      playerEdges.push({ hex: { q, r }, direction: dir });
    }
  }

  if (playerEdges.length === 0) return 0;

  // Build adjacency: for each road, find connected roads through vertices
  // that are not blocked by opponent buildings
  let longest = 0;

  const edgeKeyStr = (e: EdgeId) => edgeKey(e);
  const playerEdgeSet = new Set(playerEdges.map(edgeKeyStr));

  // DFS from each edge in both directions
  for (const startEdge of playerEdges) {
    const visited = new Set<string>();
    dfs(startEdge, visited);
  }

  function dfs(edge: EdgeId, visited: Set<string>): void {
    const ek = edgeKeyStr(edge);
    visited.add(ek);

    const length = visited.size;
    if (length > longest) longest = length;

    const endpoints = edgeAdjacentVertices(edge);
    for (const vertex of endpoints) {
      // Check if an opponent building blocks passage through this vertex
      const vBuilding = state.board.vertexBuildings.get(vertexKey(vertex));
      if (vBuilding && vBuilding.playerId !== playerId) continue;

      // Find connected roads through this vertex
      const adjEdges = vertexAdjacentEdges(vertex);
      for (const adjEdge of adjEdges) {
        const aek = edgeKeyStr(adjEdge);
        if (visited.has(aek)) continue;
        if (!playerEdgeSet.has(aek)) continue;
        dfs(adjEdge, visited);
      }
    }

    visited.delete(ek);
  }

  return longest;
}

/** Recalculate longest road for all players and update the holder. Mutates state. */
export function updateLongestRoadHolder(state: GameState): void {
  let bestLength = state.longestRoadLength;
  let bestPlayer = state.longestRoadHolder;

  // Clear current holder's flag
  for (const p of state.players) {
    p.hasLongestRoad = false;
  }

  // Recalculate for all players
  const lengths: Record<string, number> = {};
  for (const p of state.players) {
    lengths[p.id] = calculateLongestRoad(state, p.id);
  }

  // Minimum 5 roads for longest road
  let maxLength = 4;
  let maxPlayer: string | null = null;

  for (const [pid, len] of Object.entries(lengths)) {
    if (len > maxLength) {
      maxLength = len;
      maxPlayer = pid;
    }
  }

  // If there's a tie, the current holder keeps it
  if (maxPlayer === null && bestLength >= 5) {
    // Check if current holder still has at least 5
    if (bestPlayer && lengths[bestPlayer] !== undefined && lengths[bestPlayer] >= 5) {
      maxPlayer = bestPlayer;
      maxLength = lengths[bestPlayer];
    }
  } else if (maxPlayer !== null) {
    // Check for ties with maxLength
    const tiedPlayers = Object.entries(lengths).filter(([, len]) => len === maxLength);
    if (tiedPlayers.length > 1 && bestPlayer) {
      const currentHolderTied = tiedPlayers.some(([pid]) => pid === bestPlayer);
      if (currentHolderTied) {
        maxPlayer = bestPlayer;
      }
    }
  }

  state.longestRoadHolder = maxPlayer;
  state.longestRoadLength = maxPlayer ? maxLength : 0;

  if (maxPlayer) {
    const player = state.players.find((p) => p.id === maxPlayer);
    if (player) player.hasLongestRoad = true;
  }
}
