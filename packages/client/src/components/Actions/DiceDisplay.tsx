interface DiceDisplayProps {
  dice: [number, number] | null;
  rolling?: boolean;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceDisplay({ dice, rolling }: DiceDisplayProps) {
  if (!dice) return null;
  return (
    <div className={`flex gap-2 items-center ${rolling ? 'animate-bounce' : ''}`}>
      <span className="text-4xl">{DICE_FACES[dice[0] - 1]}</span>
      <span className="text-4xl">{DICE_FACES[dice[1] - 1]}</span>
      <span className="text-white font-bold text-xl ml-2">= {dice[0] + dice[1]}</span>
    </div>
  );
}
