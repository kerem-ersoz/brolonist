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
  // Custom board layouts
  if (config.mapType === MapType.Archipelago) {
    return generateArchipelagoBoard();
  }
  if (config.mapType === MapType.Turkey) {
    return generateTurkeyBoard();
  }
  if (config.mapType === MapType.World) {
    return generateWorldBoard();
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
  // Using 4 consecutive neighbor indices ensures every hex touches 2+ other island hexes
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

  // Fill the center gap with desert hexes (hexes within radius 1 of origin not already terrain)
  const desertHexes: HexCoord[] = [];
  const center: HexCoord = { q: 0, r: 0 };
  const candidates = [center, ...hexNeighbors(center)];
  for (const h of candidates) {
    const key = `${h.q},${h.r}`;
    if (!terrainSet.has(key)) {
      desertHexes.push(h);
      terrainSet.add(key);
    }
  }

  const allTerrainCoords = [...terrainHexes, ...desertHexes];

  // Terrain assignment: islands get productive terrain, center gets desert
  // 20 island hexes = 4 of each resource type
  const terrainPool: TerrainType[] = [
    ...Array(4).fill(TerrainType.Hills),
    ...Array(4).fill(TerrainType.Forest),
    ...Array(4).fill(TerrainType.Mountains),
    ...Array(4).fill(TerrainType.Fields),
    ...Array(4).fill(TerrainType.Pasture),
  ];
  for (let i = terrainPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [terrainPool[i], terrainPool[j]] = [terrainPool[j], terrainPool[i]];
  }

  const hexes: HexTile[] = [
    ...terrainHexes.map((coord, i) => ({
      coord,
      terrain: terrainPool[i],
      numberToken: null as number | null,
    })),
    ...desertHexes.map((coord) => ({
      coord,
      terrain: TerrainType.Desert,
      numberToken: null as number | null,
    })),
  ];

  generateNumberTokens(hexes);

  const waterHexes = generateWaterFrame(allTerrainCoords);
  const harbors = generateHarbors(allTerrainCoords, waterHexes, 4);

  return {
    hexes,
    waterHexes,
    harbors,
    vertexBuildings: new Map(),
    edgeBuildings: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Turkey: Map shaped like Türkiye's borders
// ---------------------------------------------------------------------------

function generateTurkeyBoard(): Board {
  // 96-hex map of Türkiye in pointy-top axial coordinates
  // ~18 columns (q: -3..14) × ~8 rows (r: -4..3)
  // Thrace on west, Bosphorus gap, Anatolia stretching east
  // Aspect ratio ~3:1 matching Turkey's actual shape

  const hexCoords: HexCoord[] = [
    // r=-4: Extreme NE peaks (Artvin highlands, Ağrı)
    { q: 12, r: -4 }, { q: 13, r: -4 }, { q: 14, r: -4 },

    // r=-3: NE mountains (Trabzon-Rize hinterland, Kars, Ardahan, Iğdır)
    { q: 8, r: -3 }, { q: 9, r: -3 }, { q: 10, r: -3 }, { q: 11, r: -3 }, { q: 12, r: -3 }, { q: 13, r: -3 }, { q: 14, r: -3 },

    // r=-2: Black Sea coast east + NE interior (Samsun→Hopa, Erzurum, Kars plateau)
    { q: -1, r: -2 }, { q: 0, r: -2 }, { q: 1, r: -2 },
    { q: 4, r: -2 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 7, r: -2 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 10, r: -2 }, { q: 11, r: -2 }, { q: 12, r: -2 }, { q: 13, r: -2 }, { q: 14, r: -2 },

    // r=-1: Thrace NE + Black Sea full coast (Sinop→Trabzon→Rize) + eastern interior
    { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 },
    { q: 4, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 }, { q: 7, r: -1 }, { q: 8, r: -1 }, { q: 9, r: -1 }, { q: 10, r: -1 }, { q: 11, r: -1 }, { q: 12, r: -1 }, { q: 13, r: -1 }, { q: 14, r: -1 },

    // r=0: Thrace (Edirne, Kırklareli, Tekirdağ) + [Bosphorus gap q=2,3] + W&Central Anatolia + East
    { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
    { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 }, { q: 10, r: 0 }, { q: 11, r: 0 }, { q: 12, r: 0 }, { q: 13, r: 0 }, { q: 14, r: 0 },

    // r=1: Aegean coast + Marmara south + Med coast (Antalya, Mersin) + Central + SE
    { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 }, { q: 4, r: 1 }, { q: 5, r: 1 }, { q: 6, r: 1 }, { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 9, r: 1 }, { q: 10, r: 1 }, { q: 11, r: 1 }, { q: 12, r: 1 }, { q: 13, r: 1 },

    // r=2: Aegean islands/coast + Med (Antalya-Mersin-Adana-Hatay) + Gaziantep-Şanlıurfa-Mardin
    { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 5, r: 2 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 8, r: 2 }, { q: 9, r: 2 }, { q: 10, r: 2 }, { q: 11, r: 2 }, { q: 12, r: 2 },

    // r=3: Southern Med coast tip (Hatay/İskenderun) + SE (Şırnak, Hakkari)
    { q: 4, r: 3 }, { q: 5, r: 3 }, { q: 6, r: 3 }, { q: 7, r: 3 }, { q: 8, r: 3 }, { q: 9, r: 3 }, { q: 10, r: 3 }, { q: 11, r: 3 }, { q: 12, r: 3 },
  ];

  // Regional terrain assignment
  const terrainMap: Record<string, TerrainType> = {};
  const a = (q: number, r: number, t: TerrainType) => { terrainMap[`${q},${r}`] = t; };

  // === Thrace (European Turkey) — flat agricultural land ===
  a(-3, 0, TerrainType.Fields);   a(-2, 0, TerrainType.Pasture);  a(-1, 0, TerrainType.Fields);
  a(0, 0, TerrainType.Fields);    a(1, 0, TerrainType.Pasture);
  a(-1, -1, TerrainType.Pasture); a(0, -1, TerrainType.Forest);   a(1, -1, TerrainType.Forest);
  a(-1, -2, TerrainType.Pasture); // Thrace north (Kırklareli)
  a(0, -2, TerrainType.Forest);   // Istranca forests
  a(1, -2, TerrainType.Pasture);  // Thrace NE
  a(4, -2, TerrainType.Forest);   // Sinop coast
  a(-2, 1, TerrainType.Pasture);  a(-1, 1, TerrainType.Hills);    a(0, 1, TerrainType.Pasture);

  // === Marmara region (south shore) ===
  a(1, 1, TerrainType.Fields);    a(2, 1, TerrainType.Fields);    a(3, 1, TerrainType.Pasture);

  // === Aegean coast — rolling hills, olives, pasture ===
  a(-2, 2, TerrainType.Hills);     a(-1, 2, TerrainType.Pasture);  a(0, 2, TerrainType.Hills);     a(1, 2, TerrainType.Pasture);
  a(2, 2, TerrainType.Hills);

  // === Western Anatolia (Eskişehir, Afyon, Burdur) ===
  a(4, -1, TerrainType.Forest);   a(5, -1, TerrainType.Forest);
  a(4, 0, TerrainType.Pasture);   a(5, 0, TerrainType.Pasture);
  a(4, 1, TerrainType.Forest);    a(5, 1, TerrainType.Hills);
  a(3, 2, TerrainType.Forest);    a(4, 2, TerrainType.Hills);

  // === Black Sea coast — dense forests ===
  a(5, -2, TerrainType.Forest);   a(6, -2, TerrainType.Forest);   a(7, -2, TerrainType.Forest);
  a(6, -1, TerrainType.Forest);   a(7, -1, TerrainType.Forest);   a(8, -1, TerrainType.Forest);

  // === Central Anatolia — arid steppe, salt lakes ===
  a(6, 0, TerrainType.Desert);    a(7, 0, TerrainType.Desert);    a(8, 0, TerrainType.Fields);
  a(6, 1, TerrainType.Desert);    a(7, 1, TerrainType.Pasture);

  // === Mediterranean coast (Antalya, Mersin, Adana) — fertile, hilly ===
  a(5, 2, TerrainType.Forest);    a(6, 2, TerrainType.Hills);     a(7, 2, TerrainType.Fields);
  a(5, 3, TerrainType.Forest);    a(6, 3, TerrainType.Fields);    a(7, 3, TerrainType.Fields);

  // === Cappadocia & central-east ===
  a(8, -2, TerrainType.Hills);    a(9, -2, TerrainType.Mountains);
  a(9, -1, TerrainType.Forest);
  a(9, 0, TerrainType.Fields);    a(8, 1, TerrainType.Hills);     a(9, 1, TerrainType.Pasture);

  // === Eastern Black Sea coast (Trabzon, Rize, Artvin) — wet forests ===
  a(10, -2, TerrainType.Forest);  a(11, -2, TerrainType.Forest);
  a(10, -1, TerrainType.Forest);  a(11, -1, TerrainType.Hills);

  // === NE highlands (Erzurum, Kars, Ardahan, Artvin) — mountains & pasture ===
  a(8, -3, TerrainType.Mountains);  // Giresun mountains
  a(9, -3, TerrainType.Mountains);   a(10, -3, TerrainType.Mountains);
  a(11, -3, TerrainType.Pasture);    a(12, -3, TerrainType.Mountains);
  a(12, -4, TerrainType.Mountains);  a(13, -4, TerrainType.Mountains);  a(14, -4, TerrainType.Hills);  // Ağrı Dağı area

  // === Eastern Anatolia (Elazığ, Bingöl, Tunceli, Van) ===
  a(12, -2, TerrainType.Mountains);  a(13, -2, TerrainType.Hills);  a(14, -2, TerrainType.Mountains);
  a(12, -1, TerrainType.Hills);      a(13, -1, TerrainType.Pasture); a(14, -1, TerrainType.Mountains);
  a(10, 0, TerrainType.Hills);       a(11, 0, TerrainType.Mountains); a(12, 0, TerrainType.Mountains);
  a(13, 0, TerrainType.Mountains);   // Van/Hakkari
  a(14, 0, TerrainType.Mountains);   // Ağrı east
  a(13, -3, TerrainType.Pasture);    // Iğdır (Ararat valley)

  // === SE Turkey (Gaziantep, Şanlıurfa, Diyarbakır, Mardin, Şırnak, Hakkari) ===
  a(8, 2, TerrainType.Desert);    a(9, 2, TerrainType.Desert);    a(10, 2, TerrainType.Fields);
  a(11, 2, TerrainType.Desert);   a(12, 2, TerrainType.Hills);
  a(10, 1, TerrainType.Fields);   a(11, 1, TerrainType.Pasture);  a(12, 1, TerrainType.Hills);
  a(13, 1, TerrainType.Mountains);

  // === Hatay + far SE ===
  a(4, 3, TerrainType.Forest);     a(8, 3, TerrainType.Fields);    a(9, 3, TerrainType.Desert);    a(10, 3, TerrainType.Hills);
  a(11, 3, TerrainType.Mountains); a(12, 3, TerrainType.Mountains);

  const hexes: HexTile[] = hexCoords.map((coord) => ({
    coord,
    terrain: terrainMap[`${coord.q},${coord.r}`] ?? TerrainType.Pasture,
    numberToken: null as number | null,
  }));

  generateNumberTokens(hexes);

  const waterHexes = generateWaterFrame(hexCoords);
  const harbors = generateHarbors(hexCoords, waterHexes, 8);

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

export function generateTerrainAssignment(hexCount: number, mapType: MapType): TerrainType[] {
  if (mapType === MapType.Random || mapType === MapType.Standard) {
    return shuffledTerrainList(hexCount);
  }
  return presetTerrainAssignment(hexCount, mapType);
}

/**
 * For preset map types, assign ALL terrain deliberately based on ring position.
 * For 19-hex boards (4-player):
 *   Ring 0: 1 hex (center)
 *   Ring 1: 6 hexes (inner ring)
 *   Ring 2: 12 hexes (outer ring)
 * Terrain counts: 3 hills, 4 forest, 3 mountains, 4 fields, 4 pasture, 1 desert
 */
function presetTerrainAssignment(hexCount: number, mapType: MapType): TerrainType[] {
  const counts = getTerrainCountsFromHexCount(hexCount);
  const terrains = new Array<TerrainType | null>(hexCount).fill(null);

  const ringOf = buildRingMap(hexCount);
  const maxRing = Math.max(...ringOf);

  // Indices grouped by ring
  const byRing: number[][] = [];
  for (let ring = 0; ring <= maxRing; ring++) {
    byRing.push(ringOf.map((r, i) => r === ring ? i : -1).filter(i => i >= 0));
  }

  const centerIndices = byRing[0] ?? [];
  const ring1 = byRing[1] ?? [];
  const ring2 = byRing[2] ?? [];
  const outerRing = byRing[byRing.length - 1] ?? [];
  const innerRings = byRing.slice(0, -1).flat();
  const midRing = byRing.length > 2 ? byRing[1] : [];

  switch (mapType) {
    case MapType.Pangaea:
      // All productive terrain packed into center+ring1, desert+pasture on edges
      placeTerrainAt(terrains, centerIndices, TerrainType.Mountains, counts);
      placeTerrainAt(terrains, ring1, TerrainType.Fields, counts);
      placeTerrainAt(terrains, ring1, TerrainType.Mountains, counts);
      placeTerrainAt(terrains, ring1, TerrainType.Forest, counts);
      placeTerrainAt(terrains, ring1, TerrainType.Hills, counts);
      // Push desert and remaining pasture/hills to outer ring
      placeTerrainAt(terrains, outerRing, TerrainType.Desert, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Pasture, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Hills, counts);
      break;

    case MapType.Archipelago:
      // Desert+pasture in center, valuable resources spread to outer ring
      placeTerrainAt(terrains, centerIndices, TerrainType.Desert, counts);
      placeTerrainAt(terrains, ring1, TerrainType.Pasture, counts);
      placeTerrainAt(terrains, ring1, TerrainType.Hills, counts);
      // Outer ring gets the good stuff
      placeTerrainAt(terrains, outerRing, TerrainType.Fields, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Mountains, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Forest, counts);
      break;

    case MapType.RichCoast:
      // Mountains+Fields exclusively on outer ring, forest+pasture inside
      placeTerrainAt(terrains, outerRing, TerrainType.Mountains, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Fields, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Hills, counts);
      placeTerrainAt(terrains, centerIndices, TerrainType.Forest, counts);
      placeTerrainAt(terrains, innerRings, TerrainType.Pasture, counts);
      placeTerrainAt(terrains, innerRings, TerrainType.Forest, counts);
      placeTerrainAt(terrains, innerRings, TerrainType.Desert, counts);
      break;

    case MapType.DesertRing:
      // Center has fields+mountains, ring1 is ALL desert+pasture, outer has forest+hills
      placeTerrainAt(terrains, centerIndices, TerrainType.Fields, counts);
      placeTerrainAt(terrains, midRing, TerrainType.Desert, counts);
      placeTerrainAt(terrains, midRing, TerrainType.Pasture, counts);
      placeTerrainAt(terrains, midRing, TerrainType.Hills, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Forest, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Mountains, counts);
      placeTerrainAt(terrains, outerRing, TerrainType.Fields, counts);
      break;
  }

  // Fill any remaining slots randomly
  fillRemaining(terrains, counts);
  return terrains as TerrainType[];
}

/** Place as many of `terrain` type as available into preferred indices. */
function placeTerrainAt(
  terrains: (TerrainType | null)[],
  preferredIndices: number[],
  terrain: TerrainType,
  counts: Record<TerrainType, number>,
): void {
  const shuffled = [...preferredIndices].sort(() => Math.random() - 0.5);
  for (const idx of shuffled) {
    if (counts[terrain] <= 0) break;
    if (terrains[idx] !== null) continue;
    terrains[idx] = terrain;
    counts[terrain]--;
  }
}

/** Fill all remaining null slots from whatever terrain counts are left. */
function fillRemaining(terrains: (TerrainType | null)[], counts: Record<TerrainType, number>): void {
  const pool: TerrainType[] = [];
  for (const [t, c] of Object.entries(counts)) {
    for (let i = 0; i < c; i++) pool.push(t as TerrainType);
  }
  // Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let pi = 0;
  for (let i = 0; i < terrains.length; i++) {
    if (terrains[i] === null && pi < pool.length) {
      terrains[i] = pool[pi++];
    }
  }
}

/** Build ring-distance array matching hex indices from generateHexGrid ordering. */
function buildRingMap(hexCount: number): number[] {
  // Reconstruct hex positions — generateHexGrid iterates q then r within radius
  const radius = hexCount <= 19 ? 2 : hexCount <= 30 ? 3 : 4;
  const hexes: { q: number; r: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        hexes.push({ q, r });
      }
    }
  }
  // Apply same trimming as board-layout
  let trimmed = hexes;
  if (radius === 3 && hexes.length > 30) {
    trimmed = trimToCountLocal(hexes, 30);
  } else if (radius === 4 && hexes.length > 42) {
    trimmed = trimToCountLocal(hexes, 42);
  }
  return trimmed.slice(0, hexCount).map(h => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(-h.q - h.r)));
}

function trimToCountLocal(hexes: { q: number; r: number }[], target: number): { q: number; r: number }[] {
  if (hexes.length <= target) return hexes;
  const scored = hexes.map(h => ({
    hex: h,
    dist: Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(-h.q - h.r)),
    cornerScore: Math.abs(h.q) + Math.abs(h.r) + Math.abs(-h.q - h.r),
  }));
  scored.sort((a, b) => b.dist - a.dist || b.cornerScore - a.cornerScore);
  return scored.slice(scored.length - target).map(s => s.hex);
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
  return 4;
}

export function generateNumberTokens(hexes: HexTile[]): void {
  const producingHexes = hexes.filter((h) => h.terrain !== TerrainType.Desert);
  const tokens = getTokenDistributionForCount(producingHexes.length);

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
  // The two vertices on the shared edge between waterHex and landHex.
  // Direction is from waterHex toward landHex.
  const dir = directionFromTo(waterHex, landHex);
  const w = waterHex;
  const l = landHex;

  const vertexPairs: Record<number, [VertexId, VertexId]> = {
    // dir 0: land is E of water. Shared edge = E@water.
    0: [
      { hex: { q: w.q + 1, r: w.r - 1 }, direction: VertexDirection.S },
      { hex: { q: w.q, r: w.r + 1 }, direction: VertexDirection.N },
    ],
    // dir 1: land is SE of water. Shared edge = SE@water.
    1: [
      { hex: { q: w.q, r: w.r + 1 }, direction: VertexDirection.N },
      { hex: { q: w.q, r: w.r }, direction: VertexDirection.S },
    ],
    // dir 2: land is SW of water. Shared edge = NE@land.
    2: [
      { hex: { q: l.q, r: l.r }, direction: VertexDirection.N },
      { hex: { q: l.q + 1, r: l.r - 1 }, direction: VertexDirection.S },
    ],
    // dir 3: land is W of water. Shared edge = E@land.
    3: [
      { hex: { q: l.q + 1, r: l.r - 1 }, direction: VertexDirection.S },
      { hex: { q: l.q, r: l.r + 1 }, direction: VertexDirection.N },
    ],
    // dir 4: land is NW of water. Shared edge = SE@land.
    4: [
      { hex: { q: l.q, r: l.r + 1 }, direction: VertexDirection.N },
      { hex: { q: l.q, r: l.r }, direction: VertexDirection.S },
    ],
    // dir 5: land is NE of water. Shared edge = NE@water.
    5: [
      { hex: { q: w.q, r: w.r }, direction: VertexDirection.N },
      { hex: { q: w.q + 1, r: w.r - 1 }, direction: VertexDirection.S },
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
