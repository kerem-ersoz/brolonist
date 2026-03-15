import { describe, it, expect } from 'vitest';
import { TerrainType, HarborType } from '../../types/resources.js';
import { MapType, BoardShape } from '../../types/game.js';
import type { CustomMapConfig } from '../../types/game.js';
import {
  generateBoard,
  generateTerrainAssignment,
  generateNumberTokens,
  generateHarbors,
  getTerrainCounts,
  getTokenDistribution,
} from '../board.js';
import { generateHexGrid, generateWaterFrame } from '../../hex/board-layout.js';
import { hexNeighbors } from '../../hex/coordinates.js';
import type { HexTile } from '../../types/game.js';

describe('generateBoard', () => {
  it('produces 19 hexes for 4-player', () => {
    const board = generateBoard({ playerCount: 4, mapType: MapType.Standard });
    expect(board.hexes).toHaveLength(19);
  });

  it('produces 30 hexes for 6-player', () => {
    const board = generateBoard({ playerCount: 6, mapType: MapType.Standard });
    expect(board.hexes).toHaveLength(30);
  });

  it('produces 42 hexes for 8-player', () => {
    const board = generateBoard({ playerCount: 8, mapType: MapType.Standard });
    expect(board.hexes).toHaveLength(42);
  });

  it('initializes empty building maps', () => {
    const board = generateBoard({ playerCount: 4, mapType: MapType.Standard });
    expect(board.vertexBuildings.size).toBe(0);
    expect(board.edgeBuildings.size).toBe(0);
  });
});

describe('generateTerrainAssignment', () => {
  it('returns correct length for 19 hexes', () => {
    const terrains = generateTerrainAssignment(19, MapType.Standard);
    expect(terrains).toHaveLength(19);
  });

  it('contains all terrain types for 4-player', () => {
    const terrains = generateTerrainAssignment(19, MapType.Standard);
    const counts: Record<string, number> = {};
    for (const t of terrains) counts[t] = (counts[t] ?? 0) + 1;

    expect(counts[TerrainType.Hills]).toBe(3);
    expect(counts[TerrainType.Forest]).toBe(4);
    expect(counts[TerrainType.Mountains]).toBe(3);
    expect(counts[TerrainType.Fields]).toBe(4);
    expect(counts[TerrainType.Pasture]).toBe(4);
    expect(counts[TerrainType.Desert]).toBe(1);
  });

  it('contains correct terrain counts for 6-player', () => {
    const terrains = generateTerrainAssignment(30, MapType.Standard);
    const counts: Record<string, number> = {};
    for (const t of terrains) counts[t] = (counts[t] ?? 0) + 1;

    expect(counts[TerrainType.Hills]).toBe(5);
    expect(counts[TerrainType.Forest]).toBe(6);
    expect(counts[TerrainType.Mountains]).toBe(5);
    expect(counts[TerrainType.Fields]).toBe(6);
    expect(counts[TerrainType.Pasture]).toBe(6);
    expect(counts[TerrainType.Desert]).toBe(2);
  });
});

describe('getTerrainCounts', () => {
  it('returns correct counts for 4-player', () => {
    const counts = getTerrainCounts(4);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(19);
    expect(counts[TerrainType.Desert]).toBe(1);
  });

  it('returns correct counts for 6-player', () => {
    const counts = getTerrainCounts(6);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(30);
  });
});

describe('generateNumberTokens', () => {
  it('assigns tokens to all non-desert hexes', () => {
    const terrains = generateTerrainAssignment(19, MapType.Standard);
    const hexes: HexTile[] = generateHexGrid(4).map((coord, i) => ({
      coord,
      terrain: terrains[i],
      numberToken: null,
    }));

    generateNumberTokens(hexes);

    for (const h of hexes) {
      if (h.terrain === TerrainType.Desert) {
        expect(h.numberToken).toBeNull();
      } else {
        expect(h.numberToken).not.toBeNull();
      }
    }
  });

  it('never assigns 7 as a number token', () => {
    const board = generateBoard({ playerCount: 4, mapType: MapType.Standard });
    for (const h of board.hexes) {
      expect(h.numberToken).not.toBe(7);
    }
  });

  it('tokens are in range 2-12', () => {
    const board = generateBoard({ playerCount: 4, mapType: MapType.Standard });
    for (const h of board.hexes) {
      if (h.numberToken !== null) {
        expect(h.numberToken).toBeGreaterThanOrEqual(2);
        expect(h.numberToken).toBeLessThanOrEqual(12);
      }
    }
  });

  it('no adjacent 6/8 in standard 4-player', () => {
    // Run multiple times to account for randomness
    for (let trial = 0; trial < 5; trial++) {
      const board = generateBoard({ playerCount: 4, mapType: MapType.Standard });
      const highValueCoords = new Set<string>();

      for (const h of board.hexes) {
        if (h.numberToken === 6 || h.numberToken === 8) {
          highValueCoords.add(`${h.coord.q},${h.coord.r}`);
        }
      }

      for (const h of board.hexes) {
        if (h.numberToken !== 6 && h.numberToken !== 8) continue;
        for (const n of hexNeighbors(h.coord)) {
          const key = `${n.q},${n.r}`;
          if (key !== `${h.coord.q},${h.coord.r}`) {
            expect(highValueCoords.has(key)).toBe(false);
          }
        }
      }
    }
  });
});

describe('getTokenDistribution', () => {
  it('returns 18 tokens for 19-hex board', () => {
    const tokens = getTokenDistribution(19);
    expect(tokens).toHaveLength(18);
  });

  it('does not include 7', () => {
    const tokens = getTokenDistribution(19);
    expect(tokens).not.toContain(7);
  });

  it('returns 28 tokens for 30-hex board', () => {
    const tokens = getTokenDistribution(30);
    expect(tokens).toHaveLength(28);
  });
});

describe('generateHarbors', () => {
  it('generates 9 harbors for 4-player', () => {
    const terrain = generateHexGrid(4);
    const water = generateWaterFrame(terrain);
    const harbors = generateHarbors(terrain, water, 4);
    expect(harbors).toHaveLength(9);
  });

  it('generates 11 harbors for 6-player', () => {
    const terrain = generateHexGrid(6);
    const water = generateWaterFrame(terrain);
    const harbors = generateHarbors(terrain, water, 6);
    expect(harbors).toHaveLength(11);
  });

  it('generates 13 harbors for 8-player', () => {
    const terrain = generateHexGrid(8);
    const water = generateWaterFrame(terrain);
    const harbors = generateHarbors(terrain, water, 8);
    expect(harbors).toHaveLength(13);
  });

  it('each harbor has 2 vertices', () => {
    const terrain = generateHexGrid(4);
    const water = generateWaterFrame(terrain);
    const harbors = generateHarbors(terrain, water, 4);
    for (const h of harbors) {
      expect(h.vertices).toHaveLength(2);
    }
  });

  it('includes both generic and specific harbor types', () => {
    const terrain = generateHexGrid(4);
    const water = generateWaterFrame(terrain);
    const harbors = generateHarbors(terrain, water, 4);
    const types = new Set(harbors.map((h) => h.type));
    expect(types.has(HarborType.Generic)).toBe(true);
    expect(types.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Custom (procedural) board generation
// ---------------------------------------------------------------------------

describe('generateBoard with Custom mapType', () => {
  const testCases = [
    { tileCount: 19, shape: BoardShape.Round },
    { tileCount: 50, shape: BoardShape.Round },
    { tileCount: 100, shape: BoardShape.Elongated },
    { tileCount: 50, shape: BoardShape.Star },
    { tileCount: 37, shape: BoardShape.Random },
    { tileCount: 200, shape: BoardShape.Round },
  ];

  for (const { tileCount, shape } of testCases) {
    describe(`tileCount=${tileCount}, shape=${shape}`, () => {
      const board = generateBoard({
        playerCount: 4,
        mapType: MapType.Custom,
        customMapConfig: { tileCount, shape },
      });

      it('produces the correct number of hexes', () => {
        expect(board.hexes).toHaveLength(tileCount);
      });

      it('has at least 1 desert', () => {
        const deserts = board.hexes.filter(h => h.terrain === TerrainType.Desert);
        expect(deserts.length).toBeGreaterThanOrEqual(1);
      });

      it('all non-desert hexes have number tokens', () => {
        for (const h of board.hexes) {
          if (h.terrain !== TerrainType.Desert) {
            expect(h.numberToken).not.toBeNull();
            expect(h.numberToken).toBeGreaterThanOrEqual(2);
            expect(h.numberToken).toBeLessThanOrEqual(12);
          }
        }
      });

      it('no number token is 7', () => {
        for (const h of board.hexes) {
          expect(h.numberToken).not.toBe(7);
        }
      });

      it('desert hexes have no number token', () => {
        for (const h of board.hexes) {
          if (h.terrain === TerrainType.Desert) {
            expect(h.numberToken).toBeNull();
          }
        }
      });

      it('has at least 5 harbors', () => {
        expect(board.harbors.length).toBeGreaterThanOrEqual(5);
      });

      it('each harbor has 2 vertices', () => {
        for (const h of board.harbors) {
          expect(h.vertices).toHaveLength(2);
        }
      });

      it('has both generic and specific harbors', () => {
        const types = new Set(board.harbors.map(h => h.type));
        expect(types.has(HarborType.Generic)).toBe(true);
        expect(types.size).toBeGreaterThan(1);
      });

      it('has water hexes', () => {
        expect(board.waterHexes.length).toBeGreaterThan(0);
      });

      it('initializes empty building maps', () => {
        expect(board.vertexBuildings.size).toBe(0);
        expect(board.edgeBuildings.size).toBe(0);
      });
    });
  }
});

describe('generateBoard with custom ratios', () => {
  it('0% desert and 0% water means all tiles are resource', () => {
    const board = generateBoard({
      playerCount: 4,
      mapType: MapType.Custom,
      customMapConfig: { tileCount: 37, shape: BoardShape.Round, resourceRatio: 100, desertRatio: 0, waterRatio: 0 },
    });
    const deserts = board.hexes.filter(h => h.terrain === TerrainType.Desert);
    expect(deserts).toHaveLength(0);
    // All 37 canvas tiles become land
    expect(board.hexes).toHaveLength(37);
  });

  it('50/50 resource/desert splits land tiles roughly evenly', () => {
    const board = generateBoard({
      playerCount: 4,
      mapType: MapType.Custom,
      customMapConfig: { tileCount: 50, shape: BoardShape.Round, resourceRatio: 50, desertRatio: 50, waterRatio: 0 },
    });
    const deserts = board.hexes.filter(h => h.terrain === TerrainType.Desert);
    // 50% of 50 canvas = 25 desert tiles
    expect(deserts.length).toBeGreaterThanOrEqual(24);
    // All canvas tiles are land (no water ratio)
    expect(board.hexes).toHaveLength(50);
  });

  it('water ratio reduces land tile count', () => {
    const board = generateBoard({
      playerCount: 4,
      mapType: MapType.Custom,
      customMapConfig: { tileCount: 50, shape: BoardShape.Round, resourceRatio: 60, desertRatio: 0, waterRatio: 40 },
    });
    // 40% of 50 canvas = ~20 water → ~30 land tiles
    expect(board.hexes.length).toBeLessThanOrEqual(35);
    expect(board.hexes.length).toBeGreaterThanOrEqual(25);
    expect(board.waterHexes.length).toBeGreaterThan(0);
  });

  it('default ratios (~95/5/0) produce mostly resource with some desert', () => {
    const board = generateBoard({
      playerCount: 4,
      mapType: MapType.Custom,
      customMapConfig: { tileCount: 19, shape: BoardShape.Round },
    });
    const deserts = board.hexes.filter(h => h.terrain === TerrainType.Desert);
    // Default: ~5% of 19 = ~1 desert, rest resource. Land count = 19 (0% water)
    expect(deserts.length).toBeGreaterThanOrEqual(1);
    expect(board.hexes).toHaveLength(19);
  });

  it('100% water ratio produces 0 land tiles', () => {
    const board = generateBoard({
      playerCount: 4,
      mapType: MapType.Custom,
      customMapConfig: { tileCount: 19, shape: BoardShape.Round, resourceRatio: 0, desertRatio: 0, waterRatio: 100 },
    });
    expect(board.hexes).toHaveLength(0);
    expect(board.waterHexes.length).toBeGreaterThan(0);
  });
});

describe('generateBoard with seed', () => {
  it('same seed produces same board layout', () => {
    const config: { playerCount: number; mapType: MapType; customMapConfig: CustomMapConfig } = {
      playerCount: 4,
      mapType: MapType.Custom,
      customMapConfig: { tileCount: 50, shape: BoardShape.Random, seed: 'test-seed-123' },
    };
    const a = generateBoard(config);
    const b = generateBoard(config);
    // Hex coordinates should be identical
    const aCoords = a.hexes.map(h => `${h.coord.q},${h.coord.r}`).sort();
    const bCoords = b.hexes.map(h => `${h.coord.q},${h.coord.r}`).sort();
    expect(aCoords).toEqual(bCoords);
  });
});
