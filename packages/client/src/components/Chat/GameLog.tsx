import { useRef, useEffect, useState } from 'react';

interface LogEntry {
  timestamp: string;
  playerId?: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

interface GameLogProps {
  entries: LogEntry[];
  playerNames: Record<string, { name: string; color: string }>;
  onSendChat?: (message: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: 'text-red-400', blue: 'text-blue-400', white: 'text-gray-200', orange: 'text-orange-400',
  green: 'text-green-400', brown: 'text-amber-500', purple: 'text-purple-400', teal: 'text-teal-400',
};

const RESOURCE_EMOJI: Record<string, string> = {
  brick: '🧱', lumber: '🪵', ore: '⛏️', grain: '🌾', wool: '🐑',
};

function formatResources(data?: Record<string, unknown>): string | null {
  const resources = data?.resources as Record<string, number> | undefined;
  if (!resources) return null;
  const parts: string[] = [];
  for (const [res, count] of Object.entries(resources)) {
    if (count > 0) {
      const emoji = RESOURCE_EMOJI[res] || res;
      parts.push(`${emoji}${count > 1 ? `×${count}` : ''}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

export function GameLog({ entries, playerNames, onSendChat }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries.length]);

  const handleSend = () => {
    const msg = chatInput.trim();
    if (!msg || !onSendChat) return;
    onSendChat(msg);
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-1 py-1">
        Game Log
      </div>

      {/* Log entries */}
      <div className="flex-1 bg-gray-800 rounded-lg p-2 overflow-y-auto text-xs space-y-1 min-h-0">
        {entries.length === 0 && (
          <div className="text-gray-500 text-center py-4">Game events will appear here</div>
        )}
        {entries.map((entry, i) => {
          const player = entry.playerId ? playerNames[entry.playerId] : null;
          const colorClass = player ? (COLOR_MAP[player.color] || 'text-gray-300') : 'text-gray-500';
          const isChat = entry.type === 'chat';
          const isDistribute = entry.type === 'distribute';
          const resourceStr = isDistribute ? formatResources(entry.data) : null;
          return (
            <div key={i} className={`leading-tight ${isChat ? 'pl-1 border-l-2 border-blue-500/40' : ''}`}>
              {player && <span className={`font-semibold ${colorClass}`}>{player.name}: </span>}
              {isDistribute && resourceStr ? (
                <span className="text-gray-300">received {resourceStr}</span>
              ) : (
                <span className="text-gray-300">{entry.message}</span>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Chat input */}
      {onSendChat && (
        <div className="mt-2 flex gap-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Chat..."
            className="flex-1 px-2 py-1.5 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            maxLength={200}
          />
          <button
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded"
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
}
