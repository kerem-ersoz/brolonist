import { describe, it, expect } from 'vitest';
import {
  isDistanceRuleSatisfied,
  isVertexEmpty,
  canPlaceSettlement,
  canPlaceRoad,
  canPlaceCity,
} from '../rules.js';
import { Board, GameState, GamePhase, MapType, vertexKey, edgeKey, createPlayer } from '../../types/game.js';
import { VertexDirection, EdgeDirection, VertexId, EdgeId } from '../../hex/coordinates.js';
import { BuildingType, PlayerColor, HarborType } from '../../types/resources.js';

function emptyBoard(): Board {
  return {
    hexes: [{ coord: { q: 0, r: 0 }, terrain: 'fields' as any, numberToken: 6 }],
    waterHexes: [],
    harbors: [],
    vertexBuildings: new Map(),
    edgeBuildings: new Map(),
  };
}

function makeState(overrides?: Partial<GameState>): GameState {
  const player = createPlayer('p1', 'Alice', PlayerColor.Red);
  player.resources = { brick: 5, lumber: 5, ore: 5, grain: 5, wool: 5 };
  return {
    id: 'g1',
    name: 'Test',
    hostId: 'p1',
    config: { maxPlayers: 4, victoryPoints: 10, mapType: MapType.Standard, turnTimerSeconds: 0, discardTimerSeconds: 0, isPrivate: false },
    status: 'playing',
    board: emptyBoard(),
    players: [player],
    currentPlayerIndex: 0,
    currentPhase: GamePhase.TradeAndBuild,
    robberPosition: { q: 0, r: 0 },
    developmentDeck: [],
    longestRoadHolder: null,
    longestRoadLength: 0,
    largestArmyHolder: null,
    largestArmySize: 0,
    dice: [1, 1],
    turnNumber: 1,
    setupRound: 1,
    setupAction: 'settlement',
    lastSetupSettlement: null,
    activeTradeOffers: [],
    pendingDiscards: [],
    pendingStealTargets: [],
    specialBuildOrder: [],
    specialBuildCurrentIndex: 0,
    log: [],
    ...overrides,
  };
}

const vertex: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.N };
const edge: EdgeId = { hex: { q: 0, r: 0 }, direction: EdgeDirection.NE };

describe('isDistanceRuleSatisfied', () => {
  it('returns true when no adjacent buildings exist', () => {
    const board = emptyBoard();
    expect(isDistanceRuleSatisfied(board, vertex)).toBe(true);
  });

  it('returns false when adjacent vertex has a building', () => {
    const board = emptyBoard();
    // N of (0,0) is adjacent to S of (0,-1) per vertexAdjacentVertices
    const adjVertex: VertexId = { hex: { q: 0, r: -1 }, direction: VertexDirection.S };
    board.vertexBuildings.set(vertexKey(adjVertex), { type: BuildingType.Settlement, playerId: 'p2' });
    expect(isDistanceRuleSatisfied(board, vertex)).toBe(false);
  });
});

describe('isVertexEmpty', () => {
  it('returns true for an empty vertex', () => {
    const board = emptyBoard();
    expect(isVertexEmpty(board, vertex)).toBe(true);
  });

  it('returns false for an occupied vertex', () => {
    const board = emptyBoard();
    board.vertexBuildings.set(vertexKey(vertex), { type: BuildingType.Settlement, playerId: 'p1' });
    expect(isVertexEmpty(board, vertex)).toBe(false);
  });
});

describe('canPlaceSettlement', () => {
  it('rejects when insufficient resources', () => {
    const state = makeState();
    state.players[0].resources = { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
    // Need a road connection for non-setup placement
    state.board.edgeBuildings.set(edgeKey(edge), { type: BuildingType.Road, playerId: 'p1' });
    const result = canPlaceSettlement(state, 'p1', vertex, false);
    expect(result).toBe('Insufficient resources');
  });

  it('rejects when vertex is occupied', () => {
    const state = makeState();
    state.board.vertexBuildings.set(vertexKey(vertex), { type: BuildingType.Settlement, playerId: 'p2' });
    const result = canPlaceSettlement(state, 'p1', vertex, true);
    expect(result).toBe('Vertex is occupied');
  });

  it('allows placement during setup on empty vertex', () => {
    const state = makeState();
    const result = canPlaceSettlement(state, 'p1', vertex, true);
    expect(result).toBeNull();
  });
});

describe('canPlaceRoad', () => {
  it('rejects when edge is occupied', () => {
    const state = makeState();
    state.board.edgeBuildings.set(edgeKey(edge), { type: BuildingType.Road, playerId: 'p2' });
    const result = canPlaceRoad(state, 'p1', edge, true);
    expect(result).toBe('Edge is occupied');
  });

  it('allows free road when connected to network', () => {
    const state = makeState();
    state.board.vertexBuildings.set(vertexKey(vertex), { type: BuildingType.Settlement, playerId: 'p1' });
    const result = canPlaceRoad(state, 'p1', edge, true);
    expect(result).toBeNull();
  });
});

describe('canPlaceCity', () => {
  it('rejects when no settlement at vertex', () => {
    const state = makeState();
    const result = canPlaceCity(state, 'p1', vertex);
    expect(result).toBe('No building at vertex');
  });

  it('allows upgrade of own settlement', () => {
    const state = makeState();
    state.board.vertexBuildings.set(vertexKey(vertex), { type: BuildingType.Settlement, playerId: 'p1' });
    const result = canPlaceCity(state, 'p1', vertex);
    expect(result).toBeNull();
  });
});
