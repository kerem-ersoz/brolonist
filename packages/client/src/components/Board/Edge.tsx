import { useState, useRef, useEffect } from 'react';
import { vertexToPixel, edgeAdjacentVertices, type EdgeDirection } from '@brolonist/shared';
import { assetPath } from '../../utils/sprites';

const PLAYER_COLORS: Record<string, string> = {
  red: '#e53935', blue: '#1e88e5', white: '#eeeeee', orange: '#fb8c00',
  green: '#43a047', brown: '#6d4c41', purple: '#8e24aa', teal: '#00897b',
  pink: '#ec407a', black: '#212121',
};

interface EdgeProps {
  hex: { q: number; r: number };
  direction: EdgeDirection;
  size: number;
  building?: { type: string; playerId: string; color: string } | null;
  validPlacement?: boolean;
  ghost?: { color: string } | null;
  hoverGhostColor?: string | null;
  showDot?: boolean;
  onClick?: () => void;
}

export function Edge({ hex, direction, size, building, validPlacement, ghost, hoverGhostColor, showDot, onClick }: EdgeProps) {
  const [v1, v2] = edgeAdjacentVertices({ hex, direction });
  const p1 = vertexToPixel(v1, size);
  const p2 = vertexToPixel(v2, size);
  const hitWidth = size * 0.3;
  const [hovered, setHovered] = useState(false);
  const [animating, setAnimating] = useState(false);
  const prevBuildingRef = useRef<string | null>(null);

  useEffect(() => {
    const key = building ? `${building.type}-${building.playerId}` : null;
    if (key && key !== prevBuildingRef.current) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 500);
      prevBuildingRef.current = key;
      return () => clearTimeout(timer);
    }
    prevBuildingRef.current = key;
  }, [building]);

  if (building) {
    const color = PLAYER_COLORS[building.color] || '#999';
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const length = Math.sqrt(dx * dx + dy * dy);
    const displayLength = length * 0.9;

    const dropBounceStyle = animating ? {
      animation: 'building-drop-bounce 500ms ease-out',
      transformOrigin: `${mx}px ${my}px`,
    } : undefined;

    return (
      <g pointerEvents="none" filter="url(#road-glow)" style={dropBounceStyle}>
        <image
          href={assetPath(`assets/sprites/road-${building.color}.png`)}
          x={mx - displayLength / 2}
          y={my - length / 2}
          width={displayLength}
          height={length}
          transform={`rotate(${angle}, ${mx}, ${my})`}
        />
      </g>
    );
  }

  // Ghost road preview
  if (ghost) {
    const ghostColor = PLAYER_COLORS[ghost.color] || '#999';
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const length = Math.sqrt(dx * dx + dy * dy);

    return (
      <g className="cursor-pointer" onClick={onClick}>
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="transparent" strokeWidth={hitWidth}
          strokeLinecap="round"
        />
        <image
          href={assetPath(`assets/sprites/road-${ghost.color}.png`)}
          x={mx - length / 2}
          y={my - length / 2}
          width={length}
          height={length}
          transform={`rotate(${angle}, ${mx}, ${my})`}
          opacity={0.5}
          className="animate-pulse pointer-events-none"
        />
      </g>
    );
  }

  if (validPlacement) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const length = Math.sqrt(dx * dx + dy * dy);
    return (
      <g className="cursor-pointer" onClick={onClick}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="transparent" strokeWidth={hitWidth}
          strokeLinecap="round"
        />
        {hovered && hoverGhostColor ? (
          <image
            href={assetPath(`assets/sprites/road-${hoverGhostColor}.png`)}
            x={mx - length / 2}
            y={my - length / 2}
            width={length}
            height={length}
            transform={`rotate(${angle}, ${mx}, ${my})`}
            opacity={0.4}
            className="pointer-events-none"
          />
        ) : showDot ? (
          <circle
            cx={mx} cy={my} r={size * 0.08}
            fill="#00ff88" fillOpacity={0.6}
            stroke="#00ff88" strokeWidth={1}
            className="pointer-events-none"
          />
        ) : null}
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
