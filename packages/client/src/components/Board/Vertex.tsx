import { useState, useRef, useEffect } from 'react';
import { vertexToPixel, type VertexDirection } from '@brolonist/shared';
import { assetPath } from '../../utils/sprites';

const PLAYER_COLORS: Record<string, string> = {
  red: '#e53935', blue: '#1e88e5', white: '#eeeeee', orange: '#fb8c00',
  green: '#43a047', brown: '#6d4c41', purple: '#8e24aa', teal: '#00897b',
  pink: '#ec407a', black: '#212121',
};

interface VertexProps {
  hex: { q: number; r: number };
  direction: VertexDirection;
  size: number;
  building?: { type: string; playerId: string; color: string } | null;
  validPlacement?: boolean;
  ghost?: { type: 'settlement' | 'city'; color: string } | null;
  hoverGhostColor?: string | null;
  showDot?: boolean;
  onClick?: () => void;
}

export function Vertex({ hex, direction, size, building, validPlacement, ghost, hoverGhostColor, showDot, onClick }: VertexProps) {
  const pos = vertexToPixel({ hex, direction }, size);
  const r = size * 0.18;
  const hitR = size * 0.2;
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

  const dropBounceStyle = animating ? {
    animation: 'building-drop-bounce 500ms ease-out',
    transformOrigin: `${pos.x}px ${pos.y}px`,
  } : undefined;

  if (building) {
    const color = PLAYER_COLORS[building.color] || '#999';
    if (building.type === 'city') {
      return (
        <g pointerEvents="none" filter="url(#building-shadow)" style={dropBounceStyle}>
          <image
            href={assetPath(`assets/sprites/city-${building.color}.png`)}
            x={pos.x - r * 3.7}
            y={pos.y - r * 3.7}
            width={r * 7.4}
            height={r * 7.4}
          />
        </g>
      );
    }
    // Existing settlement — if ghost city upgrade, overlay the ghost
    if (ghost?.type === 'city') {
      const ghostColor = PLAYER_COLORS[ghost.color] || '#999';
      return (
        <g className="cursor-pointer" onClick={onClick}>
          <circle cx={pos.x} cy={pos.y} r={hitR} fill="transparent" />
          <image href={assetPath(`assets/sprites/settlement-${building.color}.png`)} x={pos.x - r * 3.33} y={pos.y - r * 3.33} width={r * 6.66} height={r * 6.66} pointerEvents="none" />
          <image href={assetPath(`assets/sprites/city-${ghost.color}.png`)} x={pos.x - r * 3.12} y={pos.y - r * 3.12} width={r * 6.24} height={r * 6.24} opacity={0.5} className="animate-pulse" pointerEvents="none" />
        </g>
      );
    }
    // Existing settlement — clickable for city upgrade during build phase
    return (
      <g className={onClick ? 'cursor-pointer' : undefined} onClick={onClick} pointerEvents={onClick ? undefined : 'none'} filter="url(#building-shadow)" style={dropBounceStyle}>
        {onClick && <circle cx={pos.x} cy={pos.y} r={hitR} fill="transparent" />}
        <image href={assetPath(`assets/sprites/settlement-${building.color}.png`)} x={pos.x - r * 3.885} y={pos.y - r * 3.885} width={r * 7.77} height={r * 7.77} pointerEvents="none" />
      </g>
    );
  }

  // Ghost settlement (no existing building)
  if (ghost?.type === 'settlement') {
    const ghostColor = PLAYER_COLORS[ghost.color] || '#999';
    return (
      <g className="cursor-pointer" onClick={onClick}>
        <circle cx={pos.x} cy={pos.y} r={hitR} fill="transparent" />
        <image
          href={assetPath(`assets/sprites/settlement-${ghost.color}.png`)}
          x={pos.x - r * 3.33}
          y={pos.y - r * 3.33}
          width={r * 6.66}
          height={r * 6.66}
          opacity={0.5}
          className="animate-pulse pointer-events-none"
        />
      </g>
    );
  }

  if (validPlacement) {
    return (
      <g className="cursor-pointer" onClick={onClick}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <circle cx={pos.x} cy={pos.y} r={hitR} fill="transparent" />
        {hovered && hoverGhostColor ? (
          <image
            href={assetPath(`assets/sprites/settlement-${hoverGhostColor}.png`)}
            x={pos.x - r * 3.33}
            y={pos.y - r * 3.33}
            width={r * 6.66}
            height={r * 6.66}
            opacity={0.4}
            className="pointer-events-none"
          />
        ) : showDot ? (
          <circle
            cx={pos.x} cy={pos.y} r={r * 0.6}
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
