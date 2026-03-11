import { ReactNode } from 'react';

interface GameLayoutProps {
  board: ReactNode;
  playerHand: ReactNode;
  opponents: ReactNode;
  actions: ReactNode;
  gameLog?: ReactNode;
  tradeOffers?: ReactNode;
  dice?: ReactNode;
}

export function GameLayout({ board, playerHand, opponents, actions, gameLog, tradeOffers, dice }: GameLayoutProps) {
  return (
    <div className="flex-1 bg-gray-900 flex flex-col lg:flex-row overflow-hidden relative">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Opponents bar */}
        <div className="p-2 flex-shrink-0">{opponents}</div>
        {/* Board */}
        <div className="flex-1 min-h-0 p-2">{board}</div>
        {/* Dice */}
        {dice && <div className="flex justify-center p-1">{dice}</div>}
        {/* Actions bar */}
        <div className="p-2 pb-0 flex-shrink-0">{actions}</div>
        {/* Spacer so the hand doesn't cover the action bar */}
        <div className="h-[110px] flex-shrink-0" />
      </div>

      {/* Game log — right sidebar on desktop */}
      {gameLog && (
        <div className="hidden lg:flex lg:flex-col lg:w-72 p-2 gap-2 overflow-y-auto border-l border-gray-700/50">
          {gameLog}
        </div>
      )}

      {/* Trade offer notifications — top-right overlay */}
      {tradeOffers}

      {/* Player hand — fixed at bottom */}
      {playerHand}
    </div>
  );
}
