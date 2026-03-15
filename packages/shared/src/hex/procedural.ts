import type { HexCoord } from './coordinates.js';
import { hexNeighbors } from './coordinates.js';
import { BoardShape } from '../types/game.js';

/**
 * Hash a string to a 32-bit integer for use as PRNG seed.
 */
export function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Generate a procedural hex grid of exactly `tileCount` hexes
 * using the specified shape algorithm and optional seed.
 */
export function generateProceduralGrid(
  tileCount: number,
  shape: BoardShape,
  seed?: string,
): HexCoord[] {
  const count = Math.max(1, Math.round(tileCount));
  const numericSeed = seed ? hashSeed(seed) : count * 31337;
  switch (shape) {
    case BoardShape.Round:
      return generateRoundGrid(count);
    case BoardShape.Elongated:
      return generateElongatedGrid(count);
    case BoardShape.Star:
      return generateStarGrid(count);
    case BoardShape.Random:
      return generateRandomGrid(count, numericSeed);
    default:
      return generateRoundGrid(count);
  }
}

// ---------------------------------------------------------------------------
// Round: concentric rings, trim corners to exact count
// ---------------------------------------------------------------------------

function generateRoundGrid(count: number): HexCoord[] {
  // Find the smallest radius that yields >= count hexes
  let radius = 0;
  while (hexRingCount(radius) < count) radius++;

  const hexes = hexRing(radius);
  return trimToCount(hexes, count);
}

/** Number of hexes in a filled hex grid with the given radius. */
function hexRingCount(radius: number): number {
  // 1 + 6 + 12 + ... = 3*r^2 + 3*r + 1
  return 3 * radius * radius + 3 * radius + 1;
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
  return hexes;
}

/**
 * Trim a hex grid to a target count by removing the most "corner-like"
 * hexes from the outermost ring first.
 */
function trimToCount(hexes: HexCoord[], target: number): HexCoord[] {
  if (hexes.length <= target) return hexes;
  const scored = hexes.map((h) => ({
    hex: h,
    dist: Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(-h.q - h.r)),
    cornerScore: Math.abs(h.q) + Math.abs(h.r) + Math.abs(-h.q - h.r),
  }));
  // Sort descending by dist then cornerScore; keep the last `target` items
  scored.sort((a, b) => b.dist - a.dist || b.cornerScore - a.cornerScore);
  return scored.slice(scored.length - target).map((s) => s.hex);
}

// ---------------------------------------------------------------------------
// Elongated: hex rectangle with W ≈ 2×H, corners softened
// ---------------------------------------------------------------------------

function generateElongatedGrid(count: number): HexCoord[] {
  // Search for (W, H) where W ≈ 2*H and total >= count (must overshoot)
  let bestW = count, bestH = 1, bestScore = Infinity;

  for (let h = 1; h <= count; h++) {
    // Try widths that could produce >= count hexes
    for (let w = Math.max(h, Math.ceil(count / h)); w <= Math.ceil(count / h) + 2; w++) {
      const total = hexRectCount(w, h);
      if (total < count) continue;
      // Prefer W ≈ 2*H ratio; penalize excess hexes and poor ratio
      const ratioErr = Math.abs(w - 2 * h);
      const excess = total - count;
      const score = ratioErr * 2 + excess;
      if (score < bestScore) {
        bestScore = score;
        bestW = w;
        bestH = h;
      }
    }
    if (h > Math.sqrt(count) * 2) break;
  }

  const hexes = hexRect(bestW, bestH);
  // Center the grid around origin
  const cq = Math.round(hexes.reduce((s, h) => s + h.q, 0) / hexes.length);
  const cr = Math.round(hexes.reduce((s, h) => s + h.r, 0) / hexes.length);
  const centered = hexes.map((h) => ({ q: h.q - cq, r: h.r - cr }));

  return trimToCount(centered, count);
}

function hexRectCount(w: number, h: number): number {
  // Offset-row hex rectangle: h rows, alternating w and w-1 columns
  const fullRows = Math.ceil(h / 2);
  const shortRows = Math.floor(h / 2);
  return fullRows * w + shortRows * Math.max(0, w - 1);
}

function hexRect(w: number, h: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  const rMin = -Math.floor(h / 2);
  const rMax = rMin + h - 1;
  for (let r = rMin; r <= rMax; r++) {
    const qMin = -Math.floor(w / 2) - Math.floor(r / 2);
    const cols = r % 2 === 0 ? w : Math.max(1, w - 1);
    for (let i = 0; i < cols; i++) {
      hexes.push({ q: qMin + i, r });
    }
  }
  return hexes;
}

// ---------------------------------------------------------------------------
// Star: full center rings + 6 spoke extensions
// ---------------------------------------------------------------------------

function generateStarGrid(count: number): HexCoord[] {
  // Inner core: fill rings until we use ~60% of count
  const coreTarget = Math.floor(count * 0.6);
  let coreRadius = 0;
  while (hexRingCount(coreRadius + 1) <= coreTarget) coreRadius++;

  const hexSet = new Set<string>();
  const hexes: HexCoord[] = [];

  const addHex = (q: number, r: number) => {
    const key = `${q},${r}`;
    if (!hexSet.has(key)) {
      hexSet.add(key);
      hexes.push({ q, r });
    }
  };

  // Add core
  const core = hexRing(coreRadius);
  for (const h of core) addHex(h.q, h.r);

  // 6 spoke directions in axial coords
  const directions: HexCoord[] = [
    { q: 1, r: 0 },   // E
    { q: 0, r: 1 },   // SE
    { q: -1, r: 1 },  // SW
    { q: -1, r: 0 },  // W
    { q: 0, r: -1 },  // NW
    { q: 1, r: -1 },  // NE
  ];

  // Extend spokes outward from core edge, adding 3-wide arms
  let spokeLen = 1;
  while (hexes.length < count) {
    let added = false;
    for (const dir of directions) {
      if (hexes.length >= count) break;
      const tipQ = dir.q * (coreRadius + spokeLen);
      const tipR = dir.r * (coreRadius + spokeLen);
      addHex(tipQ, tipR);
      added = true;
      // Also add the two neighbors perpendicular to the spoke
      if (hexes.length < count) {
        const neighbors = hexNeighbors({ q: tipQ, r: tipR });
        for (const n of neighbors) {
          if (hexes.length >= count) break;
          const nDist = Math.max(Math.abs(n.q), Math.abs(n.r), Math.abs(-n.q - n.r));
          if (nDist > coreRadius && !hexSet.has(`${n.q},${n.r}`)) {
            addHex(n.q, n.r);
          }
        }
      }
    }
    spokeLen++;
    if (!added) break;
    if (spokeLen > 20) break; // safety
  }

  return trimToCount(hexes, count);
}

// ---------------------------------------------------------------------------
// Random (organic): flood-fill from center with center bias
// ---------------------------------------------------------------------------

/**
 * Simple deterministic 32-bit PRNG (mulberry32).
 * Uses a default seed derived from tileCount so same count → same shape.
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRandomGrid(count: number, _seed: number = 0): HexCoord[] {
  // Build a solid filled square canvas of exactly `count` hexes.
  let side = Math.ceil((Math.sqrt(count) - 1) / 2);
  let canvas = buildSquareCanvas(side);
  while (canvas.length < count) {
    side++;
    canvas = buildSquareCanvas(side);
  }
  // Trim to exact count using the standard corner-trimming approach
  return trimToCount(canvas, count);
}

/** Build a square-ish canvas of hex positions centered at origin. */
function buildSquareCanvas(side: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let r = -side; r <= side; r++) {
    for (let q = -side; q <= side; q++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}
