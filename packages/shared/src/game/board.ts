import { TerrainType, HarborType } from '../types/resources.js';
import type { Board, HexTile, Harbor } from '../types/game.js';
import { MapType } from '../types/game.js';
import type { HexCoord, VertexId } from '../hex/coordinates.js';
import { VertexDirection, hexNeighbors, hexEquals } from '../hex/coordinates.js';
import { generateHexGrid, generateWaterFrame } from '../hex/board-layout.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateBoard(config: { playerCount: number; mapType: MapType }): Board {
  const pc = normalizePlayerCount(config.playerCount);
  const terrainHexes = generateHexGrid(pc);
  const waterHexes = generateWaterFrame(terrainHexes);

  const terrains = generateTerrainAssignment(terrainHexes.length, config.mapType);
  const hexes: HexTile[] = terrainHexes.map((coord, i) => ({
    coord,
    terrain: terrains[i],
    numberToken: null,
  }));

  generateNumberTokens(hexes);
  const harbors = generateHarbors(terrainHexes, waterHexes, pc);

  return {
    hexes,
    waterHexes,
    harbors,
    vertexBuildings: new Map(),
    edgeBuildings: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Terrain assignment
// ---------------------------------------------------------------------------

export function generateTerrainAssignment(hexCount: number, mapType: MapType): TerrainType[] {
  if (mapType === MapType.Random) {
    return shuffledTerrainList(hexCount);
  }
  // Standard and preset maps use canonical distribution, then shuffle
  return shuffledTerrainList(hexCount);
}

function shuffledTerrainList(hexCount: number): TerrainType[] {
  const counts = getTerrainCountsFromHexCount(hexCount);
  const list: TerrainType[] = [];
  for (const [terrain, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) list.push(terrain as TerrainType);
  }
  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ---------------------------------------------------------------------------
// Terrain counts by player count
// ---------------------------------------------------------------------------

export function getTerrainCounts(playerCount: number): Record<TerrainType, number> {
  const pc = normalizePlayerCount(playerCount);
  const hexCount = generateHexGrid(pc).length;
  return getTerrainCountsFromHexCount(hexCount);
}

function getTerrainCountsFromHexCount(hexCount: number): Record<TerrainType, number> {
  // Standard 4-player (19 hexes): 3 hills, 4 forest, 3 mountains, 4 fields, 4 pasture, 1 desert
  // 6-player (30 hexes): 5 hills, 6 forest, 5 mountains, 6 fields, 6 pasture, 2 desert
  // 8-player (42 hexes): 7 hills, 8 forest, 7 mountains, 8 fields, 8 pasture, 4 desert
  if (hexCount <= 19) {
    return {
      [TerrainType.Hills]: 3,
      [TerrainType.Forest]: 4,
      [TerrainType.Mountains]: 3,
      [TerrainType.Fields]: 4,
      [TerrainType.Pasture]: 4,
      [TerrainType.Desert]: 1,
    };
  }
  if (hexCount <= 30) {
    return {
      [TerrainType.Hills]: 5,
      [TerrainType.Forest]: 6,
      [TerrainType.Mountains]: 5,
      [TerrainType.Fields]: 6,
      [TerrainType.Pasture]: 6,
      [TerrainType.Desert]: 2,
    };
  }
  // 42 hexes
  return {
    [TerrainType.Hills]: 7,
    [TerrainType.Forest]: 8,
    [TerrainType.Mountains]: 7,
    [TerrainType.Fields]: 8,
    [TerrainType.Pasture]: 8,
    [TerrainType.Desert]: 4,
  };
}

// ---------------------------------------------------------------------------
// Number token distribution & placement
// ---------------------------------------------------------------------------

export function getTokenDistribution(hexCount: number): number[] {
  // Standard 18 producing hexes (4-player): canonical Catan tokens
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const producingCount = hexCount - desertCount(hexCount);

  if (producingCount <= base.length) {
    return base.slice(0, producingCount);
  }

  // For larger boards, repeat the base distribution
  const tokens: number[] = [...base];
  let idx = 0;
  while (tokens.length < producingCount) {
    tokens.push(base[idx % base.length]);
    idx++;
  }
  return tokens;
}

function desertCount(hexCount: number): number {
  if (hexCount <= 19) return 1;
  if (hexCount <= 30) return 2;
  return 4;
}

export function generateNumberTokens(hexes: HexTile[]): void {
  const producingHexes = hexes.filter((h) => h.terrain !== TerrainType.Desert);
  const tokens = getTokenDistribution(hexes.length);

  // Shuffle tokens
  for (let i = tokens.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
  }

  // Try to place with no adjacent 6/8; retry up to 100 times
  for (let attempt = 0; attempt < 100; attempt++) {
    assignTokens(producingHexes, tokens);
    if (!hasAdjacentHighValue(producingHexes)) return;

    // Reshuffle
    for (let i = tokens.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
    }
  }
  // Fallback: assign as-is after exhausting retries
  assignTokens(producingHexes, tokens);
}

function assignTokens(hexes: HexTile[], tokens: number[]): void {
  for (let i = 0; i < hexes.length; i++) {
    hexes[i].numberToken = tokens[i];
  }
}

function hasAdjacentHighValue(hexes: HexTile[]): boolean {
  const highValue = new Set<string>();
  for (const h of hexes) {
    if (h.numberToken === 6 || h.numberToken === 8) {
      highValue.add(`${h.coord.q},${h.coord.r}`);
    }
  }
  for (const h of hexes) {
    if (h.numberToken !== 6 && h.numberToken !== 8) continue;
    for (const n of hexNeighbors(h.coord)) {
      if (highValue.has(`${n.q},${n.r}`) && !hexEquals(n, h.coord)) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Harbor generation
// ---------------------------------------------------------------------------

export function generateHarbors(
  terrainHexes: HexCoord[],
  waterHexes: HexCoord[],
  playerCount: 4 | 6 | 8 = 4,
): Harbor[] {
  const harborCount = playerCount <= 4 ? 9 : playerCount <= 6 ? 11 : 13;
  const types = harborTypeDistribution(harborCount);

  // Shuffle harbor types
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const terrainSet = new Set(terrainHexes.map((h) => `${h.q},${h.r}`));

  // Find water hexes adjacent to terrain — these are valid harbor positions
  const edgeWater = waterHexes.filter((w) =>
    hexNeighbors(w).some((n) => terrainSet.has(`${n.q},${n.r}`)),
  );

  // Space harbors evenly around the edge
  const step = Math.max(1, Math.floor(edgeWater.length / harborCount));
  const harbors: Harbor[] = [];

  // Sort water hexes by angle from center for even distribution
  edgeWater.sort((a, b) => {
    const angleA = Math.atan2(a.r + a.q * 0.5, a.q * Math.sqrt(3) * 0.5);
    const angleB = Math.atan2(b.r + b.q * 0.5, b.q * Math.sqrt(3) * 0.5);
    return angleA - angleB;
  });

  for (let i = 0; i < harborCount && i * step < edgeWater.length; i++) {
    const waterHex = edgeWater[i * step];
    const adjacentTerrain = hexNeighbors(waterHex).filter((n) =>
      terrainSet.has(`${n.q},${n.r}`),
    );

    if (adjacentTerrain.length === 0) continue;

    const landHex = adjacentTerrain[0];
    const facing = directionFromTo(waterHex, landHex);
    const vertices = harborVertices(waterHex, landHex);

    harbors.push({
      type: types[i],
      vertices,
      position: waterHex,
      facing,
    });
  }

  return harbors;
}

function harborTypeDistribution(count: number): HarborType[] {
  // 4 generic + 5 specific for standard (9); scale for larger boards
  const specific = [
    HarborType.Brick,
    HarborType.Lumber,
    HarborType.Ore,
    HarborType.Grain,
    HarborType.Wool,
  ];
  const types: HarborType[] = [...specific];
  while (types.length < count) {
    types.push(HarborType.Generic);
  }
  return types;
}

function directionFromTo(from: HexCoord, to: HexCoord): number {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  // Map delta to direction index 0-5
  const dirs: [number, number, number][] = [
    [1, 0, 0],
    [0, 1, 1],
    [-1, 1, 2],
    [-1, 0, 3],
    [0, -1, 4],
    [1, -1, 5],
  ];
  for (const [dqd, drd, idx] of dirs) {
    if (dq === dqd && dr === drd) return idx;
  }
  return 0;
}

function harborVertices(waterHex: HexCoord, landHex: HexCoord): [VertexId, VertexId] {
  // The two vertices shared between waterHex and landHex
  const dir = directionFromTo(waterHex, landHex);
  // Each edge between two adjacent hexes connects two vertices
  // Use the land hex and pick the two vertices on the shared edge
  const vertexPairs: Record<number, [VertexId, VertexId]> = {
    0: [
      // E neighbor: shared edge connects N@(q+1,r) and S@(q+1,r-1)
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.N },
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.S },
    ],
    1: [
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.S },
      { hex: { q: landHex.q - 1, r: landHex.r + 1 }, direction: VertexDirection.N },
    ],
    2: [
      { hex: { q: landHex.q - 1, r: landHex.r + 1 }, direction: VertexDirection.N },
      { hex: { q: landHex.q, r: landHex.r + 1 }, direction: VertexDirection.N },
    ],
    3: [
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.N },
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.S },
    ],
    4: [
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.N },
      { hex: { q: landHex.q + 1, r: landHex.r - 1 }, direction: VertexDirection.S },
    ],
    5: [
      { hex: { q: landHex.q + 1, r: landHex.r - 1 }, direction: VertexDirection.S },
      { hex: { q: landHex.q, r: landHex.r }, direction: VertexDirection.N },
    ],
  };
  return vertexPairs[dir] ?? vertexPairs[0];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePlayerCount(count: number): 4 | 6 | 8 {
  if (count <= 4) return 4;
  if (count <= 6) return 6;
  return 8;
}
