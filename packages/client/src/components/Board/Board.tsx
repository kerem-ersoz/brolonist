import { useMemo } from 'react';
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

interface BoardProps {
  board: BoardType;
  robberPosition: HexCoord;
  players: Array<{ id: string; color: string }>;
  size?: number;
  validSettlements?: Array<{ hex: HexCoord; direction: VertexDirection }>;
  validRoads?: Array<{ hex: HexCoord; direction: EdgeDirection }>;
  validRobberHexes?: Array<HexCoord>;
  onVertexClick?: (vertex: { hex: HexCoord; direction: VertexDirection }) => void;
  onEdgeClick?: (edge: { hex: HexCoord; direction: EdgeDirection }) => void;
  onHexClick?: (hex: HexCoord) => void;
}

export function Board({
  board, robberPosition, players, size = 50,
  validSettlements = [], validRoads = [], validRobberHexes = [],
  onVertexClick, onEdgeClick, onHexClick,
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

  const getBuildingWithColor = (b: Building | undefined): { type: string; playerId: string; color: string } | null => {
    if (!b) return null;
    return { type: b.type, playerId: b.playerId, color: playerColorMap[b.playerId] || 'white' };
  };

  const getVertexBuilding = (q: number, r: number, dir: VertexDirection) => {
    const key = `${q},${r},${dir}`;
    return getBuildingWithColor(board.vertexBuildings?.get(key));
  };

  const getEdgeBuilding = (q: number, r: number, dir: EdgeDirection) => {
    const key = `${q},${r},${dir}`;
    return getBuildingWithColor(board.edgeBuildings?.get(key));
  };

  const isValidSettlement = (q: number, r: number, dir: VertexDirection) =>
    validSettlements.some(v => v.hex.q === q && v.hex.r === r && v.direction === dir);

  const isValidRoad = (q: number, r: number, dir: EdgeDirection) =>
    validRoads.some(e => e.hex.q === q && e.hex.r === r && e.direction === dir);

  const isValidRobberHex = (q: number, r: number) =>
    validRobberHexes.some(h => h.q === q && h.r === r);

  const vertexDirs = [VertexDirection.N, VertexDirection.S] as const;
  const edgeDirs = [EdgeDirection.NE, EdgeDirection.E, EdgeDirection.SE] as const;

  return (
    <svg viewBox={viewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
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
          highlighted={isValidRobberHex(hex.coord.q, hex.coord.r)}
          onClick={isValidRobberHex(hex.coord.q, hex.coord.r) ? () => onHexClick?.(hex.coord) : undefined}
        />
      ))}

      {/* Harbors */}
      {board.harbors?.map((h, i) => (
        <Harbor key={`hb${i}`} position={h.position} type={h.type} size={size} />
      ))}

      {/* Edges (roads) */}
      {board.hexes?.map(hex =>
        edgeDirs.map(dir => {
          const building = getEdgeBuilding(hex.coord.q, hex.coord.r, dir);
          const valid = isValidRoad(hex.coord.q, hex.coord.r, dir);
          if (!building && !valid) return null;
          return (
            <Edge
              key={`e${hex.coord.q},${hex.coord.r},${dir}`}
              hex={hex.coord} direction={dir} size={size}
              building={building}
              validPlacement={valid}
              onClick={valid ? () => onEdgeClick?.({ hex: hex.coord, direction: dir }) : undefined}
            />
          );
        })
      )}

      {/* Vertices (settlements/cities) */}
      {board.hexes?.map(hex =>
        vertexDirs.map(dir => {
          const building = getVertexBuilding(hex.coord.q, hex.coord.r, dir);
          const valid = isValidSettlement(hex.coord.q, hex.coord.r, dir);
          if (!building && !valid) return null;
          return (
            <Vertex
              key={`v${hex.coord.q},${hex.coord.r},${dir}`}
              hex={hex.coord} direction={dir} size={size}
              building={building}
              validPlacement={valid}
              onClick={valid ? () => onVertexClick?.({ hex: hex.coord, direction: dir }) : undefined}
            />
          );
        })
      )}

      {/* Robber overlay */}
      <Robber hex={robberPosition} size={size} />
    </svg>
  );
}
