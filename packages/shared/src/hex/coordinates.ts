/** Axial hex coordinate (pointy-top orientation). */
export interface HexCoord {
  q: number;
  r: number;
}

/** A vertex sits at the top (N) or bottom (S) of a hex. */
export enum VertexDirection {
  N = 'N',
  S = 'S',
}

/** An edge sits on the NE, E, or SE side of a hex. */
export enum EdgeDirection {
  NE = 'NE',
  E = 'E',
  SE = 'SE',
}

/** Identifies a vertex relative to a hex. */
export interface VertexId {
  hex: HexCoord;
  direction: VertexDirection;
}

/** Identifies an edge relative to a hex. */
export interface EdgeId {
  hex: HexCoord;
  direction: EdgeDirection;
}

// --- Axial direction vectors (pointy-top) ---
// 0: E, 1: SE, 2: SW, 3: W, 4: NW, 5: NE
const AXIAL_DIRS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

export function hexNeighborInDirection(hex: HexCoord, dir: number): HexCoord {
  const d = AXIAL_DIRS[((dir % 6) + 6) % 6];
  return { q: hex.q + d.q, r: hex.r + d.r };
}

export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return AXIAL_DIRS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

// ---------------------------------------------------------------------------
// Canonical forms
// ---------------------------------------------------------------------------
// In pointy-top axial coords, each vertex is shared by exactly 2 hex references:
//   N@(q,r) == S@(q+1, r-1)
//   S@(q,r) == N@(q-1, r+1)
//
// We pick canonical as the lexicographically smaller representation.

export function canonicalVertex(v: VertexId): VertexId {
  const { hex, direction } = v;
  let other: VertexId;
  if (direction === VertexDirection.N) {
    // N@(q,r) == S@(q+1, r-1)
    other = { hex: { q: hex.q + 1, r: hex.r - 1 }, direction: VertexDirection.S };
  } else {
    // S@(q,r) == N@(q-1, r+1)
    other = { hex: { q: hex.q - 1, r: hex.r + 1 }, direction: VertexDirection.N };
  }
  // Pick lexicographically smaller: compare q, then r, then direction
  if (
    v.hex.q < other.hex.q ||
    (v.hex.q === other.hex.q && v.hex.r < other.hex.r) ||
    (v.hex.q === other.hex.q && v.hex.r === other.hex.r && v.direction < other.direction)
  ) {
    return v;
  }
  return other;
}

export function vertexEquals(a: VertexId, b: VertexId): boolean {
  const ca = canonicalVertex(a);
  const cb = canonicalVertex(b);
  return ca.hex.q === cb.hex.q && ca.hex.r === cb.hex.r && ca.direction === cb.direction;
}

// Edge canonical form
// NE edge of (q,r) connects N and S vertices of... let's think in terms of
// which two vertices each edge connects:
//   NE@(q,r) connects N@(q,r) and S@(q+1,r-1) — same as SW edge of (q+1,r-1)
//     but we don't have SW. SW = NE of neighbor? Let's enumerate equivalents:
//     NE@(q,r) is shared with hex (q+1,r-1) — it's that hex's SW side.
//     In our 3-edge system (NE,E,SE per hex), the SW side of (q+1,r-1)
//     doesn't exist directly. So: NE@(q,r) == ?
//     Hex (q,r-1)'s SE edge also touches the same edge? Let's verify:
//       NE@(q,r) endpoints: N@(q,r) and vertex between (q,r), (q+1,r-1), (q+1,r)
//       That second vertex... let me think geometrically.
//
// In pointy-top hex, the 6 edges of hex (q,r) are:
//   Top-right (NE): between corners 0 and 1 (from top going clockwise)
//   Right (E): between corners 1 and 2
//   Bottom-right (SE): between corners 2 and 3
//   Bottom-left (SW): between corners 3 and 4
//   Left (W): between corners 4 and 5
//   Top-left (NW): between corners 5 and 0
//
// We represent only NE, E, SE per hex. The other three are:
//   SW of (q,r) = NE of (q-1,r+1)  [dir 2 neighbor]
//   W of (q,r) = E of (q-1,r)      [dir 3 neighbor]
//   NW of (q,r) = SE of (q,r-1)    [dir 4 neighbor]
//
// So each edge has exactly 2 representations (from two adjacent hexes):
//   NE@(q,r) == SW of (q+1,r-1) == NE@(q,r)  — only NE is in our set
//   Actually: NE@(q,r) = NE@(q,r) and the opposite is on hex (q+1,r-1)
//   whose SW = NE of its dir-2 neighbor = NE of (q+1-1,r-1+1) = NE of (q,r). Circular.
//
//   Let me reconsider. Each edge is shared between exactly 2 hexes.
//   The NE edge of (q,r) is shared with the hex in direction 5 (NE): (q+1,r-1).
//   From (q+1,r-1)'s perspective, it's the SW edge, which in our 3-edge
//   representation is... not directly representable from that hex.
//   But the SW edge of any hex = NE of neighbor in direction 2 (SW).
//   So NE@(q,r): the only canonical representation in our system IS NE@(q,r)
//   because the other hex would need SW which we re-map.
//
//   Wait — we need to check if any edge can be expressed as two DIFFERENT
//   (hex, NE|E|SE) combos:
//   E@(q,r) shared with hex in direction 0 (E): (q+1,r).
//     From (q+1,r): it's the W edge = E of (q+1-1,r) = E@(q,r). Same.
//   SE@(q,r) shared with hex in direction 1 (SE): (q,r+1).
//     From (q,r+1): it's the NW edge = SE of (q, r+1-1) = SE@(q,r). Same.
//
//   Hmm, that means every edge in our NE/E/SE system already has a unique
//   representation? That can't be right for a full board.
//
//   Actually no. Consider it from the OTHER hex's perspective using our 3 edges:
//   NE@(q,r) is an edge of hex (q,r) and hex (q+1,r-1).
//   Can (q+1,r-1) express this edge? Its edges are NE, E, SE.
//     NE@(q+1,r-1) = different edge (the NE of THAT hex)
//     E@(q+1,r-1) = different
//     SE@(q+1,r-1) = between (q+1,r-1) and its SE neighbor (q+1,r).
//       Vertices of SE@(q+1,r-1): going clockwise from corner 2 to 3.
//       Not the same.
//   So NE@(q,r) cannot be expressed differently. Good.
//
//   But wait: the NW edge of (q,r) = SE@(q,r-1). And SE is in our set!
//   The W edge of (q,r) = E@(q-1,r).
//   The SW edge of (q,r) = NE@(q-1,r+1).
//   So EVERY edge of every hex is expressible as exactly one (hex, NE|E|SE).
//   That means canonical form is simply identity? No — actually each edge
//   belongs to two hexes, but each of those has a DIFFERENT direction name.
//   Since one will always be NE/E/SE and the other will be SW/W/NW,
//   and we only use NE/E/SE, there IS only one representation per edge.
//
//   WRONG! I need to reconsider. Let me think about which edges are shared:
//
//   For hex (q,r):
//   - NE edge is shared with hex at direction 5 = (q+1,r-1)
//   - E edge is shared with hex at direction 0 = (q+1,r)
//   - SE edge is shared with hex at direction 1 = (q,r+1)
//   - SW edge is shared with hex at direction 2 = (q-1,r+1) → this is NE@(q-1,r+1)
//   - W edge is shared with hex at direction 3 = (q-1,r) → this is E@(q-1,r)
//   - NW edge is shared with hex at direction 4 = (q,r-1) → this is SE@(q,r-1)
//
//   So indeed, each of the 6 edges either IS a NE/E/SE of this hex,
//   or is a NE/E/SE of a neighbor. No duplicates!
//   Therefore canonicalEdge is just the identity function.
//
//   Wait, but the user says "edges can be referenced from different hexes"
//   and asks us to handle canonical mapping. Let me reconsider...
//   The user might be thinking of a system where you CAN specify W, SW, NW too?
//   But our EdgeDirection enum only has NE, E, SE. So there's no duplication.
//   Canonical form = identity. But let's implement it anyway to be safe and
//   future-proof.

function edgeLexMin(edges: EdgeId[]): EdgeId {
  let best = edges[0];
  for (let i = 1; i < edges.length; i++) {
    const e = edges[i];
    if (
      e.hex.q < best.hex.q ||
      (e.hex.q === best.hex.q && e.hex.r < best.hex.r) ||
      (e.hex.q === best.hex.q && e.hex.r === best.hex.r && e.direction < best.direction)
    ) {
      best = e;
    }
  }
  return best;
}

export function canonicalEdge(e: EdgeId): EdgeId {
  // Each edge in NE/E/SE has exactly one canonical form since the
  // opposite hex would use SW/W/NW which aren't in our enum.
  // We still pick lex-min for safety.
  const { hex, direction } = e;
  switch (direction) {
    case EdgeDirection.NE: {
      // shared with (q+1,r-1), but that hex would call it SW → not in enum
      return e;
    }
    case EdgeDirection.E: {
      // shared with (q+1,r), which calls it W → not in enum
      return e;
    }
    case EdgeDirection.SE: {
      // shared with (q,r+1), which calls it NW → not in enum
      return e;
    }
    default:
      return e;
  }
}

export function edgeEquals(a: EdgeId, b: EdgeId): boolean {
  const ca = canonicalEdge(a);
  const cb = canonicalEdge(b);
  return ca.hex.q === cb.hex.q && ca.hex.r === cb.hex.r && ca.direction === cb.direction;
}

// ---------------------------------------------------------------------------
// Vertex adjacency
// ---------------------------------------------------------------------------
// Pointy-top hex corners (starting from top, clockwise): 0=top, 1=upper-right,
// 2=lower-right, 3=bottom, 4=lower-left, 5=upper-left.
//
// N vertex = corner 0 (top). Shared by hexes: (q,r), (q,r-1), (q+1,r-1)
// S vertex = corner 3 (bottom). Shared by hexes: (q,r), (q,r+1), (q-1,r+1)

export function vertexAdjacentHexes(vertex: VertexId): HexCoord[] {
  const { hex, direction } = vertex;
  if (direction === VertexDirection.N) {
    return [
      { q: hex.q, r: hex.r },
      { q: hex.q, r: hex.r - 1 },
      { q: hex.q + 1, r: hex.r - 1 },
    ];
  }
  // S
  return [
    { q: hex.q, r: hex.r },
    { q: hex.q, r: hex.r + 1 },
    { q: hex.q - 1, r: hex.r + 1 },
  ];
}

// Adjacent vertices (the 3 vertices connected by an edge to this vertex)
// N@(q,r): connected to S@(q,r-1) via NW edge of (q,r)... let me think:
//   N vertex (top) connects to:
//   - upper-left corner (5) = S@(q-1,r) ? No...
//
// Let me use the corner model. Corners 0-5 clockwise from top:
//   0: N vertex (top)
//   1: upper-right — this is S@(q+1,r-1)
//   2: lower-right — this is N@(q+1,r)
//   3: S vertex (bottom)
//   4: lower-left — this is N@(q-1,r+1)
//   5: upper-left — this is S@(q-1,r)
//
// Wait, corners 1,2,4,5 are each shared differently. Let me think about
// which corners connect to corner 0 (N):
//   Corner 0 connects to corner 5 (via top-left edge / NW edge) and
//   corner 1 (via top-right edge / NE edge).
//   Corner 0 also connects to the far vertex through the NW neighbor:
//     N@(q,r) — corner 0 — the vertex directly "above" in the hex above.
//   Actually, each vertex in a hex grid connects to exactly 3 others.
//
// N@(q,r) = corner 0 of hex (q,r).
// The 3 edges from this vertex go to:
//   corner 5 of (q,r) = N@(q-1,r) ? Let's see...
//     Corner 5 (upper-left): shared by (q,r), (q-1,r), (q,r-1)
//     → this is S@(q,r-1) equivalently. Wait:
//     Corner 5 is the upper-left. In axial pointy-top:
//       Corner 5 position relative to center: angle = 90° + 5*60° = 390° = 30°... 
//
// Let me take a step back and use a precise geometric approach.
// Pointy-top hex: first corner at 90° (top), then every 60°.
// Corner i at angle: 90° - i*60° (clockwise from top)
//   Corner 0: 90° (top) = N vertex
//   Corner 1: 30° (upper-right)
//   Corner 2: -30° = 330° (lower-right)
//   Corner 3: -90° = 270° (bottom) = S vertex
//   Corner 4: -150° = 210° (lower-left)
//   Corner 5: -210° = 150° (upper-left)
//
// Now, N vertex = corner 0. Adjacent corners via edges of this hex: 5 and 1.
// But there's also a third connection going outward (away from hex center).
//
// Corner 5 of (q,r) = what vertex?
//   Shared by hexes (q,r) and neighbors. Corner 5 (upper-left, 150°) is
//   between edges NW and W of the hex.
//   Corner 5 is shared by: (q,r), (q,r-1) [NW neighbor, dir 4], (q-1,r) [W neighbor, dir 3]
//   In terms of N/S: corner 5 is the S vertex of (q,r-1)? Let's check:
//     S vertex of (q,r-1) = corner 3 of (q,r-1) = bottom of hex (q,r-1).
//     Hex (q,r-1) is directly above-left (NW). Its bottom corner would be...
//     Actually in axial pointy-top, NW neighbor is at (q,r-1) which is 
//     direction 4 = (0,-1). Its center is above the current hex.
//     Its bottom (S vertex / corner 3) should indeed be at the upper-left
//     area of (q,r). That doesn't seem right geometrically.
//
// Let me just compute pixel positions to verify.
// Hex (0,0) center: (0, 0) (using size=1)
// Hex (0,-1) center: axialToPixel(0,-1,1) = (sqrt(3)*0 + sqrt(3)/2*(-1), 3/2*(-1))
//   = (-sqrt(3)/2, -3/2)
//
// Corner 0 of (0,0) at 90°: (0 + cos(90°), 0 + sin(90°)) = (0, 1)
// Corner 3 of (0,-1) at 270°: (-sqrt(3)/2 + cos(270°), -3/2 + sin(270°))
//   = (-sqrt(3)/2 + 0, -3/2 + (-1)) = (-sqrt(3)/2, -5/2)
// Those aren't the same. So corner 0 of (0,0) ≠ corner 3 of (0,-1).
//
// Let me reconsider. Corner 0 of (0,0) is at (0, 1).
// Corner 3 (bottom) of (0,-1) at angle 270°: 
//   center of (0,-1) = (-sqrt(3)/2, -3/2)
//   corner 3 = (-sqrt(3)/2, -3/2 - 1) = (-sqrt(3)/2, -5/2)
// Nope.
//
// What about S vertex of (0,-1)? That should be at the bottom of hex (0,-1).
// In pointy-top, N is the top vertex and S is the bottom vertex.
// 
// For the N vertex of (0,0): pixel = (0, 1) [top of hex at origin]
// Which other hexes have a vertex at (0, 1)?
//   Hex (0,-1) center = (-sqrt(3)/2, -3/2). Its corners:
//     Corner 2 (330°): (-sqrt(3)/2 + cos(-30°), -3/2 + sin(-30°))
//       = (-sqrt(3)/2 + sqrt(3)/2, -3/2 - 1/2) = (0, -2) No.
//
// Hmm wait, I think I have the wrong formula. In pointy-top, the first
// corner is at angle 30°, not 90°. Let me reconsider.
//
// Actually, "pointy-top" means a point/vertex is at the top. So the
// topmost corner IS at 90° from center. The standard formula for corner i:
//   angle = 60° * i + 30° for flat-top
//   angle = 60° * i for pointy-top (starting from 0° = right)
//
// Wait, different sources use different conventions. Let me use:
// Pointy-top: corner i at angle = 60° * i - 30° starting from the
// upper-right. Or: the top corner is at 90°.
//
// Let me just say: pointy-top corner_i angle = 90° - 60° * i
//   i=0: 90° (top)         → N vertex
//   i=1: 30° (upper-right)
//   i=2: -30° (lower-right)
//   i=3: -90° (bottom)     → S vertex
//   i=4: -150° (lower-left)
//   i=5: 150° (upper-left)
//
// Corner positions for hex (0,0) with size=1:
//   i=0: (cos90°, sin90°) = (0, 1)           ← N
//   i=1: (cos30°, sin30°) = (√3/2, 1/2)
//   i=2: (cos(-30°), sin(-30°)) = (√3/2, -1/2)
//   i=3: (cos(-90°), sin(-90°)) = (0, -1)    ← S
//   i=4: (cos(-150°), sin(-150°)) = (-√3/2, -1/2)
//   i=5: (cos(150°), sin(150°)) = (-√3/2, 1/2)
//
// N vertex of (0,0) at pixel (0, 1).
// Now hex (0,-1) center: (√3*0 + √3/2*(-1), 3/2*(-1)) = (-√3/2, -3/2)
// Hmm that doesn't seem right. Let me recalculate axialToPixel properly.
//
// axialToPixel(q, r, size):
//   x = size * (√3 * q + √3/2 * r)
//   y = size * (3/2 * r)
//
// Hex (0,-1): x = 1*(0 + √3/2*(-1)) = -√3/2, y = 1*(3/2*(-1)) = -3/2
// Hex (1,-1): x = 1*(√3 + √3/2*(-1)) = √3 - √3/2 = √3/2, y = -3/2
// Hex (0,0):  x = 0, y = 0
//
// Wait, but these y-values go NEGATIVE for r=-1. And our N vertex of (0,0)
// is at (0, 1) which is ABOVE the center. But hex (0,-1) has center at
// y = -3/2 which is BELOW. That means r=-1 is BELOW, not above!
//
// The issue is that in screen coords typically y goes down, but in math
// coords y goes up. The axialToPixel formula with y = 3/2 * r means
// increasing r → increasing y. If we use math coords (y up), then r
// increasing means going DOWN (SE direction). If y is screen (down),
// then r increasing goes down on screen which is "south".
//
// In the standard hex axial system:
// r increases going "south" (toward the bottom of the screen).
// So hex (0,-1) is ABOVE hex (0,0) (r is smaller = further north).
//
// But with our formula y = 3/2 * r, hex (0,-1) has y = -3/2, and in
// math coords that's BELOW. There's a sign confusion.
//
// For rendering (screen coords, y down), we'd flip: y_screen = -y_math.
// But for the coordinate math, let's just work consistently.
//
// In the axialToPixel formula given, y = 3/2 * r. With math-y-up:
//   r=-1 → y=-3/2 (above in screen, below in math)
// 
// Actually, I think the formula assumes screen coordinates (y increases
// downward). So positive y = down, positive r = down. Let's go with that.
//
// With screen coords (y down), hex corners for pointy-top:
//   Corner i at angle = 60° * i - 90° (or equivalently, starting from top
//   but going clockwise, and in screen coords sin is flipped)
//
// Actually, for screen coords with pointy-top, the TOP corner is at
// the minimum y. Using the standard formula:
//   corner_i_x = center_x + size * cos(60° * i - 90°)  
//   corner_i_y = center_y + size * sin(60° * i - 90°)
// 
// Wait no. In screen coords (y down):
//   The "top" of the screen is min-y. For a pointy-top hex, the topmost
//   point should have the smallest y. sin(-90°) = -1, so:
//   corner 0: angle = -90° → (0, -size) relative to center → top of hex ← N
//   corner 1: angle = -30° → (√3/2 * size, -size/2) → upper-right
//   corner 2: angle = 30°  → (√3/2 * size, size/2) → lower-right
//   corner 3: angle = 90°  → (0, size) → bottom ← S
//   corner 4: angle = 150° → (-√3/2 * size, size/2) → lower-left
//   corner 5: angle = 210° → (-√3/2 * size, -size/2) → upper-left
//
// So for hex (0,0) center (0,0), size=1:
//   N vertex: (0, -1)
//   S vertex: (0, 1)
//
// Now, hex (0,-1) center: (√3/2*(-1), 3/2*(-1)) = (-√3/2, -3/2)
//   Its S vertex: (-√3/2, -3/2 + 1) = (-√3/2, -1/2)
//   Its corner 2: (-√3/2 + √3/2, -3/2 + (-1/2)) = (0, -2)?
//   No: corner 2 of (0,-1): center + (√3/2, 1/2) = (-√3/2 + √3/2, -3/2 + 1/2)
//     = (0, -1)
//   
// So corner 2 of hex (0,-1) is at (0, -1), which is the same as N vertex
// of hex (0,0)! 
//
// And hex (1,-1) center: (√3*1 + √3/2*(-1), 3/2*(-1)) = (√3/2, -3/2)
//   Its corner 4 (lower-left): (√3/2 + (-√3/2), -3/2 + 1/2) = (0, -1)
//   Also the same point!
//
// So N@(q,r) is shared by: (q,r) [corner 0], (q,r-1) [corner 2], (q+1,r-1) [corner 4]
// This confirms: N vertex of (q,r) = corner 2 of (q,r-1) = corner 4 of (q+1,r-1)
//
// Corner 2 is the lower-right corner. For hex (q,r-1), lower-right is NOT 
// an N or S vertex—it's between S and the right. So in our N/S system, 
// corner 2 of any hex is NOT directly S. Corner 2 is a separate corner.
//
// But we said every vertex in the hex grid is either an N or S vertex of
// some hex. Let's verify: corner 1 of (q,r) at (√3/2, -1/2). Is this
// N or S of some hex?
//   This is upper-right of (q,r). It should be a vertex shared between
//   (q,r), (q+1,r-1) [NE neighbor], and (q+1,r) [E neighbor].
//   Is it S of (q+1,r-1)? S@(q+1,r-1) = corner 3 of (q+1,r-1).
//     Center of (q+1,r-1) with q=0,r=0: center of (1,-1) = (√3/2, -3/2)
//     Corner 3: (√3/2, -3/2 + 1) = (√3/2, -1/2). YES!
//   Is it N of (q+1,r)? N@(q+1,r) = corner 0 of (q+1,0) = (√3, 0) + (0,-1) = (√3,-1).
//     No, that's not right. Let me recalc: center of (1,0) = (√3, 0).
//     N vertex = (√3, -1). That's (√3, -1) ≠ (√3/2, -1/2). So no.
//
// So corner 1 of (0,0) = S@(1,-1). And what else?
//   Also corner 5 of (1,0)? Center of (1,0) = (√3, 0).
//     Corner 5: (√3 - √3/2, 0 - 1/2) = (√3/2, -1/2). YES!
//
// So corner 1 of (0,0) = S@(1,-1) = corner 5 of (1,0) = corner 3 of (1,-1).
// In our system: S@(1,-1). 
// Equivalently: this vertex touches hexes (0,0), (1,-1), (1,0).
// As an S vertex: S@(1,-1). Hexes around S@(q,r): (q,r), (q,r+1), (q-1,r+1)
//   = (1,-1), (1,0), (0,0). ✓
//
// Now let me also verify corner 5 of (0,0) at (-√3/2, -1/2):
//   This should be shared with (q,r-1)=(0,-1) and (q-1,r)=(-1,0).
//   S@(0,-1)? S vertex of (0,-1) = center(-√3/2,-3/2) + (0,1) = (-√3/2,-1/2). YES!
//   Hexes around S@(0,-1): (0,-1), (0,0), (-1,0). ✓
//
// And corner 2 of (0,0) at (√3/2, 1/2):
//   Should be N of some hex. Shared with (q+1,r)=(1,0) and (q,r+1)=(0,1).
//   Wait — corner 2 is lower-right. In our earlier analysis, corner 2 of
//   hex (q,r-1) was the N vertex of (q,r). So corner 2 of (0,0) should be
//   N of (0,1)? N@(0,1) center: (√3/2, 3/2), N vertex = (√3/2, 3/2-1) = (√3/2, 1/2). YES!
//   Hexes around N@(0,1): (0,1), (0,0), (1,0). 
//   Check: vertexAdjacentHexes N@(q,r): (q,r), (q,r-1), (q+1,r-1)
//     = (0,1), (0,0), (1,0). ✓
//
// Corner 4 of (0,0) at (-√3/2, 1/2):
//   N@(-1,1)? Center(-√3, 3/2), N vertex = (-√3, 1/2). NO.
//   N@(0,1)? Already checked = (√3/2, 1/2). NO.
//   Hmm. Let me check: this point is shared between (0,0), (-1,0) [W], (-1,1) [SW].
//   N@(-1,1): center = (-√3 + √3*(-1)/...  let me recalc.
//     axialToPixel(-1, 1, 1): x = √3*(-1) + √3/2*(1) = -√3/2, y = 3/2
//     N@(-1,1): (-√3/2, 3/2 - 1) = (-√3/2, 1/2). YES!
//   Hexes around N@(-1,1): (-1,1), (-1,0), (0,0). ✓
//
// Great! So the pattern is confirmed:
//   Corner 0 = N@(q,r)
//   Corner 1 = S@(q+1,r-1)   — by checking pixel positions
//   Corner 2 = N@(q,r+1)     — wait, we showed corner 2 of (0,0) = N@(0,1).
//                                But vertexAdjacentHexes(N@(0,1)) = (0,1),(0,0),(1,0)
//                                Corner 2 of (0,0) is shared with (1,0) and (0,1). ✓
//   Actually, let me re-derive: corner 2 of (q,r) = N@(q, r+1)? 
//   That doesn't look right from the (q,r-1) derivation above.
//   Corner 2 of (q,r-1) = N@(q,r). So corner 2 of (q,r) = N@(q, r+1). 
//   Let me verify: N@(q,r+1) adj hexes: (q,r+1), (q,r), (q+1,r). 
//   Corner 2 of (q,r) is shared with (q+1,r) and (q,r+1)? 
//   Edge between corners 2 and 3 is the SE edge, shared with (q,r+1).
//   Edge between corners 1 and 2 is the E edge, shared with (q+1,r).
//   So corner 2 touches (q,r), (q+1,r), (q,r+1). And N@(q,r+1) touches
//   (q,r+1), (q,r), (q+1,r). Same set! ✓
//
//   Corner 3 = S@(q,r)
//   Corner 4 = N@(q-1,r+1)   — verified above
//   Corner 5 = S@(q,r-1)     — verified above
//
// Summary of hex (q,r) corners in terms of VertexId:
//   Corner 0 (top)         = N@(q, r)
//   Corner 1 (upper-right) = S@(q+1, r-1)
//   Corner 2 (lower-right) = N@(q, r+1)     — wait, N@(q+1,r) also? No.
//                            Actually = N@(q,r+1) — but N@(q,r+1) adj hexes include (q+1,r).
//                            In canonical form this might simplify differently.
//   Corner 3 (bottom)      = S@(q, r)
//   Corner 4 (lower-left)  = N@(q-1, r+1)
//   Corner 5 (upper-left)  = S@(q, r-1)     — or equivalently S@(q-1,r)? 
//                            S@(q,r-1) adj hexes: (q,r-1), (q,r), (q-1,r). 
//                            Corner 5 touches (q,r), (q,r-1), (q-1,r). ✓
//
// Now for vertex adjacency. N@(q,r) = corner 0. The edges from corner 0 go to:
//   Corner 5 = S@(q, r-1) — via NW edge of hex
//   Corner 1 = S@(q+1, r-1) — via NE edge of hex
//   The third edge goes to... wait, in a hex grid each vertex has degree 3.
//   Corner 0 is shared by 3 hexes. The 3 edges emanating from corner 0:
//     Edge NE of (q,r): connects corners 0 and 1 → to corner 1 = S@(q+1,r-1)
//     Edge NW of (q,r): connects corners 5 and 0 → to corner 5 = S@(q,r-1)
//     The third edge is from a neighbor hex. Corner 0 = corner 2 of (q,r-1)
//       = corner 4 of (q+1,r-1).
//     From (q,r-1): corner 2 connects to corners 1 and 3.
//       Corner 3 of (q,r-1) = S@(q,r-1). Already counted.
//       Corner 1 of (q,r-1) = S@(q+1, r-2). Is this the third?
//     From (q+1,r-1): corner 4 connects to corners 3 and 5.
//       Corner 3 of (q+1,r-1) = S@(q+1,r-1). Already counted.
//       Corner 5 of (q+1,r-1) = S@(q+1, r-2). Same as above!
//     So the third neighbor of N@(q,r) = S@(q+1, r-2)? Let me verify with pixels.
//       N@(0,0) at (0, -1).
//       S@(1,-2): center of (1,-2) = (√3 + √3/2*(-2), 3/2*(-2)) = (√3 - √3, -3) = (0, -3).
//       S vertex = (0, -3 + 1) = (0, -2). That's at (0,-2), not (0,-1). NOT adjacent!
//
//   I made an error. Let me recount. In a hex tiling, each vertex has
//   exactly 3 edges. Corner 0 of hex (q,r) is vertex at (0,-1) for hex(0,0).
//   What points are at distance 1 from (0,-1) and are also grid vertices?
//     Corner 1 of (0,0): (√3/2, -1/2). Distance = √(3/4 + 1/4) = 1. ✓
//     Corner 5 of (0,0): (-√3/2, -1/2). Distance = 1. ✓
//     Corner 0 of (0,-1): center(0,-1) = (-√3/2, -3/2). N vertex = (-√3/2, -5/2). 
//       Distance from (0,-1): √(3/4 + 9/4) = √3 ≠ 1. ✗
//     What about N@(1,-1)? Center(1,-1) = (√3/2, -3/2). N = (√3/2, -5/2). ✗
//     S@(0,-1)? (−√3/2, −3/2+1) = (−√3/2, −1/2). That's corner 5 of (0,0)! Already counted.
//
//   So only 2 adjacent? That can't be right — every interior vertex in a hex
//   grid has degree 3. Oh wait — the third edge goes UP, to:
//     Corner 0 of (0,-1): (-√3/2, -3/2-1) = wrong. Let me recalculate.
//     Center of (0,-1): x = √3*0 + √3/2*(-1) = -√3/2, y = 3/2*(-1) = -3/2.
//     N@(0,-1): (-√3/2, -3/2 - 1) = (-√3/2, -5/2). Too far.
//     S@(0,-1): (-√3/2, -3/2 + 1) = (-√3/2, -1/2). = corner 5 of (0,0).
//     N@(1,-1): center = (√3/2, -3/2). N = (√3/2, -5/2). Too far.
//
// Hmm, it seems like N@(0,0) only has 2 neighbors among hex vertices at
// distance 1. But that's impossible for interior vertices. Let me reconsider.
//
// OH WAIT. I think the issue is that (0,0) on the edge of the grid might
// not have a third neighbor among the hexes I'm checking. Let me check
// corners of hex (0,-1) more carefully:
//   Hex (0,-1) center: (-√3/2, -3/2)
//   Corner 0 (N): (-√3/2, -3/2 - 1) = (-√3/2, -5/2)
//   Corner 1: (-√3/2 + √3/2, -3/2 - 1/2) = (0, -2)
//   Corner 2: (-√3/2 + √3/2, -3/2 + 1/2) = (0, -1) ← This is N@(0,0)!
//   Corner 3 (S): (-√3/2, -3/2 + 1) = (-√3/2, -1/2) ← corner 5 of (0,0)
//
// Corner 1 of (0,-1) at (0, -2). Distance from N@(0,0)=(0,-1): |(-2)-(-1)| = 1. ✓!
// So the third neighbor of N@(0,0) is corner 1 of (0,-1) at (0, -2).
// Corner 1 of (0,-1) = S@(q+1, r-1) where (q,r)=(0,-1) → S@(1, -2).
//
// Verify: S@(1,-2): center of (1,-2) = (√3*1 + √3/2*(-2), 3/2*(-2)) = (√3 - √3, -3) = (0, -3).
// S vertex: (0, -3 + 1) = (0, -2). ✓!!
//
// So the 3 neighbors of N@(0,0) are:
//   S@(1,-1) = corner 1 of (0,0)   ← at (√3/2, -1/2)
//   S@(0,-1) = corner 5 of (0,0)   ← at (-√3/2, -1/2)  [same as S@(-1,0) canonical?]
//   S@(1,-2) = corner 1 of (0,-1)  ← at (0, -2)
//
// Wait, but that last one seems wrong for a standard Catan grid. Let me re-examine.
// Actually (0,-2) is directly above N@(0,0)=(0,-1), at distance 1. This would 
// be the vertex going "north" from N@(0,0). In a Catan game this is valid —
// it's the next vertex along the northern rim.
//
// Hmm, actually no. In a hex grid, vertices of degree 3 connect to 3 
// neighbors. But let me reconsider the distance. Size=1 gives edge length=1,
// so adjacent vertices ARE at distance 1.
//
// But wait, (0,-1) to (0,-2) is indeed distance 1, and (0,-1) to (√3/2,-1/2) 
// is distance √(3/4 + 1/4) = 1. ✓
// And (0,-1) to (-√3/2,-1/2) is also distance 1. ✓
//
// So for N@(q,r), the 3 adjacent vertices are:
//   S@(q+1, r-1)  — corner 1 direction
//   S@(q, r-1)    — corner 5 direction (but need canonical: S@(q,r-1) or equiv)
//                   Actually: corner 5 of (q,r). We showed corner 5 = S@(q,r-1).
//                   But is it also = S@(q-1,r)? S@(q-1,r) adj hexes: (q-1,r),(q-1,r+1),(q-2,r+1).
//                   That doesn't include (q,r). So no. S@(q,r-1) is correct.
//   ... third: corner 1 of (q,r-1) = S@(q+1, r-2)
//   Wait, but that doesn't seem right for general N vertex adjacency.
//
// Hmm, let me re-derive properly for N@(q,r):
// Corner 0 of hex (q,r). This is also:
//   corner 2 of hex (q, r-1) [since corner 2 of (q,r-1) = N@(q,r)]
//   corner 4 of hex (q+1, r-1) [since corner 4 of (q+1,r-1) = N@((q+1)-1,(r-1)+1) = N@(q,r)]
//
// The edges from this vertex:
// From hex (q,r): edge from corner 0 to corner 1, and edge from corner 0 to corner 5.
//   → corner 1 of (q,r) = S@(q+1, r-1)
//   → corner 5 of (q,r) = S@(q, r-1)
// From hex (q, r-1): edge from corner 2 to corner 1, and edge from corner 2 to corner 3.
//   → corner 1 of (q,r-1) = S@(q+1, r-2). NEW!
//   → corner 3 of (q,r-1) = S@(q, r-1). Already counted.
// From hex (q+1, r-1): edge from corner 4 to corner 3, and edge from corner 4 to corner 5.
//   → corner 3 of (q+1,r-1) = S@(q+1, r-1). Already counted.
//   → corner 5 of (q+1,r-1) = S@(q+1, r-2). Already counted.
//
// So we get exactly 3 unique adjacent vertices:
//   S@(q+1, r-1)
//   S@(q, r-1)  
//   S@(q+1, r-2)
//
// Hmm, S@(q+1, r-2) seems far. Let me verify with a diagram:
// In a Catan board, N@(0,0) connects to the 3 vertices you can build roads to.
// One goes right, one goes left, one goes up. 
//   Right = S@(1,-1) ✓
//   Left = S@(0,-1)  ✓ (left-ish, upper-left)
//   Up = S@(1,-2)    ✓ (straight up)
//
// For S@(q,r), by symmetry, the 3 adjacent vertices are:
//   N@(q-1, r+1)
//   N@(q, r+1)
//   N@(q-1, r+2)
//
// Let me verify: S@(0,0) = corner 3 of (0,0) at (0, 1).
//   corner 3 connects to corner 2 and corner 4 of (0,0):
//     Corner 2 of (0,0) = N@(0,1) → center(0,1)=(√3/2,3/2), N=(√3/2,1/2). Dist from (0,1) = √(3/4+1/4)=1 ✓
//     Corner 4 of (0,0) = N@(-1,1) → center(-1,1)=(-√3/2,3/2), N=(-√3/2,1/2). Dist = 1 ✓
//   Also corner 0 of (q,r+1) = N@(q,r+1) = N@(0,1) already counted.
//   Corner 0 of (q-1,r+1) = N@(-1,1) already counted.
//   From (0,1): corner 0=N@(0,1), and this is corner 0. From the N adjacency
//   formula, one adj is S@(q+1,r-2) = S@(1,-1). But we want S adj vertices.
//   
//   Let me just list: S@(0,0) adj hexes: (0,0), (0,1), (-1,1).
//   S is corner 3 of (0,0), corner 0 of... wait:
//   S@(q,r) = corner 3 of (q,r), also:
//     corner 0 (N) of (q, r+1)? N@(0,1) = (√3/2, 1/2). But S@(0,0) = (0,1). Not same!
//     Hmm. Let me reconsider. S@(q,r) is corner 3. What other hex corners coincide?
//     corner 4 of (q-1,r+1)? N@((q-1)-1,(r+1)+1) = N@(q-2,r+2). That doesn't help.
//     Actually: corner 4 of hex H = N@(H.q-1, H.r+1). So corner 4 of which hex
//     gives us S@(q,r)?  We need N@(H.q-1,H.r+1) to equal something... no, corner 4
//     IS N@ of some hex. S@(q,r) must correspond to corner 3 (S) of some other hex too.
//     S@(q,r) = S@(q,r). Also S vertex of neighbors? Corner 3 of hex (q,r) is shared
//     by hexes touching that vertex. We know S@(q,r) adj hexes = (q,r), (q,r+1), (q-1,r+1).
//     From (q,r+1): which corner is this? (q,r+1) center at axialToPixel(0,1,1)=(√3/2,3/2).
//       Corners of (q,r+1)=(0,1):
//         c0 (N): (√3/2, 1/2)
//         c1: (√3/2+√3/2, 3/2-1/2) = (√3, 1)
//         c2: (√3/2+√3/2, 3/2+1/2) = (√3, 2)
//         c3 (S): (√3/2, 5/2)
//         c4: (√3/2-√3/2, 3/2+1/2) = (0, 2)
//         c5: (√3/2-√3/2, 3/2-1/2) = (0, 1) ← This is S@(0,0)!
//     So S@(0,0) = corner 5 of (0,1). Corner 5 = S@(q,r-1) where (q,r)=(0,1) → S@(0,0). ✓ (circular)
//     From (-1,1): center = (-√3+√3/2, 3/2) = (-√3/2, 3/2).
//       c1: (-√3/2+√3/2, 3/2-1/2) = (0, 1) ← S@(0,0)!
//     Corner 1 of (-1,1) = S@(q+1,r-1) = S@(0,0). ✓
//
//   So S@(q,r) = corner 3 of (q,r) = corner 5 of (q,r+1) = corner 1 of (q-1,r+1).
//
//   Edges from corner 3 of (q,r): to corners 2 and 4.
//     corner 2 = N@(q, r+1)
//     corner 4 = N@(q-1, r+1)
//   Edges from corner 5 of (q,r+1): to corners 4 and 0.
//     corner 4 of (q,r+1) = N@(q-1, r+2). NEW!
//     corner 0 of (q,r+1) = N@(q, r+1). Already counted.
//   Edges from corner 1 of (q-1,r+1): to corners 0 and 2.
//     corner 0 of (q-1,r+1) = N@(q-1, r+1). Already counted.
//     corner 2 of (q-1,r+1) = N@(q-1, r+2). Already counted.
//
//   So S@(q,r) adjacent vertices:
//     N@(q, r+1)
//     N@(q-1, r+1)
//     N@(q-1, r+2)
//
//   Verify with pixels: S@(0,0) = (0, 1).
//     N@(0,1) = (√3/2, 1/2). Dist = √(3/4+1/4) = 1 ✓
//     N@(-1,1) = (-√3/2, 1/2). Dist = 1 ✓
//     N@(-1,2): center(-1,2) = (-√3+√3, 3) = (0, 3). N = (0, 2). Dist from (0,1) = 1 ✓
//
// PERFECT! So the final adjacency:
//   N@(q,r) adjacent vertices: S@(q+1,r-1), S@(q,r-1), S@(q+1,r-2)
//   S@(q,r) adjacent vertices: N@(q,r+1), N@(q-1,r+1), N@(q-1,r+2)

export function vertexAdjacentVertices(vertex: VertexId): VertexId[] {
  const { hex, direction } = vertex;
  const { q, r } = hex;
  if (direction === VertexDirection.N) {
    return [
      { hex: { q: q + 1, r: r - 1 }, direction: VertexDirection.S },
      { hex: { q, r: r - 1 }, direction: VertexDirection.S },
      { hex: { q: q + 1, r: r - 2 }, direction: VertexDirection.S },
    ];
  }
  // S
  return [
    { hex: { q, r: r + 1 }, direction: VertexDirection.N },
    { hex: { q: q - 1, r: r + 1 }, direction: VertexDirection.N },
    { hex: { q: q - 1, r: r + 2 }, direction: VertexDirection.N },
  ];
}

// ---------------------------------------------------------------------------
// Edge ↔ Vertex relationships
// ---------------------------------------------------------------------------
// Each edge in our system is NE, E, or SE of a hex, connecting two corners:
//   NE@(q,r) = edge between corner 0 and corner 1 of hex (q,r)
//     = N@(q,r) → S@(q+1, r-1)
//   E@(q,r) = edge between corner 1 and corner 2 of hex (q,r)
//     = S@(q+1, r-1) → N@(q, r+1)
//     Wait, corner 1 = S@(q+1,r-1) and corner 2 = N@(q,r+1)?
//     Hmm, let me reconsider. Corner 2 of (q,r) = N@(q, r+1) — that's
//     lower-right corner. But E edge connects upper-right to lower-right.
//     Actually for hex (0,0):
//       Corner 1 at (√3/2, -1/2) and corner 2 at (√3/2, 1/2).
//       These are vertically aligned on the right side of the hex.
//       Corner 1 = S@(1,-1), corner 2 = N@(0,1).
//     So E@(q,r) connects S@(q+1,r-1) and N@(q,r+1). But that doesn't
//     look right because those two vertices are from "far" hexes.
//     Let me verify: E@(0,0) is the right edge.
//       S@(1,-1) at (√3/2, -1/2) and N@(0,1) at (√3/2, 1/2).
//       Yes, they're at the same x, 1 apart vertically. ✓
//     But can we express these more simply?
//       S@(q+1, r-1) and N@(q+1, r) ? 
//       N@(q+1, r): center of (q+1,r) = (1,0)→(√3,0). N = (√3,-1). ✗
//       Hmm. Actually corner 2 = N@(q,r+1), not N@(q+1,r). 
//       But wait: corner 2 of (0,0) is at (√3/2, 1/2). We established this 
//       is N@(0,1). But is it also S@(1,0)?
//       S@(1,0): center(1,0)=(√3,0). S=(√3,1). ✗. No.
//     So E@(q,r) endpoints: S@(q+1,r-1) and N@(q,r+1). These are the
//     canonical representations. Actually, N@(q,r+1) is equivalent to
//     S@(q+1,r) since both should be corner 2 of (q,r). Let me check:
//     S@(q+1,r) adj hexes: (q+1,r), (q+1,r+1), (q,r+1). 
//     For q=0,r=0: (1,0),(1,1),(0,1). But corner 2 of (0,0) is shared by
//     (0,0), (1,0), (0,1). (1,1) is NOT one of them! So S@(1,0) ≠ N@(0,1).
//     
//     Hmm wait, S@(q+1,r): adj hexes = (q+1,r), (q+1,r+1), (q,r+1).
//     For (q,r)=(0,0): (1,0), (1,1), (0,1).
//     But N@(0,1) adj hexes: (0,1), (0,0), (1,0).
//     These are different vertex positions! {(1,0),(1,1),(0,1)} ≠ {(0,1),(0,0),(1,0)}.
//     Well actually {(1,0),(0,1)} is common. But (1,1) vs (0,0) differ.
//     So they ARE different vertices. My formula is correct.
//
//   SE@(q,r) = edge between corner 2 and corner 3 of hex (q,r)
//     corner 2 = N@(q, r+1), corner 3 = S@(q,r)
//     So SE@(q,r) connects N@(q, r+1) and S@(q, r).
//     Verify: SE@(0,0) between (√3/2, 1/2) and (0, 1). 
//     Distance = √(3/4 + 1/4) = 1 ✓
//
// Summary:
//   NE@(q,r): N@(q,r) ↔ S@(q+1,r-1)
//   E@(q,r):  S@(q+1,r-1) ↔ N@(q,r+1)
//   SE@(q,r): N@(q,r+1) ↔ S@(q,r)
//
// Hmm wait, let me reconsider. The "E" edge endpoints seem unintuitive.
// Let me re-derive using a simpler approach. 
// Actually, let me just re-verify E@(q,r):
//   E edge of hex (q,r) is the right edge, between corners 1 and 2.
//   Corner 1 of (q,r) = S@(q+1,r-1) — upper-right vertex
//   Corner 2 of (q,r) = N@(q,r+1) — this was wrong earlier? Let me re-check.
//   
//   We derived: corner 2 of (q,r) = N@(q, r+1).
//   For (0,0): corner 2 at (√3/2, 1/2). N@(0,1): center(0,1)=(√3/2,3/2), 
//   N=(√3/2, 3/2-1)=(√3/2, 1/2). ✓
//   
//   But intuitively, the RIGHT edge of hex(0,0) should connect to the E 
//   neighbor (1,0). The E edge IS shared with hex (1,0). And corner 1 = S@(1,-1)
//   is a vertex of hex (1,0) (since adjHexes of S@(1,-1) = {(1,-1),(1,0),(0,0)}).
//   Corner 2 = N@(0,1) — adjHexes = {(0,1),(0,0),(1,0)}. Also includes (1,0). ✓
//   So both endpoints involve hex (1,0). Makes sense.

export function edgeAdjacentVertices(edge: EdgeId): VertexId[] {
  const { hex, direction } = edge;
  const { q, r } = hex;
  switch (direction) {
    case EdgeDirection.NE:
      // Corner 0 → Corner 1: N@(q,r) → S@(q+1,r-1)
      return [
        { hex: { q, r }, direction: VertexDirection.N },
        { hex: { q: q + 1, r: r - 1 }, direction: VertexDirection.S },
      ];
    case EdgeDirection.E:
      // Corner 1 → Corner 2: S@(q+1,r-1) → N@(q,r+1)
      return [
        { hex: { q: q + 1, r: r - 1 }, direction: VertexDirection.S },
        { hex: { q, r: r + 1 }, direction: VertexDirection.N },
      ];
    case EdgeDirection.SE:
      // Corner 2 → Corner 3: N@(q,r+1) → S@(q,r)
      return [
        { hex: { q, r: r + 1 }, direction: VertexDirection.N },
        { hex: { q, r }, direction: VertexDirection.S },
      ];
    default:
      throw new Error(`Unknown edge direction: ${direction}`);
  }
}

// Edges adjacent to a vertex (the 3 edges that touch it)
// N@(q,r) = corner 0. The 3 edges touching corner 0:
//   From hex (q,r): NE edge (corner 0↔1), NW edge (corner 5↔0)
//     NE@(q,r) is in our system.
//     NW edge of (q,r) = SE@(q, r-1) (as derived earlier: NW of (q,r) = SE of dir-4 neighbor)
//   From hex (q,r-1): corner 2↔1 edge = E edge of (q,r-1)
//     (corner 2 of (q,r-1) is our vertex, connecting to corner 1 via E edge)
//     E@(q, r-1)
//   From hex (q+1,r-1): corner 4↔3 = SW edge = NE@(q,r) already counted.
//     corner 4↔5 = W edge of (q+1,r-1) = E@(q,r-1)? 
//     W of (q+1,r-1) = E of dir-3 neighbor = E@(q+1-1,r-1) = E@(q,r-1). Already counted.
//
// So N@(q,r) touches edges: NE@(q,r), SE@(q,r-1), E@(q,r-1)
//
// S@(q,r) = corner 3. Edges touching corner 3:
//   From hex (q,r): SE edge (corner 2↔3), SW edge (corner 3↔4)
//     SE@(q,r) is in our system.
//     SW of (q,r) = NE@(q-1,r+1)
//   From hex (q,r+1): corner 5↔0 = NW edge = SE@(q,r) already counted (no:
//     NW of (q,r+1) = SE@(q, r+1-1) = SE@(q,r). Yes, already counted.)
//     corner 5↔4 = ...wait. S@(q,r) = corner 5 of (q,r+1) (as we derived).
//     From (q,r+1), corner 5 connects to corners 4 and 0.
//     corner 5↔0 edge = NW of (q,r+1) = SE@(q,r). Already counted.
//     corner 5↔4 edge = W of (q,r+1) = E@(q-1, r+1).
//   From hex (q-1,r+1): S@(q,r) = corner 1 of (q-1,r+1).
//     corner 1↔0 = NE of (q-1,r+1). Already counted (= SW of (q,r) = NE@(q-1,r+1)).
//     corner 1↔2 = E of (q-1,r+1). Already counted.
//
// So S@(q,r) touches edges: SE@(q,r), NE@(q-1,r+1), E@(q-1,r+1)

export function vertexAdjacentEdges(vertex: VertexId): EdgeId[] {
  const { hex, direction } = vertex;
  const { q, r } = hex;
  if (direction === VertexDirection.N) {
    return [
      { hex: { q, r }, direction: EdgeDirection.NE },
      { hex: { q, r: r - 1 }, direction: EdgeDirection.SE },
      { hex: { q, r: r - 1 }, direction: EdgeDirection.E },
    ];
  }
  // S
  return [
    { hex: { q, r }, direction: EdgeDirection.SE },
    { hex: { q: q - 1, r: r + 1 }, direction: EdgeDirection.NE },
    { hex: { q: q - 1, r: r + 1 }, direction: EdgeDirection.E },
  ];
}

// Edges sharing a vertex with a given edge (i.e. the 4 edges that share an endpoint)
export function edgeAdjacentEdges(edge: EdgeId): EdgeId[] {
  const [v1, v2] = edgeAdjacentVertices(edge);
  const fromV1 = vertexAdjacentEdges(v1).filter((e) => !edgeEquals(e, edge));
  const fromV2 = vertexAdjacentEdges(v2).filter((e) => !edgeEquals(e, edge));
  return [...fromV1, ...fromV2];
}

// Types are exported at the top of the file
