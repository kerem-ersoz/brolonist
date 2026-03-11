interface DiceDisplayProps {
  dice: [number, number] | null;
  rolling?: boolean;
  canRoll?: boolean;
  onRoll?: () => void;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceDisplay({ dice, rolling, canRoll, onRoll }: DiceDisplayProps) {
  // Show clickable dice when it's time to roll
  if (canRoll && onRoll) {
    return (
      <button
        onClick={onRoll}
        className="flex gap-2 items-center justify-center cursor-pointer animate-pulse hover:scale-105 transition-transform rounded-xl bg-white/5 hover:bg-white/10"
        style={{ width: 300, height: 160 }}
      >
        <span className="text-white opacity-70 select-none" style={{ fontSize: '9rem', lineHeight: 1 }}>⚄</span>
        <span className="text-white opacity-70 select-none" style={{ fontSize: '9rem', lineHeight: 1 }}>⚂</span>
      </button>
    );
  }

  if (!dice) return null;
  return (
    <div className={`flex gap-2 items-center ${rolling ? 'animate-bounce' : ''}`}>
      <span className="text-white" style={{ fontSize: '9rem', lineHeight: 1 }}>{DICE_FACES[dice[0] - 1]}</span>
      <span className="text-white" style={{ fontSize: '9rem', lineHeight: 1 }}>{DICE_FACES[dice[1] - 1]}</span>
    </div>
  );
}
