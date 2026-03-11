import { useState } from 'react';

const RESOURCES = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;

const RESOURCE_EMOJI: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛰️',
  grain: '🌾',
  wool: '🐑',
};

const DEV_CARDS = [
  { type: 'knight', label: '⚔️ Knight' },
  { type: 'victory_point', label: '🏆 VP' },
  { type: 'road_building', label: '🛤️ Roads' },
  { type: 'year_of_plenty', label: '🎁 YoP' },
  { type: 'monopoly', label: '💰 Monopoly' },
];

interface DevPanelProps {
  sendMessage: (type: string, payload?: Record<string, unknown>) => void;
}

export function DevPanel({ sendMessage }: DevPanelProps) {
  const [open, setOpen] = useState(false);

  const giveResource = (resource: string, amount: number) => {
    sendMessage('dev_give_resources', { resources: { [resource]: amount } });
  };

  const giveAllResources = (amount: number) => {
    const resources: Record<string, number> = {};
    for (const r of RESOURCES) resources[r] = amount;
    sendMessage('dev_give_resources', { resources });
  };

  const giveDevCard = (cardType: string) => {
    sendMessage('dev_give_devcard', { cardType });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-32 left-2 z-50 bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-60 hover:opacity-100 transition-opacity"
        title="Open Dev Panel"
      >
        🛠️ DEV
      </button>
    );
  }

  return (
    <div className="fixed bottom-32 left-2 z-50 bg-gray-800 border border-red-600 rounded-lg shadow-xl p-3 w-64 max-h-[60vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-red-400 text-xs font-bold uppercase tracking-wide">🛠️ Dev Panel</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
      </div>

      {/* Resources */}
      <div className="mb-3">
        <div className="text-gray-300 text-xs font-semibold mb-1">Resources</div>
        <div className="space-y-1">
          {RESOURCES.map((r) => (
            <div key={r} className="flex items-center gap-1">
              <span className="text-sm w-6 text-center">{RESOURCE_EMOJI[r]}</span>
              <span className="text-gray-300 text-xs flex-1 capitalize">{r}</span>
              {[1, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => giveResource(r, n)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded"
                >
                  +{n}
                </button>
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={() => giveAllResources(5)}
          className="mt-1.5 w-full bg-green-700 hover:bg-green-600 text-white text-xs py-1 rounded"
        >
          +5 All Resources
        </button>
      </div>

      {/* Dev Cards */}
      <div>
        <div className="text-gray-300 text-xs font-semibold mb-1">Dev Cards</div>
        <div className="grid grid-cols-2 gap-1">
          {DEV_CARDS.map((card) => (
            <button
              key={card.type}
              onClick={() => giveDevCard(card.type)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 px-1.5 rounded text-center"
            >
              {card.label}
            </button>
          ))}
        </div>
      </div>

      {/* Special Actions */}
      <div className="mt-3">
        <div className="text-gray-300 text-xs font-semibold mb-1">Actions</div>
        <button
          onClick={() => sendMessage('dev_roll_seven')}
          className="w-full bg-red-700 hover:bg-red-600 text-white text-xs py-1 rounded"
        >
          🎲 Force Roll 7
        </button>
      </div>
    </div>
  );
}
