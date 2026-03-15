import { assetPath } from '../../utils/sprites';

interface DiceDisplayProps {
  dice: [number, number] | null;
  rolling?: boolean;
  canRoll?: boolean;
  onRoll?: () => void;
  disabled?: boolean;
}

const DICE_SIZE = 74;

function DieImage({ value, opacity, className }: { value: number; opacity?: number; className?: string }) {
  return (
    <img
      src={assetPath(`assets/sprites/dice-${value}.png`)}
      alt={`Dice ${value}`}
      style={{ width: DICE_SIZE, height: DICE_SIZE, opacity: opacity ?? 1 }}
      className={`select-none pointer-events-none ${className ?? ''}`}
      draggable={false}
    />
  );
}

export function DiceDisplay({ dice, rolling, canRoll, onRoll, disabled }: DiceDisplayProps) {
  if (canRoll && onRoll) {
    return (
      <button
        onClick={onRoll}
        className="flex items-center justify-center cursor-pointer animate-pulse hover:scale-105 transition-transform p-1"
        style={{ gap: 5 }}
      >
        <DieImage value={5} opacity={0.7} />
        <DieImage value={3} opacity={0.7} />
      </button>
    );
  }

  if (!dice) return null;
  return (
    <div className={`flex items-center ${rolling ? 'animate-bounce' : ''} ${disabled ? 'opacity-30 grayscale' : ''}`} style={{ gap: 5 }}>
      <DieImage value={dice[0]} />
      <DieImage value={dice[1]} />
    </div>
  );
}
