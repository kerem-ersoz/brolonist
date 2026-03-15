import { useState } from 'react';
import { assetPath } from '../../utils/sprites';
import { axialToPixel, hexCorners, hexNeighborInDirection } from '@brolonist/shared';

const SHIP_SPRITES: Record<string, string> = {
  generic: 'ship-general.png',
  brick: 'ship-brick.png',
  lumber: 'ship-wood.png',
  ore: 'ship-ore.png',
  grain: 'ship-grain.png',
  wool: 'ship-sheep.png',
};

interface HarborProps {
  position: { q: number; r: number };
  vertices: unknown;
  type: string;
  size: number;
  facing?: number;
}

// When facing=D (water→land direction), the shared edge corners on the LAND hex
// are at direction (D+3)%6 from land's perspective.
// Corner pairs for each direction FROM the land hex toward water:
const DIR_TO_LAND_CORNERS: Record<number, [number, number]> = {
  0: [1, 2], // water is E of land
  1: [2, 3], // water is SE
  2: [3, 4], // water is SW
  3: [4, 5], // water is W
  4: [5, 0], // water is NW
  5: [0, 1], // water is NE
};

export function Harbor({ position, type, size, facing }: HarborProps) {
  if (facing == null) return null;

  const waterCenter = axialToPixel(position.q, position.r, size);
  const landHex = hexNeighborInDirection(position, facing);
  const landCorners = hexCorners(landHex.q, landHex.r, size);

  // Direction from land to water is (facing + 3) % 6
  const landToWaterDir = (facing + 3) % 6;
  const [c1, c2] = DIR_TO_LAND_CORNERS[landToWaterDir];
  const v1Pos = landCorners[c1];
  const v2Pos = landCorners[c2];

  const edgeMidX = (v1Pos.x + v2Pos.x) / 2;
  const edgeMidY = (v1Pos.y + v2Pos.y) / 2;

  const toWaterX = waterCenter.x - edgeMidX;
  const toWaterY = waterCenter.y - edgeMidY;
  const dist = Math.sqrt(toWaterX * toWaterX + toWaterY * toWaterY) || 1;
  const offsetDist = size * 1.1;
  const harborX = edgeMidX + (toWaterX / dist) * offsetDist;
  const harborY = edgeMidY + (toWaterY / dist) * offsetDist;

  const shipSprite = SHIP_SPRITES[type] || SHIP_SPRITES.generic;
  const shipSize = size * 1.35;

  // Bridge dimensions
  const bridgeWidth = size * 0.234;
  const [bridgeLoaded, setBridgeLoaded] = useState(false);

  function renderBridge(x1: number, y1: number, x2: number, y2: number, key: string) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return (
      <g key={key}>
        {!bridgeLoaded && (
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#8B7355" strokeWidth={bridgeWidth} strokeLinecap="round"
          />
        )}
        <image
          href={assetPath('assets/sprites/bridge.png')}
          x={x1}
          y={y1 - bridgeWidth / 2}
          width={len}
          height={bridgeWidth}
          transform={`rotate(${angle}, ${x1}, ${y1})`}
          preserveAspectRatio="none"
          onLoad={() => setBridgeLoaded(true)}
        />
      </g>
    );
  }

  return (
    <g>
      {renderBridge(v1Pos.x, v1Pos.y, harborX, harborY, 'b1')}
      {renderBridge(v2Pos.x, v2Pos.y, harborX, harborY, 'b2')}

      <image
        href={assetPath(`assets/sprites/${shipSprite}`)}
        x={harborX - shipSize / 2}
        y={harborY - shipSize / 2}
        width={shipSize}
        height={shipSize}
      />
    </g>
  );
}
