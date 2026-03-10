import { axialToPixel, hexCorners } from '@brolonist/shared';

const TERRAIN_COLORS: Record<string, string> = {
  hills: '#c45a2c',
  forest: '#2d6b2d',
  mountains: '#6b6b6b',
  fields: '#d4a832',
  pasture: '#7bc67b',
  desert: '#d4c48a',
  water: '#3a7bd5',
};

const PROBABILITY_DOTS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

interface HexTileProps {
  q: number;
  r: number;
  terrain: string;
  numberToken: number | null;
  size: number;
  hasRobber?: boolean;
  onClick?: () => void;
  highlighted?: boolean;
}

export function HexTile({ q, r, terrain, numberToken, size, hasRobber, onClick, highlighted }: HexTileProps) {
  const center = axialToPixel(q, r, size);
  const corners = hexCorners(q, r, size);
  const points = corners.map(c => `${c.x},${c.y}`).join(' ');
  const isRedNumber = numberToken === 6 || numberToken === 8;

  return (
    <g onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
      <polygon
        points={points}
        fill={TERRAIN_COLORS[terrain] || TERRAIN_COLORS.water}
        stroke={highlighted ? '#00ff88' : '#1a1a2e'}
        strokeWidth={highlighted ? 3 : 1.5}
        opacity={highlighted ? 0.9 : 1}
      />
      {numberToken && (
        <>
          <circle cx={center.x} cy={center.y} r={size * 0.3} fill="#f5f0dc" stroke="#333" strokeWidth={1} />
          <text
            x={center.x}
            y={center.y + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.3}
            fontWeight="bold"
            fill={isRedNumber ? '#c62828' : '#333'}
          >
            {numberToken}
          </text>
          <text
            x={center.x}
            y={center.y + size * 0.18}
            textAnchor="middle"
            fontSize={size * 0.12}
            fill={isRedNumber ? '#c62828' : '#666'}
          >
            {'•'.repeat(PROBABILITY_DOTS[numberToken] || 0)}
          </text>
        </>
      )}
      {hasRobber && (
        <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.5}>
          🏴
        </text>
      )}
    </g>
  );
}
