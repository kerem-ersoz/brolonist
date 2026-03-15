import { TerrainType, HarborType, TERRAIN_RESOURCE } from '../types/resources.js';
import type { Board, HexTile, Harbor } from '../types/game.js';
import { MapType } from '../types/game.js';
import type { HexCoord, VertexId } from '../hex/coordinates.js';
import { VertexDirection, hexNeighbors, hexEquals } from '../hex/coordinates.js';
import { generateHexGrid, generateWaterFrame } from '../hex/board-layout.js';
import { generateProceduralGrid, hashSeed, mulberry32 } from '../hex/procedural.js';
import type { CustomMapConfig } from '../types/game.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateBoard(config: { playerCount: number; mapType: MapType; customMapConfig?: CustomMapConfig }): Board {
  // Custom procedural board
  if (config.mapType === MapType.Custom && config.customMapConfig) {
    return generateCustomBoard(config.customMapConfig);
  }

  // Custom board layouts
  if (config.mapType === MapType.Archipelago) {
    return generateArchipelagoBoard();
  }
  if (config.mapType === MapType.World) {
    return generateWorldBoard();
  }
  if (config.mapType === MapType.Diamond) {
    return generatePresetBoard(DIAMOND_HEXES, 9);
  }
  if (config.mapType === MapType.BritishIsles) {
    return generatePresetBoard(BRITISH_ISLES_HEXES, 16);
  }
  if (config.mapType === MapType.Gear) {
    return generatePresetBoard(GEAR_HEXES, 9);
  }
  if (config.mapType === MapType.Lakes) {
    return generateLakesBoard();
  }

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
// Archipelago: 4 islands of 5 hexes each, separated by water
// ---------------------------------------------------------------------------

function generateArchipelagoBoard(): Board {
  // 4 compact islands at compass points, each = center + 4 contiguous neighbors
  const islands: { center: HexCoord; neighborIndices: number[] }[] = [
    { center: { q: -3, r: 0 },  neighborIndices: [0, 1, 2, 3] },  // West:  E,SE,SW,W
    { center: { q: 0, r: -3 },  neighborIndices: [1, 2, 3, 4] },  // North: SE,SW,W,NW
    { center: { q: 3, r: -3 },  neighborIndices: [2, 3, 4, 5] },  // NE:    SW,W,NW,NE
    { center: { q: 0, r: 3 },   neighborIndices: [4, 5, 0, 1] },  // South: NW,NE,E,SE
  ];

  const terrainHexes: HexCoord[] = [];
  const terrainSet = new Set<string>();
  for (const island of islands) {
    const { center, neighborIndices } = island;
    terrainHexes.push(center);
    terrainSet.add(`${center.q},${center.r}`);
    const neighbors = hexNeighbors(center);
    for (const idx of neighborIndices) {
      const h = neighbors[idx];
      terrainHexes.push(h);
      terrainSet.add(`${h.q},${h.r}`);
    }
  }

  // Center hex and its SW neighbor — both get the same resource with guaranteed 6/8
  const centerHex: HexCoord = { q: 0, r: 0 };
  const swHex: HexCoord = { q: -1, r: 1 }; // SW of center

  // Desert hex in water, not adjacent to any land tile
  // (3, 0) — NE of (2,1), surrounded by water
  const desertHex: HexCoord = { q: 3, r: 0 };

  const allTerrainHexes = [...terrainHexes, centerHex, swHex, desertHex];
  terrainSet.add(`${centerHex.q},${centerHex.r}`);
  terrainSet.add(`${swHex.q},${swHex.r}`);
  terrainSet.add(`${desertHex.q},${desertHex.r}`);

  // Center water hexes — neighbors of center/SW that aren't terrain
  const centerWaterHexes: HexCoord[] = [];
  const centerAreaHexes = new Set<string>();
  for (const h of [...hexNeighbors(centerHex), ...hexNeighbors(swHex)]) {
    const key = `${h.q},${h.r}`;
    if (!terrainSet.has(key) && !centerAreaHexes.has(key)) {
      centerAreaHexes.add(key);
      centerWaterHexes.push(h);
    }
  }

  // Terrain assignment: 20 island hexes + center + SW = 22 resource tiles + 1 desert
  const centerResourceType = [TerrainType.Hills, TerrainType.Forest, TerrainType.Mountains, TerrainType.Fields, TerrainType.Pasture][Math.floor(Math.random() * 5)];
  const terrainPool: TerrainType[] = [
    ...Array(4).fill(TerrainType.Hills),
    ...Array(4).fill(TerrainType.Forest),
    ...Array(4).fill(TerrainType.Mountains),
    ...Array(4).fill(TerrainType.Fields),
    ...Array(4).fill(TerrainType.Pasture),
  ];
  // Shuffle island terrain
  for (let i = terrainPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [terrainPool[i], terrainPool[j]] = [terrainPool[j], terrainPool[i]];
  }
  // Append center hex, SW hex (same resource), and desert
  terrainPool.push(centerResourceType); // center
  terrainPool.push(centerResourceType); // SW neighbor
  terrainPool.push(TerrainType.Desert); // desert

  const hexes: HexTile[] = allTerrainHexes.map((coord, i) => ({
    coord,
    terrain: terrainPool[i],
    numberToken: null as number | null,
  }));

  generateNumberTokens(hexes);

  // Force center hex and SW hex to have 6 or 8
  const centerTile = hexes.find(h => h.coord.q === 0 && h.coord.r === 0)!;
  const swTile = hexes.find(h => h.coord.q === -1 && h.coord.r === 1)!;
  const specialTiles = [centerTile, swTile];

  for (const tile of specialTiles) {
    if (tile.numberToken !== 6 && tile.numberToken !== 8) {
      const swapTarget = hexes.find(h =>
        (h.numberToken === 6 || h.numberToken === 8) &&
        !specialTiles.includes(h) &&
        h.terrain !== TerrainType.Desert
      );
      if (swapTarget) {
        const tmp = tile.numberToken;
        tile.numberToken = swapTarget.numberToken;
        swapTarget.numberToken = tmp;
      }
    }
  }

  const outerWater = generateWaterFrame(allTerrainHexes);
  const waterHexes = [...outerWater, ...centerWaterHexes];

  // Custom harbor placement: 2 harbors per island + 1 matching harbor on center hex's east side
  const harborTypes = harborTypeDistribution(9); // 8 for islands + 1 for center
  // Shuffle harbor types
  for (let i = harborTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [harborTypes[i], harborTypes[j]] = [harborTypes[j], harborTypes[i]];
  }

  const waterSet = new Set(waterHexes.map(w => `${w.q},${w.r}`));
  const harboredTerrain = new Set<string>();
  // Don't place island harbors adjacent to SW or desert hex
  const excludeSet = new Set([
    `${swHex.q},${swHex.r}`,
    `${desertHex.q},${desertHex.r}`,
  ]);

  const harbors: Harbor[] = [];
  let typeIdx = 0;

  // Place matching harbor on the east side of center hex (0,0)
  // E neighbor of (0,0) is (1,0) — should be a water hex
  const centerEastWater: HexCoord = { q: 1, r: 0 };
  const centerResource = TERRAIN_RESOURCE[centerTile.terrain];
  const terrainToHarbor: Record<string, HarborType> = {
    brick: HarborType.Brick, lumber: HarborType.Lumber, ore: HarborType.Ore,
    grain: HarborType.Grain, wool: HarborType.Wool,
  };
  const matchingHarborType = centerResource ? (terrainToHarbor[centerResource] || HarborType.Generic) : HarborType.Generic;
  {
    const facing = directionFromTo(centerEastWater, centerHex);
    const vertices = harborVertices(centerEastWater, centerHex);
    harbors.push({
      type: matchingHarborType,
      vertices,
      position: centerEastWater,
      facing,
    });
    harboredTerrain.add(`${centerHex.q},${centerHex.r}`);
  }
  // Remove the matching type from the shuffled pool so we don't duplicate
  const matchIdx = harborTypes.findIndex(t => t === matchingHarborType);
  if (matchIdx !== -1) harborTypes.splice(matchIdx, 1);

  for (const island of islands) {
    let placed = 0;
    const islandHexes = [island.center, ...island.neighborIndices.map(idx => hexNeighbors(island.center)[idx])];

    // Find water hexes adjacent to this island's terrain
    const islandTerrainSet = new Set(islandHexes.map(h => `${h.q},${h.r}`));
    const islandWater = waterHexes.filter(w =>
      hexNeighbors(w).some(n => islandTerrainSet.has(`${n.q},${n.r}`))
    );

    // Sort for even distribution
    islandWater.sort((a, b) => {
      const angleA = Math.atan2(a.r + a.q * 0.5, a.q * Math.sqrt(3) * 0.5);
      const angleB = Math.atan2(b.r + b.q * 0.5, b.q * Math.sqrt(3) * 0.5);
      return angleA - angleB;
    });

    const step = Math.max(1, Math.floor(islandWater.length / 2));
    for (let idx = 0; idx < islandWater.length && placed < 2; idx++) {
      if (placed === 0 && idx % step !== 0) continue;
      if (placed === 1 && idx % step !== Math.floor(step / 2)) continue;

      const wh = islandWater[idx];
      const adjTerrain = hexNeighbors(wh).filter(n => islandTerrainSet.has(`${n.q},${n.r}`));
      // Skip if connects to excluded hexes or already harbored terrain
      const validAdj = adjTerrain.filter(n =>
        !excludeSet.has(`${n.q},${n.r}`) && !harboredTerrain.has(`${n.q},${n.r}`)
      );
      if (validAdj.length === 0) continue;

      const landHex = validAdj[0];
      const facing = directionFromTo(wh, landHex);
      const vertices = harborVertices(wh, landHex);

      for (const t of adjTerrain) harboredTerrain.add(`${t.q},${t.r}`);

      harbors.push({
        type: harborTypes[typeIdx++] || HarborType.Generic,
        vertices,
        position: wh,
        facing,
      });
      placed++;
    }

    // Fallback: if couldn't place 2, try any remaining water hex for this island
    if (placed < 2) {
      for (const wh of islandWater) {
        if (placed >= 2) break;
        if (harbors.some(h => h.position.q === wh.q && h.position.r === wh.r)) continue;
        const adjTerrain = hexNeighbors(wh).filter(n => islandTerrainSet.has(`${n.q},${n.r}`));
        const validAdj = adjTerrain.filter(n =>
          !excludeSet.has(`${n.q},${n.r}`) && !harboredTerrain.has(`${n.q},${n.r}`)
        );
        if (validAdj.length === 0) continue;

        const landHex = validAdj[0];
        const facing = directionFromTo(wh, landHex);
        const vertices = harborVertices(wh, landHex);
        for (const t of adjTerrain) harboredTerrain.add(`${t.q},${t.r}`);

        harbors.push({
          type: harborTypes[typeIdx++] || HarborType.Generic,
          vertices,
          position: wh,
          facing,
        });
        placed++;
      }
    }
  }

  return {
    hexes,
    waterHexes,
    harbors,
    vertexBuildings: new Map(),
    edgeBuildings: new Map(),
  };
}

// ---------------------------------------------------------------------------
// World map: Earth continents as island groups
// ---------------------------------------------------------------------------

function generateWorldBoard(): Board {
  // Helper to create hex arrays from row definitions
  const h = (q: number, r: number): HexCoord => ({ q, r });

  // ── North America (top-left) ──
  const northAmerica: HexCoord[] = [
    // Alaska + NW Canada
    h(-8, -4), h(-7, -4), h(-6, -4),
    // Canada
    h(-9, -3), h(-8, -3), h(-7, -3), h(-6, -3), h(-5, -3),
    // Northern US + Great Lakes
    h(-9, -2), h(-8, -2), h(-7, -2), h(-6, -2), h(-5, -2),
    // Central US
    h(-8, -1), h(-7, -1), h(-6, -1), h(-5, -1),
    // Southern US + Mexico
    h(-8, 0), h(-7, 0), h(-6, 0),
    // Mexico + Central America
    h(-7, 1), h(-6, 1),
  ];

  // ── South America (bottom-left) ──
  const southAmerica: HexCoord[] = [
    // Colombia, Venezuela
    h(-5, 2), h(-4, 2),
    // Brazil north, Peru
    h(-6, 3), h(-5, 3), h(-4, 3),
    // Brazil central, Bolivia
    h(-6, 4), h(-5, 4), h(-4, 4),
    // Brazil south, Paraguay, Argentina
    h(-5, 5), h(-4, 5),
    // Argentina, Chile
    h(-5, 6), h(-4, 6),
    // Patagonia
    h(-4, 7),
  ];

  // ── Europe (top-center) ──
  const europe: HexCoord[] = [
    // Scandinavia
    h(-1, -5), h(0, -5),
    // UK, France north, Germany, Poland
    h(-2, -4), h(-1, -4), h(0, -4), h(1, -4),
    // Iberia, France, Central Europe
    h(-2, -3), h(-1, -3), h(0, -3), h(1, -3), h(2, -3),
    // Mediterranean, Italy, Balkans, Turkey (Thrace)
    h(-1, -2), h(0, -2), h(1, -2), h(2, -2),
  ];

  // ── Africa (center-bottom) ──
  const africa: HexCoord[] = [
    // North Africa (Morocco, Algeria, Libya, Egypt)
    h(-1, -1), h(0, -1), h(1, -1), h(2, -1),
    // Sahel (Mauritania → Chad → Sudan)
    h(-1, 0), h(0, 0), h(1, 0), h(2, 0), h(3, 0),
    // West + Central + East Africa
    h(0, 1), h(1, 1), h(2, 1), h(3, 1),
    // Congo, Tanzania, Kenya
    h(0, 2), h(1, 2), h(2, 2), h(3, 2),
    // Southern Africa
    h(1, 3), h(2, 3),
    // South Africa
    h(1, 4), h(2, 4),
  ];

  // ── Asia (top-right, largest continent) ──
  const asia: HexCoord[] = [
    // Siberia
    h(3, -5), h(4, -5), h(5, -5), h(6, -5), h(7, -5),
    // Russia + Central Asia
    h(3, -4), h(4, -4), h(5, -4), h(6, -4), h(7, -4), h(8, -4),
    // Turkey (Anatolia), Iran, Central Asia, Mongolia, NE China
    h(3, -3), h(4, -3), h(5, -3), h(6, -3), h(7, -3), h(8, -3),
    // Middle East, India north, China, Korea, Japan
    h(3, -2), h(4, -2), h(5, -2), h(6, -2), h(7, -2), h(8, -2), h(9, -2),
    // Arabia, India, SE Asia, S China
    h(4, -1), h(5, -1), h(6, -1), h(7, -1), h(8, -1),
    // India south, SE Asia
    h(5, 0), h(6, 0), h(7, 0),
    // Indonesia
    h(7, 1), h(8, 1),
  ];

  // ── Australia (bottom-right) ──
  const australia: HexCoord[] = [
    h(8, 2), h(9, 2),
    h(7, 3), h(8, 3), h(9, 3),
    h(8, 4), h(9, 4),
  ];

  const allLand = [...northAmerica, ...southAmerica, ...europe, ...africa, ...asia, ...australia];

  // Terrain assignment by continent character
  const terrainMap: Record<string, TerrainType> = {};
  const a = (coords: HexCoord[], t: TerrainType) => {
    for (const c of coords) terrainMap[`${c.q},${c.r}`] = t;
  };

  // North America: forests in north, fields in central, desert in SW
  a([h(-8,-4), h(-7,-4), h(-6,-4)], TerrainType.Forest);  // Alaska/NW
  a([h(-9,-3), h(-8,-3), h(-7,-3)], TerrainType.Forest);  // Canada
  a([h(-6,-3), h(-5,-3)], TerrainType.Pasture);
  a([h(-9,-2), h(-8,-2)], TerrainType.Forest);
  a([h(-7,-2), h(-6,-2), h(-5,-2)], TerrainType.Fields);  // Great Lakes
  a([h(-8,-1), h(-7,-1), h(-6,-1)], TerrainType.Fields);  // Central US
  a([h(-5,-1)], TerrainType.Mountains);
  a([h(-8,0), h(-7,0)], TerrainType.Desert);  // SW US
  a([h(-6,0)], TerrainType.Hills);
  a([h(-7,1), h(-6,1)], TerrainType.Forest);  // Mexico/Central America

  // South America: forest (Amazon), mountains (Andes), fields (Pampas)
  a([h(-5,2), h(-4,2)], TerrainType.Forest);
  a([h(-6,3), h(-5,3), h(-4,3)], TerrainType.Forest);  // Amazon
  a([h(-6,4)], TerrainType.Mountains);  // Andes
  a([h(-5,4), h(-4,4)], TerrainType.Forest);
  a([h(-5,5)], TerrainType.Mountains);
  a([h(-4,5)], TerrainType.Fields);     // Pampas
  a([h(-5,6)], TerrainType.Hills);
  a([h(-4,6)], TerrainType.Pasture);
  a([h(-4,7)], TerrainType.Pasture);    // Patagonia

  // Europe: pasture, hills, forests
  a([h(-1,-5), h(0,-5)], TerrainType.Forest);  // Scandinavia
  a([h(-2,-4)], TerrainType.Pasture);  // UK
  a([h(-1,-4), h(0,-4)], TerrainType.Fields);  // France, Germany
  a([h(1,-4)], TerrainType.Forest);   // Poland/Baltics
  a([h(-2,-3)], TerrainType.Pasture); // Iberia
  a([h(-1,-3)], TerrainType.Hills);   // France south
  a([h(0,-3)], TerrainType.Mountains); // Alps
  a([h(1,-3), h(2,-3)], TerrainType.Fields); // Central/East Europe
  a([h(-1,-2)], TerrainType.Hills);   // Italy
  a([h(0,-2), h(1,-2)], TerrainType.Pasture); // Balkans
  a([h(2,-2)], TerrainType.Hills);    // Turkey Thrace

  // Africa: desert north, forest central, pasture/hills south
  a([h(-1,-1), h(0,-1), h(1,-1), h(2,-1)], TerrainType.Desert);  // Sahara
  a([h(-1,0), h(0,0), h(1,0)], TerrainType.Desert);   // Sahel
  a([h(2,0), h(3,0)], TerrainType.Pasture);
  a([h(0,1), h(1,1)], TerrainType.Forest);   // West Africa
  a([h(2,1), h(3,1)], TerrainType.Forest);   // Congo/East Africa
  a([h(0,2), h(1,2)], TerrainType.Forest);   // Congo basin
  a([h(2,2)], TerrainType.Pasture);
  a([h(3,2)], TerrainType.Hills);
  a([h(1,3)], TerrainType.Pasture);   // Mozambique
  a([h(2,3)], TerrainType.Hills);
  a([h(1,4)], TerrainType.Pasture);   // South Africa
  a([h(2,4)], TerrainType.Fields);

  // Asia: vast and varied
  a([h(3,-5), h(4,-5), h(5,-5), h(6,-5), h(7,-5)], TerrainType.Forest);  // Siberia
  a([h(3,-4), h(4,-4)], TerrainType.Pasture);  // Steppe
  a([h(5,-4), h(6,-4)], TerrainType.Forest);   // Taiga
  a([h(7,-4), h(8,-4)], TerrainType.Forest);   // East Siberia
  a([h(3,-3)], TerrainType.Mountains);  // Anatolia/Caucasus
  a([h(4,-3), h(5,-3)], TerrainType.Desert);  // Central Asia
  a([h(6,-3)], TerrainType.Pasture);   // Mongolia
  a([h(7,-3), h(8,-3)], TerrainType.Fields);  // NE China
  a([h(3,-2)], TerrainType.Desert);   // Middle East
  a([h(4,-2)], TerrainType.Mountains); // Iran
  a([h(5,-2)], TerrainType.Mountains); // Hindu Kush
  a([h(6,-2), h(7,-2)], TerrainType.Fields);  // China
  a([h(8,-2)], TerrainType.Hills);    // Korea
  a([h(9,-2)], TerrainType.Mountains); // Japan
  a([h(4,-1)], TerrainType.Desert);   // Arabia
  a([h(5,-1)], TerrainType.Fields);   // India north
  a([h(6,-1)], TerrainType.Fields);   // India
  a([h(7,-1), h(8,-1)], TerrainType.Forest);  // SE Asia
  a([h(5,0)], TerrainType.Pasture);   // India south
  a([h(6,0)], TerrainType.Forest);    // Myanmar/Thailand
  a([h(7,0)], TerrainType.Forest);    // Malay
  a([h(7,1), h(8,1)], TerrainType.Forest);    // Indonesia

  // Australia: desert center, pasture coast
  a([h(8,2), h(9,2)], TerrainType.Pasture);
  a([h(7,3)], TerrainType.Pasture);
  a([h(8,3)], TerrainType.Desert);
  a([h(9,3)], TerrainType.Hills);
  a([h(8,4)], TerrainType.Desert);
  a([h(9,4)], TerrainType.Pasture);

  const hexes: HexTile[] = allLand.map((coord) => ({
    coord,
    terrain: terrainMap[`${coord.q},${coord.r}`] ?? TerrainType.Pasture,
    numberToken: null as number | null,
  }));

  generateNumberTokens(hexes);

  const waterHexes = generateWaterFrame(allLand);
  const harbors = generateHarbors(allLand, waterHexes, 8);

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

export function generateTerrainAssignment(hexCount: number, _mapType: MapType): TerrainType[] {
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
  if (hexCount <= 42) {
    return {
      [TerrainType.Hills]: 7,
      [TerrainType.Forest]: 8,
      [TerrainType.Mountains]: 7,
      [TerrainType.Fields]: 8,
      [TerrainType.Pasture]: 8,
      [TerrainType.Desert]: 4,
    };
  }
  // Arbitrary count: scale proportionally from base ratios
  return getScaledTerrainCounts(hexCount);
}

/** Scale terrain distribution proportionally for arbitrary hex counts. */
function getScaledTerrainCounts(hexCount: number): Record<TerrainType, number> {
  // Base ratios from 4-player (19 hexes): hills=3, forest=4, mountains=3, fields=4, pasture=4, desert=1
  const deserts = Math.max(1, Math.round(hexCount / 19));
  const resourceCount = hexCount - deserts;
  const perType = Math.floor(resourceCount / 5);
  const remainder = resourceCount - perType * 5;
  // Distribute remainder to types in order of base priority (forest, fields, pasture first)
  const types = [TerrainType.Forest, TerrainType.Fields, TerrainType.Pasture, TerrainType.Hills, TerrainType.Mountains];
  const counts: Record<string, number> = {};
  for (let i = 0; i < types.length; i++) {
    counts[types[i]] = perType + (i < remainder ? 1 : 0);
  }
  counts[TerrainType.Desert] = deserts;
  return counts as Record<TerrainType, number>;
}

// ---------------------------------------------------------------------------
// Custom procedural board generation
// ---------------------------------------------------------------------------

function generateCustomBoard(config: CustomMapConfig): Board {
  // tileCount = total canvas size (solid shape). Ratios split it into resource/desert/water.
  const canvasTiles = config.tileCount;
  const rr = config.resourceRatio ?? 95;
  const dr = config.desertRatio ?? 5;
  const wr = config.waterRatio ?? (100 - rr - dr);
  const total = rr + dr + wr;
  const waterCount = total > 0 ? Math.max(0, Math.round(canvasTiles * wr / total)) : 0;
  const desertCount = total > 0 ? Math.max(0, Math.round(canvasTiles * dr / total)) : 0;

  // Generate the full solid canvas
  const allPositions = canvasTiles > 0
    ? generateProceduralGrid(canvasTiles, config.shape, config.seed)
    : [];

  // Use a seeded RNG to shuffle positions, then assign water/desert/resource
  const numericSeed = config.seed ? hashSeed(config.seed) : canvasTiles * 31337;
  const rng = mulberry32(numericSeed);
  const indices = allPositions.map((_, i) => i);
  // Fisher-Yates shuffle with seeded RNG
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // First `waterCount` shuffled indices become water, next `desertCount` become desert, rest resource
  const tileType = new Map<number, 'water' | 'desert' | 'resource'>();
  for (let i = 0; i < indices.length; i++) {
    if (i < waterCount) {
      tileType.set(indices[i], 'water');
    } else if (i < waterCount + desertCount) {
      tileType.set(indices[i], 'desert');
    } else {
      tileType.set(indices[i], 'resource');
    }
  }

  const landPositions: HexCoord[] = [];
  const internalWater: HexCoord[] = [];
  const terrainTypes: TerrainType[] = [];

  for (let i = 0; i < allPositions.length; i++) {
    const type = tileType.get(i)!;
    if (type === 'water') {
      internalWater.push(allPositions[i]);
    } else {
      landPositions.push(allPositions[i]);
      terrainTypes.push(type === 'desert' ? TerrainType.Desert : TerrainType.Pasture); // placeholder
    }
  }

  // Build proper terrain pool for land tiles (evenly split resources + exact desert count)
  const actualDeserts = terrainTypes.filter(t => t === TerrainType.Desert).length;
  const pool = generateRatioTerrainPool(landPositions.length, actualDeserts);
  const hexes: HexTile[] = landPositions.map((coord, i) => ({
    coord,
    terrain: pool[i],
    numberToken: null,
  }));
  generateNumberTokens(hexes);

  // Water = single-tile border around the shape + internal water tiles
  const landSet = new Set(landPositions.map(h => `${h.q},${h.r}`));
  const borderWater = generateWaterFrame(allPositions);
  const waterHexes = [...borderWater, ...internalWater];

  // Scale harbor count based on land-adjacent water
  const frameWater = borderWater.filter(w =>
    hexNeighbors(w).some(n => landSet.has(`${n.q},${n.r}`)),
  );
  const harborCount = Math.max(5, Math.round(frameWater.length / 3));
  const harbors = generateHarborsN(landPositions, waterHexes, harborCount);
  return { hexes, waterHexes, harbors, vertexBuildings: new Map(), edgeBuildings: new Map() };
}

// ---------------------------------------------------------------------------
// Number token distribution & placement
// ---------------------------------------------------------------------------

export function getTokenDistribution(hexCount: number): number[] {
  const producingCount = hexCount - desertCount(hexCount);
  return getTokenDistributionForCount(producingCount);
}

function getTokenDistributionForCount(producingCount: number): number[] {
  // Standard 18 producing hexes (4-player): canonical Catan tokens
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

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
  if (hexCount <= 42) return 4;
  // Scale: ~1 desert per 10–12 hexes, minimum 1
  return Math.max(1, Math.round(hexCount / 11));
}

export function generateNumberTokens(hexes: HexTile[]): void {
  const producingHexes = hexes.filter((h) => h.terrain !== TerrainType.Desert);
  const tokens = getTokenDistributionForCount(producingHexes.length);

  // Shuffle tokens
  for (let i = tokens.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
  }

  // Try to place with balanced probability; retry up to 100 times
  for (let attempt = 0; attempt < 100; attempt++) {
    assignTokens(producingHexes, tokens);
    if (!hasProbabilityViolation(hexes)) return;

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

/** Probability dots for each number token (how many ways to roll it with 2d6). */
function probabilityDots(n: number | null): number {
  if (n == null) return 0;
  return 6 - Math.abs(n - 7); // 2→1, 3→2, 4→3, 5→4, 6→5, 8→5, 9→4, 10→3, 11→2, 12→1
}

/** Max allowed probability dots at any single vertex (sum of up to 3 adjacent hex dots). */
const MAX_VERTEX_DOTS = 12; // blocks triples like (6,6,8)=15, (5,6,8)=14, (6,8,5)=14
/** Min allowed probability dots at a vertex with 3 producing hexes. */
const MIN_VERTEX_DOTS = 4;  // blocks triples like (2,12,2)=3, (2,12,3)=4 is ok

/**
 * Check for probability violations:
 * 1. No two adjacent 6/8 hexes
 * 2. No vertex with extreme combined probability
 */
function hasProbabilityViolation(hexes: HexTile[]): boolean {
  const hexMap = new Map<string, HexTile>();
  for (const h of hexes) hexMap.set(`${h.coord.q},${h.coord.r}`, h);

  // Check 1: no adjacent 6/8
  for (const h of hexes) {
    if (h.numberToken !== 6 && h.numberToken !== 8) continue;
    for (const n of hexNeighbors(h.coord)) {
      const neighbor = hexMap.get(`${n.q},${n.r}`);
      if (neighbor && (neighbor.numberToken === 6 || neighbor.numberToken === 8)) {
        return true;
      }
    }
  }

  // Check 2: vertex probability balance
  // Each vertex is shared by up to 3 hexes. We check N and S vertices per hex.
  const checkedVertices = new Set<string>();
  for (const h of hexes) {
    for (const dir of [VertexDirection.N, VertexDirection.S]) {
      // Adjacent hexes for this vertex
      const adjCoords = dir === VertexDirection.N
        ? [h.coord, { q: h.coord.q, r: h.coord.r - 1 }, { q: h.coord.q + 1, r: h.coord.r - 1 }]
        : [h.coord, { q: h.coord.q, r: h.coord.r + 1 }, { q: h.coord.q - 1, r: h.coord.r + 1 }];

      // Canonical key for deduplication
      const sortedKeys = adjCoords.map(c => `${c.q},${c.r}`).sort();
      const vertexKey = sortedKeys.join('|');
      if (checkedVertices.has(vertexKey)) continue;
      checkedVertices.add(vertexKey);

      const adjHexes = adjCoords.map(c => hexMap.get(`${c.q},${c.r}`)).filter(Boolean) as HexTile[];
      const producingAdj = adjHexes.filter(ah => ah.numberToken != null);
      if (producingAdj.length < 2) continue; // single or no hex vertices can't be extreme

      const totalDots = producingAdj.reduce((sum, ah) => sum + probabilityDots(ah.numberToken), 0);

      if (totalDots > MAX_VERTEX_DOTS) return true;
      if (producingAdj.length >= 3 && totalDots < MIN_VERTEX_DOTS) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Vanity water hex selection
// ---------------------------------------------------------------------------

/** Pick up to 3 water hexes for vanity sprites. Prefer hexes with the most water neighbors (fewest terrain neighbors). */
function pickVanityWaterHexes(
  waterHexes: HexCoord[],
  terrainHexes: HexCoord[],
): Array<{ coord: HexCoord; variant: number }> {
  const terrainSet = new Set(terrainHexes.map(h => `${h.q},${h.r}`));
  const waterSet = new Set(waterHexes.map(h => `${h.q},${h.r}`));

  // Score each water hex by how many water neighbors it has (higher = more "open water")
  const scored = waterHexes.map(w => {
    const neighbors = hexNeighbors(w);
    const waterNeighborCount = neighbors.filter(n => waterSet.has(`${n.q},${n.r}`)).length;
    const terrainNeighborCount = neighbors.filter(n => terrainSet.has(`${n.q},${n.r}`)).length;
    return { coord: w, score: waterNeighborCount - terrainNeighborCount };
  });

  // Sort by score descending, then shuffle within same score for variety
  scored.sort((a, b) => b.score - a.score || (Math.random() - 0.5));

  // Pick top 3, ensuring they're not adjacent to each other
  const picked = new Set<string>();
  const result: Array<{ coord: HexCoord; variant: number }> = [];
  const variants = [1, 2, 3];
  for (let i = variants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [variants[i], variants[j]] = [variants[j], variants[i]];
  }

  for (const candidate of scored) {
    if (result.length >= 3) break;
    const key = `${candidate.coord.q},${candidate.coord.r}`;
    // Don't place adjacent to another vanity hex
    if (hexNeighbors(candidate.coord).some(n => picked.has(`${n.q},${n.r}`))) continue;
    picked.add(key);
    result.push({ coord: candidate.coord, variant: variants[result.length] });
  }

  return result;
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

  // Track which terrain hexes already have a harbor adjacent
  const harboredTerrainHexes = new Set<string>();
  const usedWaterHexes = new Set<string>();

  // Greedy placement: iterate edge water with spacing, skip if all adjacent terrain already harbored
  let placed = 0;
  for (let pass = 0; pass < 2 && placed < harborCount; pass++) {
    // First pass: use step spacing. Second pass: fill remaining from unused water hexes.
    for (let idx = 0; idx < edgeWater.length && placed < harborCount; idx++) {
      if (pass === 0 && idx % step !== 0) continue;
      const waterHex = edgeWater[idx];
      const wKey = `${waterHex.q},${waterHex.r}`;
      if (usedWaterHexes.has(wKey)) continue;

      const adjacentTerrain = hexNeighbors(waterHex).filter((n) =>
        terrainSet.has(`${n.q},${n.r}`),
      );
      if (adjacentTerrain.length === 0) continue;

      // Skip if all adjacent terrain hexes are already harbored
      if (adjacentTerrain.every(h => harboredTerrainHexes.has(`${h.q},${h.r}`))) continue;

      // Pick first adjacent terrain hex that doesn't already have a harbor
      const landHex = adjacentTerrain.find(h => !harboredTerrainHexes.has(`${h.q},${h.r}`))
        ?? adjacentTerrain[0];

      const facing = directionFromTo(waterHex, landHex);
      const vertices = harborVertices(waterHex, landHex);

      // Mark adjacent terrain hexes as harbored
      for (const t of adjacentTerrain) {
        harboredTerrainHexes.add(`${t.q},${t.r}`);
      }
      usedWaterHexes.add(wKey);

      harbors.push({
        type: types[placed],
        vertices,
        position: waterHex,
        facing,
      });
      placed++;
    }
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
  // Find the two corners of the water hex that border the land hex.
  // Express them using the SAME hex references the Board component uses for rendering:
  // N@(hex) and S@(hex) where hex is a terrain or water hex.
  // This ensures vertexToPixel gives positions matching the settlement dots.
  const wq = waterHex.q, wr = waterHex.r;

  // All 6 corners of the water hex, expressed as N/S of the water hex or its neighbors.
  // Use the water hex itself for corners 0 (N@water) and 3 (S@water).
  // For corners 1,2,4,5, use the neighbor hex that the Board would iterate through.
  const waterCorners: Array<{ v: VertexId; adjHexes: HexCoord[] }> = [
    { // Corner 0 (top)
      v: { hex: waterHex, direction: VertexDirection.N },
      adjHexes: [{ q: wq, r: wr }, { q: wq, r: wr - 1 }, { q: wq + 1, r: wr - 1 }],
    },
    { // Corner 1 (upper-right) — S of NE neighbor
      v: { hex: { q: wq + 1, r: wr - 1 }, direction: VertexDirection.S },
      adjHexes: [{ q: wq + 1, r: wr - 1 }, { q: wq + 1, r: wr }, { q: wq, r: wr }],
    },
    { // Corner 2 (lower-right) — N of SE neighbor
      v: { hex: { q: wq, r: wr + 1 }, direction: VertexDirection.N },
      adjHexes: [{ q: wq, r: wr + 1 }, { q: wq, r: wr }, { q: wq + 1, r: wr }],
    },
    { // Corner 3 (bottom)
      v: { hex: waterHex, direction: VertexDirection.S },
      adjHexes: [{ q: wq, r: wr }, { q: wq, r: wr + 1 }, { q: wq - 1, r: wr + 1 }],
    },
    { // Corner 4 (lower-left) — N of SW neighbor
      v: { hex: { q: wq - 1, r: wr + 1 }, direction: VertexDirection.N },
      adjHexes: [{ q: wq - 1, r: wr + 1 }, { q: wq - 1, r: wr }, { q: wq, r: wr }],
    },
    { // Corner 5 (upper-left) — S of NW neighbor
      v: { hex: { q: wq, r: wr - 1 }, direction: VertexDirection.S },
      adjHexes: [{ q: wq, r: wr - 1 }, { q: wq, r: wr }, { q: wq - 1, r: wr }],
    },
  ];

  // Find the 2 adjacent corners that both border the land hex
  // Adjacent corner pairs: (0,1), (1,2), (2,3), (3,4), (4,5), (5,0)
  const ADJACENT_PAIRS: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];

  for (const [a, b] of ADJACENT_PAIRS) {
    const aAdj = waterCorners[a].adjHexes.some(h => h.q === landHex.q && h.r === landHex.r);
    const bAdj = waterCorners[b].adjHexes.some(h => h.q === landHex.q && h.r === landHex.r);
    if (aAdj && bAdj) {
      return [waterCorners[a].v, waterCorners[b].v];
    }
  }

  // Fallback (should not happen)
  return [waterCorners[0].v, waterCorners[1].v];
}

// ---------------------------------------------------------------------------
// Generic preset board generator
// ---------------------------------------------------------------------------

function generatePresetBoard(coords: HexCoord[], harborCount: number): Board {
  const terrainHexes = [...coords];
  const pool = generateTerrainPool(terrainHexes.length);
  const hexes: HexTile[] = terrainHexes.map((coord, i) => ({
    coord,
    terrain: pool[i],
    numberToken: null,
  }));
  generateNumberTokens(hexes);
  const waterHexes = generateWaterFrame(terrainHexes);
  const harbors = generateHarborsN(terrainHexes, waterHexes, harborCount);
  return { hexes, waterHexes, harbors, vertexBuildings: new Map(), edgeBuildings: new Map() };
}

function generateTerrainPool(count: number): TerrainType[] {
  // 1 desert per ~19 hexes, rest evenly split across 5 resource types
  const deserts = Math.max(1, Math.floor(count / 19));
  const resourceCount = count - deserts;
  const perType = Math.floor(resourceCount / 5);
  const remainder = resourceCount - perType * 5;
  const types = [TerrainType.Hills, TerrainType.Forest, TerrainType.Mountains, TerrainType.Fields, TerrainType.Pasture];
  const pool: TerrainType[] = [];
  for (let t = 0; t < 5; t++) {
    const extra = t < remainder ? 1 : 0;
    for (let i = 0; i < perType + extra; i++) pool.push(types[t]);
  }
  for (let i = 0; i < deserts; i++) pool.push(TerrainType.Desert);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/**
 * Generate a terrain pool with a specific desert count and the rest as evenly-split resources.
 */
function generateRatioTerrainPool(landCount: number, desertCount: number): TerrainType[] {
  const clampedDeserts = Math.max(0, Math.min(landCount, desertCount));
  const resourceCount = landCount - clampedDeserts;
  const types = [TerrainType.Hills, TerrainType.Forest, TerrainType.Mountains, TerrainType.Fields, TerrainType.Pasture];
  const perType = Math.floor(resourceCount / 5);
  const remainder = resourceCount - perType * 5;
  const pool: TerrainType[] = [];
  for (let t = 0; t < 5; t++) {
    const extra = t < remainder ? 1 : 0;
    for (let i = 0; i < perType + extra; i++) pool.push(types[t]);
  }
  for (let i = 0; i < clampedDeserts; i++) pool.push(TerrainType.Desert);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function generateHarborsN(terrain: HexCoord[], water: HexCoord[], count: number): Harbor[] {
  // Reuse existing harbor generation but with a specific count
  const terrainSet = new Set(terrain.map(h => `${h.q},${h.r}`));
  const waterSet = new Set(water.map(h => `${h.q},${h.r}`));

  // Find water hexes adjacent to terrain (edge water)
  const edgeWater: { coord: HexCoord; angle: number }[] = [];
  const cx = terrain.reduce((s, h) => s + h.q, 0) / terrain.length;
  const cr = terrain.reduce((s, h) => s + h.r, 0) / terrain.length;
  for (const w of water) {
    const neighbors = hexNeighbors(w);
    if (neighbors.some(n => terrainSet.has(`${n.q},${n.r}`))) {
      const angle = Math.atan2(w.r - cr, w.q - cx);
      edgeWater.push({ coord: w, angle });
    }
  }
  edgeWater.sort((a, b) => a.angle - b.angle);

  if (edgeWater.length === 0) return [];
  const harborCount = Math.min(count, edgeWater.length);
  const step = edgeWater.length / harborCount;

  const specificTypes: HarborType[] = [
    HarborType.Brick, HarborType.Lumber, HarborType.Ore, HarborType.Grain, HarborType.Wool,
  ];
  const harborTypes: HarborType[] = [];
  for (let i = 0; i < harborCount; i++) {
    harborTypes.push(i < specificTypes.length ? specificTypes[i] : HarborType.Generic);
  }
  // Shuffle
  for (let i = harborTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [harborTypes[i], harborTypes[j]] = [harborTypes[j], harborTypes[i]];
  }

  const harbors: Harbor[] = [];
  for (let i = 0; i < harborCount; i++) {
    const idx = Math.round(i * step) % edgeWater.length;
    const wh = edgeWater[idx].coord;
    const neighbors = hexNeighbors(wh);
    const landNeighbor = neighbors.find(n => terrainSet.has(`${n.q},${n.r}`));
    if (!landNeighbor) continue;

    const facing = directionFromTo(wh, landNeighbor);
    const vertices = harborVertices(wh, landNeighbor);

    harbors.push({
      type: harborTypes[i],
      position: wh,
      facing,
      vertices,
    });
  }

  return harbors;
}

// ---------------------------------------------------------------------------
// Diamond: 24-hex diamond shape, 9 harbors
// ---------------------------------------------------------------------------

const DIAMOND_HEXES: HexCoord[] = [
  // Row by row, diamond shape (pointy-top)
  // Top point
  { q: 0, r: -3 },
  // Row 2
  { q: -1, r: -2 }, { q: 0, r: -2 }, { q: 1, r: -2 },
  // Row 3
  { q: -2, r: -1 }, { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  // Row 4 (widest)
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 5
  { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 },
  // Row 6
  { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 },
  // Row 7
  { q: 1, r: 3 }, { q: 2, r: 3 },
  // Bottom points
  { q: 2, r: 4 },
  { q: -2, r: -1 + 3 },
];

// ---------------------------------------------------------------------------
// British Isles: 63 hexes shaped like UK + Ireland, 20 harbors
// ---------------------------------------------------------------------------

const BRITISH_ISLES_HEXES: HexCoord[] = (() => {
  const coords: HexCoord[] = [];
  const set = new Set<string>();
  const add = (q: number, r: number) => {
    const k = `${q},${r}`;
    if (!set.has(k)) { set.add(k); coords.push({ q, r }); }
  };

  // Ireland (left island) — roughly centered at q=-5
  // Northern Ireland  
  add(-6, -2); add(-5, -2); add(-4, -2);
  add(-7, -1); add(-6, -1); add(-5, -1); add(-4, -1);
  add(-7, 0); add(-6, 0); add(-5, 0); add(-4, 0);
  add(-6, 1); add(-5, 1); add(-4, 1);
  add(-6, 2); add(-5, 2);

  // Great Britain (right island)
  // Scotland
  add(-1, -5); add(0, -5);
  add(-2, -4); add(-1, -4); add(0, -4); add(1, -4);
  add(-2, -3); add(-1, -3); add(0, -3); add(1, -3);
  // Northern England
  add(-1, -2); add(0, -2); add(1, -2);
  add(-1, -1); add(0, -1); add(1, -1); add(2, -1);
  // Midlands
  add(-1, 0); add(0, 0); add(1, 0); add(2, 0);
  add(0, 1); add(1, 1); add(2, 1);
  // Southern England  
  add(0, 2); add(1, 2); add(2, 2); add(3, 2);
  add(1, 3); add(2, 3); add(3, 3);
  add(1, 4); add(2, 4); add(3, 4);
  // Cornwall/Devon
  add(2, 5); add(3, 5);
  // Wales bulge
  add(-1, 1); add(-2, 1); add(-2, 2);

  return coords;
})();

// ---------------------------------------------------------------------------
// Gear: 43-hex gear/cog shape with internal water cutouts, 14 harbors
// ---------------------------------------------------------------------------

const GEAR_HEXES: HexCoord[] = (() => {
  const coords: HexCoord[] = [];
  const set = new Set<string>();
  const add = (q: number, r: number) => {
    const k = `${q},${r}`;
    if (!set.has(k)) { set.add(k); coords.push({ q, r }); }
  };

  // Core ring (radius 2)
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2) add(q, r);
    }
  }

  // Remove some inner hexes to create gear holes
  const remove = new Set(['1,-1', '-1,1', '0,-2', '0,2', '-2,0', '2,0']);

  // Gear teeth — protruding hexes at 6 compass points (radius 3)
  // NE teeth
  add(2, -3); add(3, -3);
  // E teeth
  add(3, -1); add(3, 0);
  // SE teeth
  add(1, 2); add(2, 2);
  // SW teeth
  add(-2, 3); add(-3, 3);
  // W teeth
  add(-3, 1); add(-3, 0);
  // NW teeth
  add(-1, -2); add(-2, -1);

  // Filter out removed hexes
  return coords.filter(c => !remove.has(`${c.q},${c.r}`));
})();

// ---------------------------------------------------------------------------
// Lakes: 39 hexes with internal water bodies, 9 harbors
// ---------------------------------------------------------------------------

function generateLakesBoard(): Board {
  const allCoords: HexCoord[] = [];
  const set = new Set<string>();
  const add = (q: number, r: number) => {
    const k = `${q},${r}`;
    if (!set.has(k)) { set.add(k); allCoords.push({ q, r }); }
  };

  // Main landmass — radius 3 blob
  for (let q = -3; q <= 3; q++) {
    for (let r = -3; r <= 3; r++) {
      if (Math.abs(q + r) <= 3) add(q, r);
    }
  }

  // Eastern peninsula
  add(4, -2); add(4, -1); add(4, 0);
  // Western peninsula
  add(-4, 1); add(-4, 2); add(-4, 0);
  // Southern peninsula
  add(-1, 4); add(0, 4); add(1, 4);

  // Internal lake hexes — these become water INSIDE the landmass
  const lakeSet = new Set([
    '0,0',     // center lake
    '1,-2',    // NE lake
    '-2,1',    // SW lake
    '2,1',     // SE lake
    '-1,-1',   // NW lake
  ]);

  const terrainCoords = allCoords.filter(c => !lakeSet.has(`${c.q},${c.r}`));
  const lakeCoords = allCoords.filter(c => lakeSet.has(`${c.q},${c.r}`));

  const pool = generateTerrainPool(terrainCoords.length);
  const hexes: HexTile[] = terrainCoords.map((coord, i) => ({
    coord,
    terrain: pool[i],
    numberToken: null,
  }));
  generateNumberTokens(hexes);

  const outerWater = generateWaterFrame(allCoords);
  // Lakes are internal water hexes
  const waterHexes = [...outerWater, ...lakeCoords];
  const harbors = generateHarborsN(terrainCoords, waterHexes, 9);

  return { hexes, waterHexes, harbors, vertexBuildings: new Map(), edgeBuildings: new Map() };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePlayerCount(count: number): 4 | 6 | 8 {
  if (count <= 4) return 4;
  if (count <= 6) return 6;
  return 8;
}
