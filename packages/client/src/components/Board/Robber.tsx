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
      <image
        href="/assets/sprites/robber.png"
        x={pos.x - size * 0.525}
        y={pos.y - size * 0.675}
        width={size * 1.05}
        height={size * 1.05}
      />
    </g>
  );
}
