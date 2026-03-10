import { useRef, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  playerId?: string;
  type: string;
  message: string;
}

interface GameLogProps {
  entries: LogEntry[];
  playerNames: Record<string, { name: string; color: string }>;
}

const COLOR_MAP: Record<string, string> = {
  red: 'text-red-400', blue: 'text-blue-400', white: 'text-gray-200', orange: 'text-orange-400',
  green: 'text-green-400', brown: 'text-amber-500', purple: 'text-purple-400', teal: 'text-teal-400',
};

export function GameLog({ entries, playerNames }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries.length]);

  return (
    <div className="bg-gray-800 rounded-lg p-3 h-48 overflow-y-auto text-xs space-y-1">
      {entries.map((entry, i) => {
        const player = entry.playerId ? playerNames[entry.playerId] : null;
        const colorClass = player ? (COLOR_MAP[player.color] || 'text-gray-300') : 'text-gray-500';
        return (
          <div key={i} className="leading-tight">
            {player && <span className={`font-semibold ${colorClass}`}>{player.name}: </span>}
            <span className="text-gray-300">{entry.message}</span>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
