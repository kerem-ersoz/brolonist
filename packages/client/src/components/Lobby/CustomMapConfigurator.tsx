import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { generateProceduralGrid, hashSeed, mulberry32 } from '@brolonist/shared';
import { BoardShape } from '@brolonist/shared';

const HEX_SIZE = 5;
function hexToPixel(q: number, r: number): { x: number; y: number } {
  return { x: HEX_SIZE * (3 / 2 * q), y: HEX_SIZE * (Math.sqrt(3) * (r + q / 2)) };
}
function hexPoints(cx: number, cy: number, s: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
  }).join(' ');
}

interface CustomMapConfigOutput {
  tileCount: number;
  shape: string;
  seed?: string;
  resourceRatio?: number;
  desertRatio?: number;
  waterRatio?: number;
}

interface CustomMapConfiguratorProps {
  tileCount: number;
  shape: string;
  seed?: string;
  resourceRatio?: number;
  desertRatio?: number;
  waterRatio?: number;
  onChange: (config: CustomMapConfigOutput) => void;
}

const SHAPES: { value: BoardShape; labelKey: string }[] = [
  { value: BoardShape.Round, labelKey: 'map.custom_round' },
  { value: BoardShape.Elongated, labelKey: 'map.custom_elongated' },
  { value: BoardShape.Star, labelKey: 'map.custom_star' },
  { value: BoardShape.Random, labelKey: 'map.custom_random' },
];

/**
 * Adjust linked ratios so they always sum to 100.
 * When `changed` slider moves, the other two adjust proportionally.
 */
function adjustRatios(
  changed: 'resource' | 'desert' | 'water',
  newValue: number,
  current: { resource: number; desert: number; water: number },
): { resource: number; desert: number; water: number } {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const remaining = 100 - clamped;

  const keys = ['resource', 'desert', 'water'] as const;
  const others = keys.filter(k => k !== changed);
  const otherSum = others.reduce((s, k) => s + current[k], 0);

  const result = { ...current, [changed]: clamped };
  if (otherSum > 0) {
    // Distribute remaining proportionally
    let allocated = 0;
    for (let i = 0; i < others.length - 1; i++) {
      const k = others[i];
      result[k] = Math.round((current[k] / otherSum) * remaining);
      allocated += result[k];
    }
    // Last one gets the remainder to avoid rounding drift
    result[others[others.length - 1]] = remaining - allocated;
  } else {
    // Others were both 0 — split remaining evenly
    result[others[0]] = Math.floor(remaining / 2);
    result[others[1]] = remaining - result[others[0]];
  }
  return result;
}

export function CustomMapConfigurator({
  tileCount,
  shape,
  seed: initialSeed,
  resourceRatio: initRR,
  desertRatio: initDR,
  waterRatio: initWR,
  onChange,
}: CustomMapConfiguratorProps) {
  const { t } = useTranslation();
  const [localCount, setLocalCount] = useState(tileCount);
  const [localSeed, setLocalSeed] = useState(initialSeed ?? '');
  const [ratios, setRatios] = useState({
    resource: initRR ?? 95,
    desert: initDR ?? 5,
    water: initWR ?? 0,
  });

  const emit = useCallback(
    (overrides: Partial<{ tileCount: number; shape: string; seed: string; resource: number; desert: number; water: number }>) => {
      const tc = overrides.tileCount ?? localCount;
      const sh = overrides.shape ?? shape;
      const sd = 'seed' in overrides ? overrides.seed : localSeed;
      const rr = overrides.resource ?? ratios.resource;
      const dr = overrides.desert ?? ratios.desert;
      const wr = overrides.water ?? ratios.water;
      const cfg: CustomMapConfigOutput = { tileCount: tc, shape: sh };
      if (sd) cfg.seed = sd;
      cfg.resourceRatio = rr;
      cfg.desertRatio = dr;
      cfg.waterRatio = wr;
      onChange(cfg);
    },
    [onChange, localCount, shape, localSeed, ratios],
  );

  const handleRatioChange = useCallback(
    (which: 'resource' | 'desert' | 'water', value: number) => {
      const newRatios = adjustRatios(which, value, ratios);
      setRatios(newRatios);
      emit({ resource: newRatios.resource, desert: newRatios.desert, water: newRatios.water });
    },
    [ratios, emit],
  );

  // Generate preview: solid canvas with seed-based water/desert/resource assignment
  const preview = useMemo(() => {
    const total = ratios.resource + ratios.desert + ratios.water;
    const waterCount = total > 0 ? Math.max(0, Math.round(localCount * ratios.water / total)) : 0;
    const desertCountVal = total > 0 ? Math.max(0, Math.round(localCount * ratios.desert / total)) : 0;

    // Full solid canvas
    const allPositions = localCount > 0
      ? generateProceduralGrid(localCount, shape as BoardShape, localSeed || undefined)
      : [];

    // Seed-based shuffled assignment
    const numSeed = localSeed ? hashSeed(localSeed) : localCount * 31337;
    const rng = mulberry32(numSeed);
    const indices = allPositions.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const tileTypes: Array<'water' | 'desert' | 'resource'> = new Array(allPositions.length);
    for (let i = 0; i < indices.length; i++) {
      if (i < waterCount) tileTypes[indices[i]] = 'water';
      else if (i < waterCount + desertCountVal) tileTypes[indices[i]] = 'desert';
      else tileTypes[indices[i]] = 'resource';
    }

    const pixels = allPositions.map((h, i) => ({
      ...hexToPixel(h.q, h.r),
      type: tileTypes[i],
    }));
    if (pixels.length === 0) return { pixels: [], vb: '0 0 100 100' };
    const minX = Math.min(...pixels.map(p => p.x)) - HEX_SIZE * 1.5;
    const maxX = Math.max(...pixels.map(p => p.x)) + HEX_SIZE * 1.5;
    const minY = Math.min(...pixels.map(p => p.y)) - HEX_SIZE * 1.5;
    const maxY = Math.max(...pixels.map(p => p.y)) + HEX_SIZE * 1.5;
    return { pixels, vb: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
  }, [localCount, shape, localSeed, ratios]);

  const RATIO_SLIDERS = [
    { key: 'resource' as const, labelKey: 'map.custom_ratioResource', color: 'accent-green-500' },
    { key: 'desert' as const, labelKey: 'map.custom_ratioDesert', color: 'accent-amber-500' },
    { key: 'water' as const, labelKey: 'map.custom_ratioWater', color: 'accent-blue-500' },
  ];

  return (
    <div className="space-y-3">
      {/* Tile Count Slider */}
      <div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">{t('map.custom_tileCount')}</span>
          <span className="font-bold text-sm">{localCount}</span>
        </div>
        <input
          type="range"
          min={19}
          max={200}
          step={1}
          value={localCount}
          onChange={(e) => {
            const val = Number(e.target.value);
            setLocalCount(val);
            emit({ tileCount: val });
          }}
          className="w-full mt-1 accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>19</span>
          <span>200</span>
        </div>
      </div>

      {/* Shape Selector */}
      <div>
        <span className="text-gray-400 text-sm block mb-1.5">{t('map.custom_shape')}</span>
        <div className="grid grid-cols-2 gap-1.5">
          {SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => emit({ shape: s.value })}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                shape === s.value
                  ? 'bg-amber-600 text-white border border-amber-500'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Seed Input */}
      <div>
        <span className="text-gray-400 text-sm">{t('map.custom_seed')}</span>
        <div className="flex gap-1 mt-1">
          <input
            type="text"
            maxLength={32}
            value={localSeed}
            onChange={(e) => {
              const val = e.target.value;
              setLocalSeed(val);
              emit({ seed: val });
            }}
            placeholder={t('map.custom_seedPlaceholder')}
            className="flex-1 bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 placeholder-gray-500"
          />
          <button
            onClick={() => {
              const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
              let s = '';
              for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
              setLocalSeed(s);
              emit({ seed: s });
            }}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 text-sm transition-colors"
            title={t('map.custom_randomize')}
          >
            🎲
          </button>
        </div>
      </div>

      {/* Tile Ratio Sliders */}
      <div className="overflow-hidden">
        <span className="text-gray-400 text-sm block mb-1.5">{t('map.custom_tileRatios')}</span>
        <div className="space-y-2">
          {RATIO_SLIDERS.map(({ key, labelKey, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-300 w-14 flex-shrink-0">{t(labelKey)}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={ratios[key]}
                onChange={(e) => handleRatioChange(key, Number(e.target.value))}
                className={`min-w-0 flex-1 ${color}`}
              />
              <span className="text-xs text-gray-400 w-7 flex-shrink-0 text-right">{ratios[key]}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex justify-center">
        <svg width={120} height={100} viewBox={preview.vb} className="rounded border border-gray-700">
          <rect
            x={preview.vb.split(' ').map(Number)[0]}
            y={preview.vb.split(' ').map(Number)[1]}
            width="100%"
            height="100%"
            fill="transparent"
          />
          {preview.pixels.map((p, i) => {
            if (p.type === 'water') return null; // empty space for water
            const fill = p.type === 'desert'
              ? 'rgba(217,170,60,0.35)'
              : 'rgba(255,255,255,0.15)';
            const stroke = p.type === 'desert'
              ? 'rgba(217,170,60,0.6)'
              : 'rgba(255,255,255,0.4)';
            return (
              <polygon
                key={i}
                points={hexPoints(p.x, p.y, HEX_SIZE * 0.85)}
                fill={fill}
                stroke={stroke}
                strokeWidth="0.3"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
