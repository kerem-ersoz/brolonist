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
  onClick?: () => void;
}

export function Edge({ hex, direction, size, building, validPlacement, onClick }: EdgeProps) {
  const [v1, v2] = edgeAdjacentVertices({ hex, direction });
  const p1 = vertexToPixel(v1, size);
  const p2 = vertexToPixel(v2, size);

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

  if (validPlacement) {
    return (
      <line
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke="#00ff88" strokeWidth={size * 0.08}
        strokeLinecap="round" strokeOpacity={0.6}
        className="cursor-pointer"
        onClick={onClick}
      />
    );
  }

  return null;
}
