import { assetPath } from '../../utils/sprites';
import { useState, useEffect } from 'react';
import { axialToPixel, hexCorners } from '@brolonist/shared';

const TERRAIN_SPRITES: Record<string, string> = {
  hills: 'hex-brick.png',
  forest: 'hex-wood.png',
  mountains: 'hex-ore.png',
  fields: 'hex-grain.png',
  pasture: 'hex-sheep.png',
  desert: 'hex-desert.png',
  water: 'hex-water.png',
};

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

const NUMBER_SCALE: Record<number, number> = {
  2: 0.55, 3: 0.65, 4: 0.75, 5: 0.85, 6: 1, 8: 1, 9: 0.85, 10: 0.75, 11: 0.65, 12: 0.55,
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
  illuminated?: boolean;
}

export function HexTile({ q, r, terrain, numberToken, size, hasRobber, onClick, highlighted, illuminated }: HexTileProps) {
  const center = axialToPixel(q, r, size);
  const corners = hexCorners(q, r, size);
  const points = corners.map(c => `${c.x},${c.y}`).join(' ');
  const isRedNumber = numberToken === 6 || numberToken === 8;
  const spriteFile = TERRAIN_SPRITES[terrain] || 'hex-water.svg';
  const [hovered, setHovered] = useState(false);
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    if (illuminated) {
      setGlowing(true);
      const timer = setTimeout(() => setGlowing(false), 2000);
      return () => clearTimeout(timer);
    }
    setGlowing(false);
  }, [illuminated]);

  // The actual hex math width is sqrt(3)*size = 1.732*size, height is 2*size.
  // Our SVG viewBox is 0 0 100 100 which is square, so we can bound it to slightly larger than exact to cover fully, 
  // or exactly 2*size if it is scaled correctly.
  const imageSize = size * 2.1; 

  return (
    <g onClick={onClick} className={onClick ? 'cursor-pointer' : ''}
      onMouseEnter={highlighted ? () => setHovered(true) : undefined}
      onMouseLeave={highlighted ? () => setHovered(false) : undefined}
    >
      {/* Programmatic Fallback Background */}
      <polygon
        points={points}
        fill={TERRAIN_COLORS[terrain] || TERRAIN_COLORS.water}
        stroke={'#1a1a2e'}
        strokeWidth={1.5}
      />
      <image
        href={assetPath(`assets/sprites/${spriteFile}`)}
        x={center.x - imageSize / 2}
        y={center.y - imageSize / 2}
        width={imageSize}
        height={imageSize}
      />
      {numberToken && (
        <g pointerEvents="none">
          {/* Programmatic Fallback Circle */}
          <circle cx={center.x} cy={center.y} r={size * 0.4} fill="#f5f0dc" stroke="#333" strokeWidth={1} />
          <image
            href={assetPath('assets/sprites/number-tile.png')}
            x={center.x - size * 0.528}
            y={center.y - size * 0.528}
            width={size * 1.056}
            height={size * 1.056}
          />
          {glowing && (
            <circle
              cx={center.x} cy={center.y} r={size * 0.5}
              fill="#ff3333" opacity={0.55}
              className="animate-pulse"
            />
          )}
          <text
            x={center.x}
            y={center.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.3 * (NUMBER_SCALE[numberToken] || 0.75)}
            fontWeight="bold"
            fontFamily="Display, sans-serif"
            fill={isRedNumber ? '#c62828' : '#333'}
          >
            {numberToken}
          </text>
          <text
            x={center.x}
            y={center.y + size * 0.26}
            textAnchor="middle"
            fontSize={size * 0.2}
            fontWeight="bold"
            fontFamily="Display, sans-serif"
            fill={isRedNumber ? '#c62828' : '#333'}
            letterSpacing={-0.5}
          >
            {'•'.repeat(PROBABILITY_DOTS[numberToken] || 0)}
          </text>
        </g>
      )}
      {highlighted && hovered && (
        <image
          href={assetPath('assets/sprites/robber.png')}
          x={center.x - size * 0.525}
          y={center.y - size * 0.675}
          width={size * 1.05}
          height={size * 1.05}
          opacity={0.5}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
