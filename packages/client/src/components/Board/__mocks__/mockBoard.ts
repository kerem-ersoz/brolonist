import type { Board } from '@brolonist/shared';
import { TerrainType } from '@brolonist/shared';

const STANDARD_TERRAINS: TerrainType[] = [
  TerrainType.Hills, TerrainType.Hills, TerrainType.Hills,
  TerrainType.Forest, TerrainType.Forest, TerrainType.Forest, TerrainType.Forest,
  TerrainType.Mountains, TerrainType.Mountains, TerrainType.Mountains,
  TerrainType.Fields, TerrainType.Fields, TerrainType.Fields, TerrainType.Fields,
  TerrainType.Pasture, TerrainType.Pasture, TerrainType.Pasture, TerrainType.Pasture,
  TerrainType.Desert,
];

const STANDARD_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const RING_COORDS_4P = [
  // center
  { q: 0, r: 0 },
  // ring 1
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  // ring 2
  { q: 2, r: 0 }, { q: 1, r: 1 }, { q: 0, r: 2 },
  { q: -1, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 1 },
  { q: -2, r: 0 }, { q: -1, r: -1 }, { q: 0, r: -2 },
  { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 2, r: -1 },
];

const WATER_COORDS_4P = [
  { q: 3, r: -3 }, { q: 3, r: -2 }, { q: 3, r: -1 }, { q: 3, r: 0 },
  { q: 2, r: 1 }, { q: 1, r: 2 }, { q: 0, r: 3 },
  { q: -1, r: 3 }, { q: -2, r: 3 }, { q: -3, r: 3 },
  { q: -3, r: 2 }, { q: -3, r: 1 }, { q: -3, r: 0 },
  { q: -2, r: -1 }, { q: -1, r: -2 }, { q: 0, r: -3 },
  { q: 1, r: -3 }, { q: 2, r: -3 },
];

export function createMockBoard(playerCount: number): Board {
  const coords = RING_COORDS_4P.slice(0, playerCount <= 4 ? 19 : playerCount <= 6 ? 19 : 19);
  const terrains = [...STANDARD_TERRAINS];
  const numbers = [...STANDARD_NUMBERS];

  let numIdx = 0;
  const hexes = coords.map((coord, i) => ({
    coord,
    terrain: terrains[i % terrains.length],
    numberToken: terrains[i % terrains.length] === TerrainType.Desert ? null : (numbers[numIdx++] ?? null),
  }));

  return {
    hexes,
    waterHexes: WATER_COORDS_4P,
    harbors: [],
    vertexBuildings: new Map(),
    edgeBuildings: new Map(),
  };
}

export function createMockBoardWithBuildings(): Board {
  const board = createMockBoard(4);
  board.vertexBuildings.set('0,0,N', { type: 'settlement' as never, playerId: 'p1' });
  board.vertexBuildings.set('1,0,S', { type: 'city' as never, playerId: 'p2' });
  board.edgeBuildings.set('0,0,E', { type: 'road' as never, playerId: 'p1' });
  board.edgeBuildings.set('1,0,NE', { type: 'road' as never, playerId: 'p2' });
  return board;
}
