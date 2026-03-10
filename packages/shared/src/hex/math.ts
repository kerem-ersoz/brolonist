import { type VertexId, type EdgeId, VertexDirection, EdgeDirection, edgeAdjacentVertices } from './coordinates.js';

export interface Point {
  x: number;
  y: number;
}

// Axial-to-pixel conversion (pointy-top hexagons)
export function axialToPixel(q: number, r: number, size: number): Point {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * ((3 / 2) * r);
  return { x, y };
}

export function pixelToAxial(x: number, y: number, size: number): { q: number; r: number } {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return { q, r };
}

/** Returns the 6 corner points of a pointy-top hex for SVG rendering. */
export function hexCorners(q: number, r: number, size: number): Point[] {
  const center = axialToPixel(q, r, size);
  return Array.from({ length: 6 }, (_, i) => {
    const angleDeg = 60 * i - 90; // pointy-top: first corner at top (-90°)
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    };
  });
}

/** Pixel position of a vertex (N = corner 0 / top, S = corner 3 / bottom). */
export function vertexToPixel(vertex: VertexId, size: number): Point {
  const center = axialToPixel(vertex.hex.q, vertex.hex.r, size);
  // N vertex = corner 0 at angle -90°, S vertex = corner 3 at angle 90°
  const angleDeg = vertex.direction === VertexDirection.N ? -90 : 90;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
}

/** Pixel midpoint of an edge. */
export function edgeMidpoint(edge: EdgeId, size: number): Point {
  const [v1, v2] = edgeAdjacentVertices(edge);
  const p1 = vertexToPixel(v1, size);
  const p2 = vertexToPixel(v2, size);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}
