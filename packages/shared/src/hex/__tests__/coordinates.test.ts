import { describe, it, expect } from 'vitest';
import {
  hexNeighbors,
  hexDistance,
  hexEquals,
  vertexEquals,
  edgeEquals,
  vertexAdjacentHexes,
  vertexAdjacentVertices,
  vertexAdjacentEdges,
  edgeAdjacentVertices,
  edgeAdjacentEdges,
  canonicalVertex,
  canonicalEdge,
  VertexDirection,
  EdgeDirection,
  type HexCoord,
  type VertexId,
  type EdgeId,
} from '../coordinates.js';
import { generateHexGrid, generateWaterFrame } from '../board-layout.js';
import { vertexToPixel, edgeMidpoint, hexCorners } from '../math.js';

describe('hexNeighbors', () => {
  it('returns 6 neighbors', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0 });
    expect(neighbors).toHaveLength(6);
  });

  it('returns correct neighbors for origin', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0 });
    const expected: HexCoord[] = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
    ];
    expect(neighbors).toEqual(expected);
  });
});

describe('hexDistance', () => {
  it('returns 0 for same hex', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
  });

  it('returns 1 for adjacent hexes', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
  });

  it('returns correct distance for farther hexes', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance({ q: -2, r: 2 }, { q: 2, r: -2 })).toBe(4);
  });
});

describe('vertexEquals with canonical forms', () => {
  it('N vertex of (0,0) equals S vertex of (1,-1)', () => {
    const a: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.N };
    const b: VertexId = { hex: { q: 1, r: -1 }, direction: VertexDirection.S };
    expect(vertexEquals(a, b)).toBe(true);
  });

  it('S vertex of (0,0) equals N vertex of (-1,1)', () => {
    const a: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.S };
    const b: VertexId = { hex: { q: -1, r: 1 }, direction: VertexDirection.N };
    expect(vertexEquals(a, b)).toBe(true);
  });

  it('N vertex of (0,0) does NOT equal S vertex of (0,-1)', () => {
    const a: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.N };
    const b: VertexId = { hex: { q: 0, r: -1 }, direction: VertexDirection.S };
    expect(vertexEquals(a, b)).toBe(false);
  });

  it('S vertex of (0,0) does NOT equal N vertex of (0,1)', () => {
    const a: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.S };
    const b: VertexId = { hex: { q: 0, r: 1 }, direction: VertexDirection.N };
    expect(vertexEquals(a, b)).toBe(false);
  });

  it('different vertices are not equal', () => {
    const a: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.N };
    const b: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.S };
    expect(vertexEquals(a, b)).toBe(false);
  });
});

describe('edgeEquals with canonical forms', () => {
  it('same edge is equal', () => {
    const a: EdgeId = { hex: { q: 0, r: 0 }, direction: EdgeDirection.NE };
    const b: EdgeId = { hex: { q: 0, r: 0 }, direction: EdgeDirection.NE };
    expect(edgeEquals(a, b)).toBe(true);
  });

  it('different edges are not equal', () => {
    const a: EdgeId = { hex: { q: 0, r: 0 }, direction: EdgeDirection.NE };
    const b: EdgeId = { hex: { q: 0, r: 0 }, direction: EdgeDirection.E };
    expect(edgeEquals(a, b)).toBe(false);
  });
});

describe('vertexAdjacentHexes', () => {
  it('returns 3 hexes for N vertex', () => {
    const hexes = vertexAdjacentHexes({ hex: { q: 0, r: 0 }, direction: VertexDirection.N });
    expect(hexes).toHaveLength(3);
    expect(hexes).toContainEqual({ q: 0, r: 0 });
    expect(hexes).toContainEqual({ q: 0, r: -1 });
    expect(hexes).toContainEqual({ q: 1, r: -1 });
  });

  it('returns 3 hexes for S vertex', () => {
    const hexes = vertexAdjacentHexes({ hex: { q: 0, r: 0 }, direction: VertexDirection.S });
    expect(hexes).toHaveLength(3);
    expect(hexes).toContainEqual({ q: 0, r: 0 });
    expect(hexes).toContainEqual({ q: 0, r: 1 });
    expect(hexes).toContainEqual({ q: -1, r: 1 });
  });
});

describe('vertexAdjacentVertices', () => {
  it('returns 3 adjacent vertices for N vertex', () => {
    const adj = vertexAdjacentVertices({ hex: { q: 0, r: 0 }, direction: VertexDirection.N });
    expect(adj).toHaveLength(3);
  });

  it('adjacent vertices are at pixel distance ~size from the vertex', () => {
    const v: VertexId = { hex: { q: 0, r: 0 }, direction: VertexDirection.N };
    const adj = vertexAdjacentVertices(v);
    const vPixel = vertexToPixel(v, 1);
    for (const a of adj) {
      const aPixel = vertexToPixel(a, 1);
      const dist = Math.sqrt((vPixel.x - aPixel.x) ** 2 + (vPixel.y - aPixel.y) ** 2);
      expect(dist).toBeCloseTo(1, 5);
    }
  });
});

describe('edgeAdjacentVertices', () => {
  it('returns 2 vertices', () => {
    const verts = edgeAdjacentVertices({ hex: { q: 0, r: 0 }, direction: EdgeDirection.NE });
    expect(verts).toHaveLength(2);
  });

  it('endpoints are at pixel distance ~size apart', () => {
    for (const dir of [EdgeDirection.NE, EdgeDirection.E, EdgeDirection.SE]) {
      const verts = edgeAdjacentVertices({ hex: { q: 0, r: 0 }, direction: dir });
      const p0 = vertexToPixel(verts[0], 1);
      const p1 = vertexToPixel(verts[1], 1);
      const dist = Math.sqrt((p0.x - p1.x) ** 2 + (p0.y - p1.y) ** 2);
      expect(dist).toBeCloseTo(1, 5);
    }
  });
});

describe('edgeAdjacentEdges', () => {
  it('returns 4 adjacent edges', () => {
    const adj = edgeAdjacentEdges({ hex: { q: 0, r: 0 }, direction: EdgeDirection.E });
    expect(adj).toHaveLength(4);
  });
});

describe('vertexAdjacentEdges', () => {
  it('returns 3 edges', () => {
    const edges = vertexAdjacentEdges({ hex: { q: 0, r: 0 }, direction: VertexDirection.N });
    expect(edges).toHaveLength(3);
  });
});

describe('generateHexGrid', () => {
  it('generates 19 hexes for 4 players', () => {
    expect(generateHexGrid(4)).toHaveLength(19);
  });

  it('generates 30 hexes for 6 players', () => {
    expect(generateHexGrid(6)).toHaveLength(30);
  });

  it('generates 42 hexes for 8 players', () => {
    expect(generateHexGrid(8)).toHaveLength(42);
  });

  it('4-player grid contains origin', () => {
    const grid = generateHexGrid(4);
    expect(grid.some((h) => h.q === 0 && h.r === 0)).toBe(true);
  });
});

describe('generateWaterFrame', () => {
  it('water hexes do not overlap with terrain', () => {
    const terrain = generateHexGrid(4);
    const water = generateWaterFrame(terrain);
    for (const w of water) {
      expect(terrain.some((t) => hexEquals(t, w))).toBe(false);
    }
  });
});

describe('hexCorners', () => {
  it('returns 6 corners', () => {
    expect(hexCorners(0, 0, 1)).toHaveLength(6);
  });
});

describe('edgeMidpoint', () => {
  it('midpoint is between the two endpoints', () => {
    const edge: EdgeId = { hex: { q: 0, r: 0 }, direction: EdgeDirection.E };
    const mid = edgeMidpoint(edge, 1);
    const [v1, v2] = edgeAdjacentVertices(edge);
    const p1 = vertexToPixel(v1, 1);
    const p2 = vertexToPixel(v2, 1);
    expect(mid.x).toBeCloseTo((p1.x + p2.x) / 2, 10);
    expect(mid.y).toBeCloseTo((p1.y + p2.y) / 2, 10);
  });
});
