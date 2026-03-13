import { useState, useEffect } from 'react';

interface DiscardPanelProps {
  discardCount: number;
  selectedCount: number;
  timerSeconds: number;
  onConfirm: () => void;
}

export function DiscardPanel({ discardCount, selectedCount, timerSeconds, onConfirm }: DiscardPanelProps) {
  const [timeLeft, setTimeLeft] = useState(timerSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const remaining = discardCount - selectedCount;
  const canConfirm = remaining === 0;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <div className="bg-gray-800/95 border border-red-500/60 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 backdrop-blur-sm">
        {/* Timer */}
        <div className={`text-xl font-bold min-w-[3ch] text-center ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {timeLeft}s
        </div>

        {/* Info */}
        <div className="text-sm">
          <span className="text-white font-semibold">✂️ Discard </span>
          <span className={remaining > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
            {selectedCount}/{discardCount}
          </span>
          <span className="text-gray-400 ml-1">
            {remaining > 0 ? `— select ${remaining} more` : '— ready!'}
          </span>
        </div>

        {/* Confirm */}
        <button
          onClick={canConfirm ? onConfirm : undefined}
          disabled={!canConfirm}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            canConfirm
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
