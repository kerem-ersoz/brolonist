import { vertexToPixel, edgeAdjacentVertices, type EdgeDirection } from '@brolonist/shared';

const PLAYER_COLORS: Record<string, string> = {
  red: '#e53935', blue: '#1e88e5', white: '#eeeeee', orange: '#fb8c00',
  green: '#43a047', brown: '#6d4c41', purple: '#8e24aa', teal: '#00897b',
};

interface EdgeProps {
  hex: { q: number; r: number };
  direction: EdgeDirection;
  size: number;
  building?: { type: string; playerId: string; color: string } | null;
  validPlacement?: boolean;
  ghost?: { color: string } | null;
  onClick?: () => void;
}

export function Edge({ hex, direction, size, building, validPlacement, ghost, onClick }: EdgeProps) {
  const [v1, v2] = edgeAdjacentVertices({ hex, direction });
  const p1 = vertexToPixel(v1, size);
  const p2 = vertexToPixel(v2, size);
  const hitWidth = size * 0.3;

  if (building) {
    const color = PLAYER_COLORS[building.color] || '#999';
    return (
      <line
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={color} strokeWidth={size * 0.12}
        strokeLinecap="round"
      />
    );
  }

  // Ghost road preview
  if (ghost) {
    const ghostColor = PLAYER_COLORS[ghost.color] || '#999';
    return (
      <g className="cursor-pointer" onClick={onClick}>
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="transparent" strokeWidth={hitWidth}
          strokeLinecap="round"
        />
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={ghostColor} strokeWidth={size * 0.12}
          strokeLinecap="round" strokeOpacity={0.5}
          strokeDasharray={`${size * 0.1} ${size * 0.06}`}
          className="animate-pulse pointer-events-none"
        />
      </g>
    );
  }

  if (validPlacement) {
    return (
      <g className="cursor-pointer" onClick={onClick}>
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="transparent" strokeWidth={hitWidth}
          strokeLinecap="round"
        />
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="#00ff88" strokeWidth={size * 0.08}
          strokeLinecap="round" strokeOpacity={0.6}
          className="pointer-events-none"
        />
      </g>
    );
  }

  // Invisible clickable hit target (build phase, no highlight)
  if (onClick) {
    return (
      <line
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke="transparent" strokeWidth={hitWidth}
        strokeLinecap="round"
        className="cursor-pointer"
        onClick={onClick}
      />
    );
  }

  return null;
}
