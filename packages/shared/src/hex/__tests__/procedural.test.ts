import { describe, it, expect } from 'vitest';
import { generateProceduralGrid } from '../procedural.js';
import { BoardShape } from '../../types/game.js';
import { hexNeighbors } from '../coordinates.js';

/** Check that all hexes are connected (single connected component) via flood-fill. */
function isConnected(hexes: Array<{ q: number; r: number }>): boolean {
  if (hexes.length <= 1) return true;
  const set = new Set(hexes.map(h => `${h.q},${h.r}`));
  const visited = new Set<string>();
  const queue = [`${hexes[0].q},${hexes[0].r}`];
  visited.add(queue[0]);

  while (queue.length > 0) {
    const key = queue.shift()!;
    const [q, r] = key.split(',').map(Number);
    for (const n of hexNeighbors({ q, r })) {
      const nk = `${n.q},${n.r}`;
      if (set.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === hexes.length;
}

/** Check that there are no duplicate coordinates. */
function hasNoDuplicates(hexes: Array<{ q: number; r: number }>): boolean {
  const keys = hexes.map(h => `${h.q},${h.r}`);
  return new Set(keys).size === keys.length;
}

describe('generateProceduralGrid', () => {
  const shapes = Object.values(BoardShape);
  const tileCounts = [19, 37, 50, 100, 200];

  for (const shape of shapes) {
    describe(`shape: ${shape}`, () => {
      for (const count of tileCounts) {
        it(`produces exactly ${count} tiles`, () => {
          const hexes = generateProceduralGrid(count, shape);
          expect(hexes).toHaveLength(count);
        });

        if (shape !== BoardShape.Random) {
          it(`all ${count} tiles are connected`, () => {
            const hexes = generateProceduralGrid(count, shape);
            expect(isConnected(hexes)).toBe(true);
          });
        }

        it(`no duplicate coordinates for ${count} tiles`, () => {
          const hexes = generateProceduralGrid(count, shape);
          expect(hasNoDuplicates(hexes)).toBe(true);
        });
      }
    });
  }

  it('round shape at 19 tiles contains origin', () => {
    const hexes = generateProceduralGrid(19, BoardShape.Round);
    expect(hexes.some(h => h.q === 0 && h.r === 0)).toBe(true);
  });

  it('clamps minimum to 1', () => {
    const hexes = generateProceduralGrid(0, BoardShape.Round);
    expect(hexes.length).toBeGreaterThanOrEqual(1);
  });

  it('random shape is deterministic (same count → same result)', () => {
    const a = generateProceduralGrid(50, BoardShape.Random);
    const b = generateProceduralGrid(50, BoardShape.Random);
    expect(a).toEqual(b);
  });

  it('seed produces deterministic results for random shape', () => {
    const a = generateProceduralGrid(50, BoardShape.Random, 'hello');
    const b = generateProceduralGrid(50, BoardShape.Random, 'hello');
    expect(a).toEqual(b);
  });

  it('random shape produces same grid regardless of seed (seed affects tile types, not positions)', () => {
    const a = generateProceduralGrid(50, BoardShape.Random, 'seed-a');
    const b = generateProceduralGrid(50, BoardShape.Random, 'seed-b');
    const aKeys = a.map(h => `${h.q},${h.r}`).join('|');
    const bKeys = b.map(h => `${h.q},${h.r}`).join('|');
    expect(aKeys).toEqual(bKeys);
  });

  it('seed does not affect non-random shapes (round is same with or without seed)', () => {
    const a = generateProceduralGrid(37, BoardShape.Round);
    const b = generateProceduralGrid(37, BoardShape.Round, 'any-seed');
    expect(a).toEqual(b);
  });
});
