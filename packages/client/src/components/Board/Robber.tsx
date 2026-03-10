import { axialToPixel } from '@brolonist/shared';

interface RobberProps {
  hex: { q: number; r: number };
  size: number;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function Robber({ hex, size, draggable }: RobberProps) {
  const pos = axialToPixel(hex.q, hex.r, size);
  return (
    <g className={draggable ? 'cursor-grab' : ''}>
      <circle cx={pos.x} cy={pos.y - size * 0.1} r={size * 0.22} fill="#1a1a1a" stroke="#444" strokeWidth={1.5} />
      <text x={pos.x} y={pos.y - size * 0.1} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.25}>
        🏴‍☠️
      </text>
    </g>
  );
}
