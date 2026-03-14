import { assetPath } from '../../utils/sprites';
import { useRef, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
  myPlayerId?: string | null;
  onSendChat?: (message: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: 'text-red-400', blue: 'text-blue-400', white: 'text-gray-200', orange: 'text-orange-400',
  green: 'text-lime-400', brown: 'text-yellow-800', purple: 'text-purple-400', teal: 'text-teal-400',
};

const RESOURCE_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/card-brick.png'),
  lumber: assetPath('assets/sprites/card-wood.png'),
  ore: assetPath('assets/sprites/card-ore.png'),
  grain: assetPath('assets/sprites/card-grain.png'),
  wool: assetPath('assets/sprites/card-sheep.png'),
  _resource_back: assetPath('assets/sprites/resource-card-back.png'),
};

const RESOURCE_TOKEN: Record<string, string> = {
  brick: ':brick:', lumber: ':lumber:', ore: ':ore:', grain: ':grain:', wool: ':wool:',
};

// Also match common aliases
const TOKEN_TO_RESOURCE: Record<string, string> = {
  ':brick:': 'brick', ':lumber:': 'lumber', ':wood:': 'lumber',
  ':ore:': 'ore', ':grain:': 'grain', ':wheat:': 'grain',
  ':wool:': 'wool', ':sheep:': 'wool',
  ':resource:': '_resource_back',
};

function formatResourceStr(resources?: Record<string, number>): string {
  if (!resources) return '';
  const parts: string[] = [];
  for (const [res, count] of Object.entries(resources)) {
    if (count > 0) {
      const token = RESOURCE_TOKEN[res] || res;
      parts.push(Array(count).fill(token).join(''));
    }
  }
  return parts.join(' ');
}

/** Renders text with :resource: tokens replaced by inline sprite images */
function renderWithSprites(text: string): ReactNode {
  const pattern = /:(brick|lumber|wood|ore|grain|wheat|wool|sheep|resource):/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const res = TOKEN_TO_RESOURCE[token];
    if (res && RESOURCE_SPRITES[res]) {
      parts.push(
        <img key={key++} src={RESOURCE_SPRITES[res]} alt={`:${res}:`} className="inline-block w-4 h-5 object-fill align-text-bottom mx-px rounded-sm" />
      );
    } else {
      parts.push(token);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

function useLocalizedMessage(entry: LogEntry, playerNames: Record<string, { name: string; color: string }>, t: (key: string, opts?: Record<string, string>) => string, myPlayerId?: string | null): string {
  // Chat messages are never translated — show as-is
  if (entry.type === 'chat') return entry.message;

  const data = entry.data || {};

  switch (entry.type) {
    case 'game_start':
      return t('log.game_start');
    case 'roll_dice': {
      const dice = data.dice as [number, number] | undefined;
      const sum = dice ? String(dice[0] + dice[1]) : '';
      return t('log.roll_dice', { sum });
    }
    case 'distribute':
      return t('log.distribute', { resources: formatResourceStr(data.resources as Record<string, number>) });
    case 'place_settlement':
      return entry.message.includes('setup') ? t('log.place_settlement_setup') : t('log.place_settlement');
    case 'place_road':
      return entry.message.includes('setup') ? t('log.place_road_setup') : t('log.place_road');
    case 'place_city':
      return t('log.place_city');
    case 'end_turn':
      return t('log.end_turn');
    case 'buy_dev_card':
      return t('log.buy_dev_card');
    case 'play_dev_card':
      return t('log.play_dev_card', { card: entry.message.replace('Played ', '') });
    case 'move_robber':
      return t('log.move_robber');
    case 'robber_blocked': {
      const resource = data.resource as string || '';
      const num = data.number as number || 0;
      const resToken = RESOURCE_TOKEN[resource] || resource;
      return t('log.robber_blocked', { number: String(num), resource: resToken });
    }
    case 'bank_shortage': {
      const res = data.resource as string || '';
      const resToken = RESOURCE_TOKEN[res] || res;
      return t('log.bank_shortage', { resource: resToken });
    }
    case 'steal': {
      const victimId = data.victimId as string | undefined;
      const victim = victimId ? (playerNames[victimId]?.name || '?') : '?';
      const resource = data.resource as string | undefined;
      // Show the exact resource to the victim
      if (victimId === myPlayerId && resource) {
        const resToken = RESOURCE_TOKEN[resource] || resource;
        return t('log.steal_known', { victim, resource: resToken });
      }
      return t('log.steal', { victim });
    }
    case 'discard':
      return t('log.discard');
    case 'trade_offer': {
      const offering = formatResourceStr(data.offering as Record<string, number>);
      const requesting = formatResourceStr(data.requesting as Record<string, number>);
      return offering || requesting
        ? t('log.trade_offer', { giving: offering || '?', requesting: requesting || '?' })
        : entry.message;
    }
    case 'trade_accept':
      return t('log.trade_accept');
    case 'trade_decline':
      return t('log.trade_decline');
    case 'trade_counter':
      return t('log.trade_counter');
    case 'trade_completed':
      return t('log.trade_completed');
    case 'trade_cancel':
      return t('log.trade_cancel');
    case 'trade_expired':
      return t('log.trade_expired');
    case 'trade_bank':
      return t('log.trade_bank', { giving: '', receiving: '' });
    case 'pass_special_build':
      return t('log.pass_special_build');
    case 'trade_proposed':
      return entry.message; // client-side, already formatted
    default:
      return entry.message;
  }
}

export function GameLog({ entries, playerNames, myPlayerId, onSendChat }: GameLogProps) {
  const { t } = useTranslation();
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
        {t('log.gameLog')}
      </div>

      {/* Log entries */}
      <div className="flex-1 rounded-lg p-2 overflow-y-auto text-xs space-y-1 min-h-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
        {entries.length === 0 && (
          <div className="text-gray-500 text-center py-4">{t('log.emptyLog')}</div>
        )}
        {entries.map((entry, i) => {
          const player = entry.playerId ? playerNames[entry.playerId] : null;
          const colorClass = player ? (COLOR_MAP[player.color] || 'text-gray-300') : 'text-gray-500';
          const isChat = entry.type === 'chat';
          const localizedMsg = useLocalizedMessage(entry, playerNames, t, myPlayerId);
          return (
            <div key={i} className={`leading-tight ${isChat ? 'pl-1 border-l-2 border-blue-500/40' : ''}`}>
              {player && <span className={`font-semibold ${colorClass}`}>{player.name}: </span>}
              <span className="text-gray-300">{renderWithSprites(localizedMsg)}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Chat input */}
      {onSendChat && (
        <div className="flex gap-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Chat..."
            className="flex-1 px-2 py-1.5 text-white text-xs rounded border border-white/20 focus:border-blue-500 focus:outline-none"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            maxLength={200}
          />
          <button
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className="px-2 py-1.5 hover:brightness-125 disabled:opacity-40 text-white text-xs rounded"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
}
