import { type HexCoord, hexNeighbors, hexEquals } from './coordinates.js';

/**
 * Generate terrain hex positions for a given player count.
 * - 4 players: 19 hexes (rings 0–2, standard Catan)
 * - 6 players: 30 hexes (rings 0–3, extended)
 * - 8 players: 42 hexes (rings 0–4, large board, trimmed corners)
 */
export function generateHexGrid(playerCount: 4 | 6 | 8): HexCoord[] {
  switch (playerCount) {
    case 4:
      return hexRing(2); // 1 + 6 + 12 = 19
    case 6:
      return hexRing(3); // 19 + 18 = 37 → trimmed to 30
    case 8:
      return hexRing(4); // 37 + 24 = 61 → trimmed to 42
  }
}

/** All hexes within `radius` rings of the origin. */
function hexRing(radius: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        hexes.push({ q, r });
      }
    }
  }
  // Trim for 6-player (30 hexes) and 8-player (42 hexes) boards
  if (radius === 3) {
    return trimToCount(hexes, 30);
  }
  if (radius === 4) {
    return trimToCount(hexes, 42);
  }
  return hexes;
}

/**
 * Trim a hex grid to a target count by removing outermost-ring hexes
 * with the highest cube distance sum (the pointiest corners first).
 */
function trimToCount(hexes: HexCoord[], target: number): HexCoord[] {
  if (hexes.length <= target) return hexes;
  // Sort by "how corner-like" — higher |s| = -q-r means more extreme corner
  const scored = hexes.map((h) => ({
    hex: h,
    dist: Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(-h.q - h.r)),
    cornerScore: Math.abs(h.q) + Math.abs(h.r) + Math.abs(-h.q - h.r),
  }));
  // Sort descending by dist then cornerScore; remove from end
  scored.sort((a, b) => b.dist - a.dist || b.cornerScore - a.cornerScore);
  return scored.slice(scored.length - target).map((s) => s.hex);
}

/**
 * Generate the ring of water hexes surrounding the terrain.
 * Returns hexes that are neighbors of at least one terrain hex but not in terrain.
 */
export function generateWaterFrame(terrainHexes: HexCoord[]): HexCoord[] {
  const water: HexCoord[] = [];
  const seen = new Set<string>();
  const terrainSet = new Set(terrainHexes.map((h) => `${h.q},${h.r}`));

  for (const hex of terrainHexes) {
    for (const n of hexNeighbors(hex)) {
      const key = `${n.q},${n.r}`;
      if (!terrainSet.has(key) && !seen.has(key)) {
        seen.add(key);
        water.push(n);
      }
    }
  }
  return water;
}
