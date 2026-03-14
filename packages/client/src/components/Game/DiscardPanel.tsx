interface DiscardPanelProps {
  discardCount: number;
  selectedCount: number;
  onConfirm: () => void;
}

export function DiscardPanel({ discardCount, selectedCount, onConfirm }: DiscardPanelProps) {
  const remaining = discardCount - selectedCount;
  const canConfirm = remaining === 0;

  return (
    <div style={{ position: 'fixed', bottom: 108, left: 23, zIndex: 50 }} className="pointer-events-auto">
      <div className="bg-gray-800/95 border border-red-500/60 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 backdrop-blur-sm">
        <div className="text-sm">
          <span className="text-white font-semibold">Discard </span>
          <span className={remaining > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
            {selectedCount}/{discardCount}
          </span>
        </div>

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
