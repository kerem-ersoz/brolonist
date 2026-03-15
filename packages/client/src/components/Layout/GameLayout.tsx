import { type ReactNode } from 'react';

interface GameLayoutProps {
  board: ReactNode;
  playerHand: ReactNode;
  rightPanel?: ReactNode;
  tradeOffers?: ReactNode;
  dice?: ReactNode;
  endTurnButton?: ReactNode;
  phaseHint?: string;
  isMyTurn?: boolean;
}

export function GameLayout({ board, playerHand, rightPanel, tradeOffers, dice, endTurnButton, phaseHint, isMyTurn }: GameLayoutProps) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 h-full">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Phase hint — floating pill, absolutely positioned over the board */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none z-20" style={{ top: 44 }}>
          {phaseHint ? (
            <div className={`px-5 py-2 rounded-full text-white text-sm font-semibold shadow-lg backdrop-blur-sm ${
              isMyTurn ? 'bg-yellow-600/80 animate-pulse' : 'bg-gray-700/70'
            }`}>
              {phaseHint}
            </div>
          ) : null}
        </div>

        {/* Board — fills all available space */}
        <div className="flex-1 min-h-0 p-2">{board}</div>

        {/* Dice + End turn — stacked vertically, bottom-right, above everything */}
        {(dice || endTurnButton) && (
          <div className="absolute bottom-px z-40 flex flex-col items-end gap-2 pointer-events-auto" style={{ right: 'calc(20rem + 11px)' }}>
            {dice}
            {endTurnButton}
          </div>
        )}

        {/* Trade offers — top-right of the map area, scrollable column */}
        <div className="pointer-events-none" style={{ position: 'absolute', top: 48, right: 'calc(20rem + 8px)', bottom: 100, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 8, width: 230, overflowY: 'auto' }}>
          <div className="pointer-events-auto">
            {tradeOffers}
          </div>
        </div>
      </div>

      {/* Right sidebar — absolutely positioned to span full height */}
      {rightPanel && (
        <div className="hidden lg:flex lg:flex-col lg:w-80 py-2 px-2 gap-2 border-l border-gray-700/50 absolute right-0 bottom-0 z-40 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.35)', top: 40 }}>
          {rightPanel}
        </div>
      )}

      {/* Player hand — fixed at bottom */}
      {playerHand}
    </div>
  );
}
