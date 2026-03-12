import { axialToPixel, vertexToPixel, type VertexId } from '@brolonist/shared';

const HARBOR_LABELS: Record<string, string> = {
  generic: '3:1', brick: '2:1', lumber: '2:1', ore: '2:1',
  grain: '2:1', wool: '2:1',
};

const HARBOR_RESOURCE_SPRITES: Record<string, string> = {
  brick: 'pip-brick',
  lumber: 'pip-wood',
  ore: 'pip-ore',
  grain: 'pip-grain',
  wool: 'pip-sheep',
};

interface HarborProps {
  position: { q: number; r: number };
  vertices: [VertexId, VertexId];
  type: string;
  size: number;
}

export function Harbor({ position, vertices, type, size }: HarborProps) {
  const waterCenter = axialToPixel(position.q, position.r, size);
  const v1Pos = vertexToPixel(vertices[0], size);
  const v2Pos = vertexToPixel(vertices[1], size);

  // Place harbor at the midpoint of the two vertices, offset toward the water hex
  const edgeMidX = (v1Pos.x + v2Pos.x) / 2;
  const edgeMidY = (v1Pos.y + v2Pos.y) / 2;

  // Offset from edge midpoint toward water center
  const toWaterX = waterCenter.x - edgeMidX;
  const toWaterY = waterCenter.y - edgeMidY;
  const dist = Math.sqrt(toWaterX * toWaterX + toWaterY * toWaterY) || 1;
  const offsetDist = size * 0.55;
  const harborX = edgeMidX + (toWaterX / dist) * offsetDist;
  const harborY = edgeMidY + (toWaterY / dist) * offsetDist;

  const resourceSprite = HARBOR_RESOURCE_SPRITES[type];

  return (
    <g>
      {/* Bridges from harbor to each vertex */}
      <line
        x1={harborX} y1={harborY} x2={v1Pos.x} y2={v1Pos.y}
        stroke="#8B7355" strokeWidth={size * 0.06} strokeLinecap="round"
      />
      <line
        x1={harborX} y1={harborY} x2={v2Pos.x} y2={v2Pos.y}
        stroke="#8B7355" strokeWidth={size * 0.06} strokeLinecap="round"
      />
      {/* Small circles at bridge endpoints on vertices */}
      <circle cx={v1Pos.x} cy={v1Pos.y} r={size * 0.06} fill="#8B7355" />
      <circle cx={v2Pos.x} cy={v2Pos.y} r={size * 0.06} fill="#8B7355" />

      {/* Harbor body */}
      <circle cx={harborX} cy={harborY} r={size * 0.25} fill="#2a4858" stroke="#4a90d9" strokeWidth={1} />
      <image
        href="/assets/sprites/harbor.svg"
        x={harborX - size * 0.4}
        y={harborY - size * 0.4}
        width={size * 0.8}
        height={size * 0.8}
      />
      <rect
        x={harborX - size * 0.3}
        y={harborY - size * 0.15}
        width={size * 0.6}
        height={size * 0.3}
        fill="rgba(255,255,255,0.8)"
        rx={size * 0.05}
      />
      <text
        x={harborX + (resourceSprite ? -size * 0.1 : 0)} y={harborY}
        textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.2} fill="#333" fontWeight="bold" fontFamily="Display, sans-serif"
      >
        {HARBOR_LABELS[type] || '3:1'}
      </text>
      {resourceSprite && (
        <image
          href={`/assets/sprites/${resourceSprite}.svg`}
          x={harborX + size * 0.05}
          y={harborY - size * 0.12}
          width={size * 0.24}
          height={size * 0.24}
        />
      )}
    </g>
  );
}
