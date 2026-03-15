import { useRef, useEffect, useState } from 'react';
import { assetPath } from '../../utils/sprites';
import { axialToPixel } from '@brolonist/shared';

interface RobberProps {
  hex: { q: number; r: number };
  size: number;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function Robber({ hex, size, draggable }: RobberProps) {
  const target = axialToPixel(hex.q, hex.r, size);
  const prevHex = useRef<{ q: number; r: number }>(hex);
  const [pos, setPos] = useState(target);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevHex.current.q === hex.q && prevHex.current.r === hex.r) return;
    const dest = axialToPixel(hex.q, hex.r, size);
    // Start from previous position (already rendered there), then slide
    setAnimating(true);
    // Use rAF to ensure the non-animated position is painted first
    requestAnimationFrame(() => {
      setPos(dest);
    });
    const timer = setTimeout(() => setAnimating(false), 1500);
    prevHex.current = hex;
    return () => clearTimeout(timer);
  }, [hex.q, hex.r, size]);

  // Keep pos in sync when size changes without hex changing
  useEffect(() => {
    if (!animating) {
      setPos(axialToPixel(hex.q, hex.r, size));
    }
  }, [size, animating, hex.q, hex.r]);

  return (
    <g
      className={draggable ? 'cursor-grab' : ''}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: animating ? 'transform 1500ms cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
      }}
    >
      <image
        href={assetPath('assets/sprites/robber.png')}
        x={-size * 0.656}
        y={-size * 0.844}
        width={size * 1.3125}
        height={size * 1.3125}
      />
    </g>
  );
}
