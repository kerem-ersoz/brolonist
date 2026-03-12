import { useTranslation } from 'react-i18next';

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#d1d5db', orange: '#f97316',
  green: '#22c55e', brown: '#92400e', purple: '#a855f7', teal: '#14b8a6',
};

interface PlayerInfo {
  id: string;
  name: string;
  color: string;
}

interface StealPickerProps {
  targets: PlayerInfo[];
  onPick: (victimId: string) => void;
}

export function StealPicker({ targets, onPick }: StealPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4 border border-gray-600">
        <h2 className="text-white font-bold text-lg text-center mb-1">🏴‍☠️ Steal a Resource</h2>
        <p className="text-gray-400 text-sm text-center mb-4">Choose a player to steal from</p>
        <div className="flex gap-4 justify-center flex-wrap">
          {targets.map((player) => {
            const color = PLAYER_COLORS[player.color] || '#6b7280';
            return (
              <button
                key={player.id}
                onClick={() => onPick(player.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors min-w-[80px]"
              >
                <div
                  className="w-12 h-12 rounded-full border-3 flex items-center justify-center"
                  style={{ backgroundColor: color, borderColor: color }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white/90">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
                <span className="text-white text-xs font-semibold truncate max-w-[80px]">{player.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
