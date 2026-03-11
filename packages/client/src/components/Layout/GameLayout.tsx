import { ReactNode } from 'react';

interface GameLayoutProps {
  board: ReactNode;
  playerHand: ReactNode;
  rightPanel?: ReactNode;
  tradeOffers?: ReactNode;
  dice?: ReactNode;
  endTurnButton?: ReactNode;
}

export function GameLayout({ board, playerHand, rightPanel, tradeOffers, dice, endTurnButton }: GameLayoutProps) {
  return (
    <div className="flex-1 bg-gray-900 flex flex-col lg:flex-row overflow-hidden relative">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Board */}
        <div className="flex-1 min-h-0 p-2">{board}</div>
        {/* Spacer so the hand doesn't cover the board */}
        <div className="h-[95px] flex-shrink-0" />

        {/* Dice + End turn — stacked vertically, bottom-right, above everything */}
        {(dice || endTurnButton) && (
          <div className="absolute bottom-[100px] right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto">
            {dice}
            {endTurnButton}
          </div>
        )}

        {/* Trade offers — top-right of the map area, scrollable column */}
        <div className="pointer-events-none" style={{ position: 'absolute', top: 8, right: 8, bottom: 130, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 8, width: 288, overflowY: 'auto' }}>
          <div className="pointer-events-auto">
            {tradeOffers}
          </div>
        </div>
      </div>

      {/* Right sidebar — game log + chat (desktop only) */}
      {rightPanel && (
        <div className="hidden lg:flex lg:flex-col lg:w-80 p-2 gap-2 border-l border-gray-700/50 overflow-hidden">
          {rightPanel}
        </div>
      )}

      {/* Player hand — fixed at bottom */}
      {playerHand}
    </div>
  );
}
