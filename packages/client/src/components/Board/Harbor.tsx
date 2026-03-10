import { axialToPixel } from '@brolonist/shared';

const HARBOR_LABELS: Record<string, string> = {
  generic: '3:1', brick: '2:1 🧱', lumber: '2:1 🪵', ore: '2:1 ⛏️',
  grain: '2:1 🌾', wool: '2:1 🐑',
};

interface HarborProps {
  position: { q: number; r: number };
  type: string;
  size: number;
}

export function Harbor({ position, type, size }: HarborProps) {
  const pos = axialToPixel(position.q, position.r, size);
  return (
    <g>
      <circle cx={pos.x} cy={pos.y} r={size * 0.25} fill="#2a4858" stroke="#4a90d9" strokeWidth={1} />
      <text
        x={pos.x} y={pos.y}
        textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.15} fill="#fff" fontWeight="bold"
      >
        {HARBOR_LABELS[type] || '3:1'}
      </text>
    </g>
  );
}
