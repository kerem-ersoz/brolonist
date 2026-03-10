import { ReactNode } from 'react';

interface GameLayoutProps {
  board: ReactNode;
  playerPanel: ReactNode;
  opponents: ReactNode;
  actions: ReactNode;
  sidePanel?: ReactNode;
  dice?: ReactNode;
}

export function GameLayout({ board, playerPanel, opponents, actions, sidePanel, dice }: GameLayoutProps) {
  return (
    <div className="h-screen bg-gray-900 flex flex-col lg:flex-row overflow-hidden">
      {/* Left panel (desktop) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 p-2 gap-2 overflow-y-auto">
        {playerPanel}
        {sidePanel}
      </div>

      {/* Center - Board */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Opponents bar */}
        <div className="p-2 flex-shrink-0">{opponents}</div>
        {/* Board */}
        <div className="flex-1 min-h-0 p-2">{board}</div>
        {/* Dice */}
        {dice && <div className="flex justify-center p-2">{dice}</div>}
        {/* Actions (bottom) */}
        <div className="p-2 flex-shrink-0">{actions}</div>
      </div>

      {/* Right panel (desktop) */}
      <div className="hidden lg:flex lg:flex-col lg:w-80 p-2 gap-2 overflow-y-auto">
        {sidePanel}
      </div>

      {/* Mobile bottom sheet for panels */}
      <div className="lg:hidden p-2 space-y-2">
        {playerPanel}
      </div>
    </div>
  );
}
