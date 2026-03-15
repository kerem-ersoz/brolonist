import { useMemo, useState, useRef, useCallback } from 'react';
import { HexTile } from './HexTile';
import { Vertex } from './Vertex';
import { Edge } from './Edge';
import { Harbor } from './Harbor';
import { Robber } from './Robber';
import {
  axialToPixel,
  VertexDirection,
  EdgeDirection,
  type HexCoord,
  type Board as BoardType,
  type Building,
} from '@brolonist/shared';

interface GhostPlacement {
  type: 'road' | 'settlement' | 'city';
  location: { hex: HexCoord; direction: string };
  color: string;
}

interface BoardProps {
  board: BoardType;
  robberPosition: HexCoord;
  players: Array<{ id: string; color: string }>;
  size?: number;
  validSettlements?: Array<{ hex: HexCoord; direction: VertexDirection }>;
  validRoads?: Array<{ hex: HexCoord; direction: EdgeDirection }>;
  validRobberHexes?: Array<HexCoord>;
  ghost?: GhostPlacement | null;
  myColor?: string | null;
  showDots?: boolean;
  buildPhaseActive?: boolean;
  rolledNumber?: number | null;
  onVertexClick?: (vertex: { hex: HexCoord; direction: VertexDirection }) => void;
  onEdgeClick?: (edge: { hex: HexCoord; direction: EdgeDirection }) => void;
  onHexClick?: (hex: HexCoord) => void;
  onBackgroundClick?: () => void;
}

export function Board({
  board, robberPosition, players, size = 50,
  validSettlements = [], validRoads = [], validRobberHexes = [],
  ghost, myColor, showDots, buildPhaseActive, rolledNumber,
  onVertexClick, onEdgeClick, onHexClick, onBackgroundClick,
}: BoardProps) {
  const viewBox = useMemo(() => {
    if (!board?.hexes?.length) return '-300 -300 600 600';
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const allCoords: HexCoord[] = [
      ...board.hexes.map(h => h.coord),
      ...(board.waterHexes || []),
    ];
    for (const coord of allCoords) {
      const { x, y } = axialToPixel(coord.q, coord.r, size);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const padding = size * 2;
    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
  }, [board, size]);

  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) map[p.id] = p.color;
    return map;
  }, [players]);

  if (!board) return null;

  // --- Pan & Zoom ---
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  }, []);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  const getBuildingWithColor = (b: Building | undefined): { type: string; playerId: string; color: string } | null => {
    if (!b) return null;
    return { type: b.type, playerId: b.playerId, color: playerColorMap[b.playerId] || 'white' };
  };

  const getVertexBuilding = (q: number, r: number, dir: VertexDirection) => {
    const key = `${q},${r},${dir}`;
    // vertexBuildings may be a Map (local) or plain object (from server JSON)
    const map = board.vertexBuildings;
    const b = map instanceof Map ? map.get(key) : (map as Record<string, Building>)?.[key];
    return getBuildingWithColor(b);
  };

  const getEdgeBuilding = (q: number, r: number, dir: EdgeDirection) => {
    const key = `${q},${r},${dir}`;
    const map = board.edgeBuildings;
    const b = map instanceof Map ? map.get(key) : (map as Record<string, Building>)?.[key];
    return getBuildingWithColor(b);
  };

  const isValidSettlement = (q: number, r: number, dir: VertexDirection) =>
    validSettlements.some(v => v.hex.q === q && v.hex.r === r && v.direction === dir);

  const isValidRoad = (q: number, r: number, dir: EdgeDirection) =>
    validRoads.some(e => e.hex.q === q && e.hex.r === r && e.direction === dir);

  const isValidRobberHex = (q: number, r: number) =>
    validRobberHexes.some(h => h.q === q && h.r === r);

  const getVertexGhost = (q: number, r: number, dir: VertexDirection) => {
    if (!ghost) return null;
    if (ghost.type !== 'settlement' && ghost.type !== 'city') return null;
    const loc = ghost.location;
    if (loc.hex.q === q && loc.hex.r === r && loc.direction === dir) {
      return { type: ghost.type, color: ghost.color };
    }
    return null;
  };

  const getEdgeGhost = (q: number, r: number, dir: EdgeDirection) => {
    if (!ghost || ghost.type !== 'road') return null;
    const loc = ghost.location;
    if (loc.hex.q === q && loc.hex.r === r && loc.direction === dir) {
      return { color: ghost.color };
    }
    return null;
  };

  const vertexDirs = [VertexDirection.N, VertexDirection.S] as const;
  const edgeDirs = [EdgeDirection.NE, EdgeDirection.E, EdgeDirection.SE] as const;

  return (
    <div
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
    <svg
      viewBox={viewBox}
      className="w-full h-full select-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center', userSelect: 'none', WebkitUserSelect: 'none' }}
      onClick={(e) => { if (e.target === e.currentTarget && onBackgroundClick) onBackgroundClick(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <filter id="building-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
        </filter>
        <filter id="road-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Water hexes */}
      {board.waterHexes?.map((h, i) => (
        <HexTile key={`w${i}`} q={h.q} r={h.r} terrain="water" numberToken={null} size={size} />
      ))}

      {/* Terrain hexes */}
      {board.hexes?.map((hex, i) => (
        <HexTile
          key={`h${i}`}
          q={hex.coord.q} r={hex.coord.r}
          terrain={hex.terrain}
          numberToken={hex.numberToken}
          size={size}
          hasRobber={hex.coord.q === robberPosition.q && hex.coord.r === robberPosition.r}
          illuminated={rolledNumber != null && hex.numberToken === rolledNumber}
          highlighted={isValidRobberHex(hex.coord.q, hex.coord.r)}
          onClick={
            isValidRobberHex(hex.coord.q, hex.coord.r)
              ? () => onHexClick?.(hex.coord)
              : ghost
                ? () => onBackgroundClick?.()
                : undefined
          }
        />
      ))}

      {/* Harbors */}
      {board.harbors?.map((h, i) => (
        <Harbor key={`hb${i}`} position={h.position} vertices={h.vertices} type={h.type} size={size} facing={h.facing} />
      ))}

      {/* Edges (roads) — built roads rendered first */}
      {[...board.hexes.map(h => h.coord), ...(board.waterHexes || [])].map(coord =>
        edgeDirs.map(dir => {
          const building = getEdgeBuilding(coord.q, coord.r, dir);
          const valid = isValidRoad(coord.q, coord.r, dir);
          const edgeGhost = getEdgeGhost(coord.q, coord.r, dir);
          const edgeClickable = valid || edgeGhost || buildPhaseActive;
          if (!building && !edgeClickable) return null;
          return (
            <Edge
              key={`e${coord.q},${coord.r},${dir}`}
              hex={coord} direction={dir} size={size}
              building={building}
              validPlacement={valid && !edgeGhost}
              ghost={edgeGhost}
              hoverGhostColor={myColor}
              showDot={showDots}
              onClick={edgeClickable ? () => onEdgeClick?.({ hex: coord, direction: dir }) : undefined}
            />
          );
        })
      )}

      {/* Vertices (settlements/cities) — terrain + water hexes, filtered to terrain-adjacent */}
      {(() => {
        const terrainSet = new Set(board.hexes.map(h => `${h.coord.q},${h.coord.r}`));
        const allCoords = [...board.hexes.map(h => h.coord), ...(board.waterHexes || [])];
        const seen = new Set<string>();
        return allCoords.flatMap(coord =>
          vertexDirs.map(dir => {
            const key = `${coord.q},${coord.r},${dir}`;
            if (seen.has(key)) return null;
            seen.add(key);
            // Only render vertices adjacent to at least one terrain hex
            const adjHexes = dir === VertexDirection.N
              ? [{ q: coord.q, r: coord.r }, { q: coord.q, r: coord.r - 1 }, { q: coord.q + 1, r: coord.r - 1 }]
              : [{ q: coord.q, r: coord.r }, { q: coord.q, r: coord.r + 1 }, { q: coord.q - 1, r: coord.r + 1 }];
            if (!adjHexes.some(h => terrainSet.has(`${h.q},${h.r}`))) return null;

            const building = getVertexBuilding(coord.q, coord.r, dir);
            const valid = isValidSettlement(coord.q, coord.r, dir);
            const vertGhost = getVertexGhost(coord.q, coord.r, dir);
            const vertClickable = valid || vertGhost || buildPhaseActive;
            if (!building && !vertClickable) return null;
            return (
              <Vertex
                key={`v${coord.q},${coord.r},${dir}`}
                hex={coord} direction={dir} size={size}
                building={building}
                validPlacement={valid && !vertGhost}
                ghost={vertGhost}
                hoverGhostColor={myColor}
                showDot={showDots}
                onClick={vertClickable ? () => onVertexClick?.({ hex: coord, direction: dir }) : undefined}
              />
            );
          })
        );
      })()}

      {/* Robber overlay */}
      <Robber hex={robberPosition} size={size} />
    </svg>
    </div>
  );
}
