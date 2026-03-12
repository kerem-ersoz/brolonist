import { GameState, Board, vertexKey, edgeKey } from '../types/game.js';
import {
  VertexId,
  EdgeId,
  EdgeDirection,
  VertexDirection,
  edgeEquals,
  vertexAdjacentVertices,
  vertexAdjacentEdges,
  edgeAdjacentVertices,
  vertexAdjacentHexes,
  hexEquals,
  type HexCoord,
} from '../hex/coordinates.js';
import {
  BuildingType,
  BUILDING_COSTS,
  BUILDING_LIMITS,
  hasResources,
} from '../types/resources.js';

/** Check if a vertex satisfies the distance rule (no building within 1 edge). */
export function isDistanceRuleSatisfied(board: Board, vertex: VertexId): boolean {
  const adjVertices = vertexAdjacentVertices(vertex);
  for (const adj of adjVertices) {
    if (board.vertexBuildings.has(vertexKey(adj))) return false;
  }
  return true;
}

/** Check if a vertex is unoccupied. */
export function isVertexEmpty(board: Board, vertex: VertexId): boolean {
  return !board.vertexBuildings.has(vertexKey(vertex));
}

/** Check if a vertex is connected to the player's road network. */
export function isConnectedToRoad(board: Board, vertex: VertexId, playerId: string): boolean {
  const adjEdges = vertexAdjacentEdges(vertex);
  for (const edge of adjEdges) {
    const building = board.edgeBuildings.get(edgeKey(edge));
    if (building && building.playerId === playerId) return true;
  }
  return false;
}

/** Check if an edge is connected to the player's network (road/settlement/city). */
export function isEdgeConnectedToNetwork(board: Board, edge: EdgeId, playerId: string): boolean {
  const endpoints = edgeAdjacentVertices(edge);
  for (const v of endpoints) {
    const vBuilding = board.vertexBuildings.get(vertexKey(v));
    if (vBuilding && vBuilding.playerId === playerId) return true;
    const adjEdges = vertexAdjacentEdges(v);
    for (const adjEdge of adjEdges) {
      if (edgeEquals(adjEdge, edge)) continue;
      const eBuilding = board.edgeBuildings.get(edgeKey(adjEdge));
      if (eBuilding && eBuilding.playerId === playerId) return true;
    }
  }
  return false;
}

/** Validate settlement placement. Returns null if valid, error string otherwise. */
export function canPlaceSettlement(
  state: GameState,
  playerId: string,
  vertex: VertexId,
  isSetup: boolean,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  if (player.settlementsBuilt >= BUILDING_LIMITS[BuildingType.Settlement])
    return 'Settlement limit reached';
  if (!isSetup && !hasResources(player.resources, BUILDING_COSTS[BuildingType.Settlement]))
    return 'Insufficient resources';
  if (!isVertexEmpty(state.board, vertex)) return 'Vertex is occupied';
  // At least one adjacent hex must be a land hex
  const adjHexes = vertexAdjacentHexes(vertex);
  if (!adjHexes.some(h => state.board.hexes.some(bh => hexEquals(bh.coord, h)))) return 'Cannot build on water';
  if (!isDistanceRuleSatisfied(state.board, vertex)) return 'Too close to another building';
  if (!isSetup && !isConnectedToRoad(state.board, vertex, playerId))
    return 'Not connected to your road';
  return null;
}

/** Get the two hexes that share an edge. */
function edgeAdjacentHexes(edge: EdgeId): [HexCoord, HexCoord] {
  const { q, r } = edge.hex;
  switch (edge.direction) {
    case EdgeDirection.NE: return [{ q, r }, { q: q + 1, r: r - 1 }];
    case EdgeDirection.E:  return [{ q, r }, { q: q + 1, r }];
    case EdgeDirection.SE: return [{ q, r }, { q, r: r + 1 }];
    default: return [{ q, r }, { q, r }];
  }
}

/** Check if at least one hex adjacent to this edge is a land hex. */
function isEdgeOnLand(board: Board, edge: EdgeId): boolean {
  const [h1, h2] = edgeAdjacentHexes(edge);
  return board.hexes.some(h => hexEquals(h.coord, h1) || hexEquals(h.coord, h2));
}

/** Validate road placement. Returns null if valid, error string otherwise. */
export function canPlaceRoad(
  state: GameState,
  playerId: string,
  edge: EdgeId,
  isFree: boolean,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  if (player.roadsBuilt >= BUILDING_LIMITS[BuildingType.Road]) return 'Road limit reached';
  if (!isFree && !hasResources(player.resources, BUILDING_COSTS[BuildingType.Road]))
    return 'Insufficient resources';
  if (state.board.edgeBuildings.has(edgeKey(edge))) return 'Edge is occupied';
  if (!isEdgeOnLand(state.board, edge)) return 'Cannot build on water';
  if (!isEdgeConnectedToNetwork(state.board, edge, playerId))
    return 'Not connected to your network';
  return null;
}

/** Validate city upgrade. Returns null if valid, error string otherwise. */
export function canPlaceCity(
  state: GameState,
  playerId: string,
  vertex: VertexId,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  if (player.citiesBuilt >= BUILDING_LIMITS[BuildingType.City]) return 'City limit reached';
  if (!hasResources(player.resources, BUILDING_COSTS[BuildingType.City]))
    return 'Insufficient resources';
  const building = state.board.vertexBuildings.get(vertexKey(vertex));
  if (!building) return 'No building at vertex';
  if (building.playerId !== playerId) return 'Not your building';
  if (building.type !== BuildingType.Settlement) return 'Can only upgrade settlements';
  return null;
}

/** Get all valid settlement locations for a player. */
export function getValidSettlementLocations(
  state: GameState,
  playerId: string,
  isSetup: boolean,
): VertexId[] {
  const valid: VertexId[] = [];
  for (const hex of state.board.hexes) {
    for (const dir of [VertexDirection.N, VertexDirection.S]) {
      const vertex: VertexId = { hex: hex.coord, direction: dir };
      if (canPlaceSettlement(state, playerId, vertex, isSetup) === null) {
        valid.push(vertex);
      }
    }
  }
  return valid;
}

/** Get all valid road locations for a player. */
export function getValidRoadLocations(
  state: GameState,
  playerId: string,
  isFree: boolean,
): EdgeId[] {
  const valid: EdgeId[] = [];
  for (const hex of state.board.hexes) {
    for (const dir of [EdgeDirection.NE, EdgeDirection.E, EdgeDirection.SE]) {
      const edge: EdgeId = { hex: hex.coord, direction: dir };
      if (canPlaceRoad(state, playerId, edge, isFree) === null) {
        valid.push(edge);
      }
    }
  }
  return valid;
}
