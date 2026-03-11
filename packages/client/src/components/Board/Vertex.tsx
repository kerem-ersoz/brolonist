import { vertexToPixel, type VertexDirection } from '@brolonist/shared';

const PLAYER_COLORS: Record<string, string> = {
  red: '#e53935', blue: '#1e88e5', white: '#eeeeee', orange: '#fb8c00',
  green: '#43a047', brown: '#6d4c41', purple: '#8e24aa', teal: '#00897b',
};

interface VertexProps {
  hex: { q: number; r: number };
  direction: VertexDirection;
  size: number;
  building?: { type: string; playerId: string; color: string } | null;
  validPlacement?: boolean;
  ghost?: { type: 'settlement' | 'city'; color: string } | null;
  onClick?: () => void;
}

export function Vertex({ hex, direction, size, building, validPlacement, ghost, onClick }: VertexProps) {
  const pos = vertexToPixel({ hex, direction }, size);
  const r = size * 0.18;
  const hitR = size * 0.35;

  if (building) {
    const color = PLAYER_COLORS[building.color] || '#999';
    if (building.type === 'city') {
      return (
        <rect
          x={pos.x - r * 1.2} y={pos.y - r * 1.2}
          width={r * 2.4} height={r * 2.4}
          fill={color} stroke="#000" strokeWidth={1}
          rx={2}
        />
      );
    }
    // Existing settlement — if ghost city upgrade, overlay the ghost
    if (ghost?.type === 'city') {
      const ghostColor = PLAYER_COLORS[ghost.color] || '#999';
      return (
        <g className="cursor-pointer" onClick={onClick}>
          <circle cx={pos.x} cy={pos.y} r={r} fill={color} stroke="#000" strokeWidth={1} />
          <rect
            x={pos.x - r * 1.2} y={pos.y - r * 1.2}
            width={r * 2.4} height={r * 2.4}
            fill={ghostColor} fillOpacity={0.5}
            stroke={ghostColor} strokeWidth={2}
            strokeDasharray="4 2"
            rx={2}
            className="animate-pulse"
          />
        </g>
      );
    }
    return <circle cx={pos.x} cy={pos.y} r={r} fill={color} stroke="#000" strokeWidth={1} />;
  }

  // Ghost settlement (no existing building)
  if (ghost?.type === 'settlement') {
    const ghostColor = PLAYER_COLORS[ghost.color] || '#999';
    return (
      <g className="cursor-pointer" onClick={onClick}>
        <circle cx={pos.x} cy={pos.y} r={hitR} fill="transparent" />
        <circle
          cx={pos.x} cy={pos.y} r={r}
          fill={ghostColor} fillOpacity={0.5}
          stroke={ghostColor} strokeWidth={2}
          strokeDasharray="4 2"
          className="animate-pulse pointer-events-none"
        />
      </g>
    );
  }

  if (validPlacement) {
    return (
      <g className="cursor-pointer" onClick={onClick}>
        <circle cx={pos.x} cy={pos.y} r={hitR} fill="transparent" />
        <circle
          cx={pos.x} cy={pos.y} r={r * 0.8}
          fill="#00ff88" fillOpacity={0.5}
          stroke="#00ff88" strokeWidth={1.5}
          className="animate-pulse pointer-events-none"
        />
      </g>
    );
  }

  // Invisible clickable hit target (build phase, no highlight)
  if (onClick) {
    return (
      <circle
        cx={pos.x} cy={pos.y} r={hitR}
        fill="transparent"
        className="cursor-pointer"
        onClick={onClick}
      />
    );
  }

  return null;
}
