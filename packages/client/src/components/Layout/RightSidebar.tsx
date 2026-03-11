import { ReactNode } from 'react';
import { BankDisplay } from '../Player/BankDisplay';
import { SidebarPlayerList } from '../Player/SidebarPlayerList';

interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  status: string;
  victoryPoints: number;
  resourceCount?: number;
  devCardCount?: number;
  resources: Record<string, number>;
  developmentCards: unknown[];
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  knightsPlayed: number;
}

interface RightSidebarProps {
  chatLog: ReactNode;
  deckSize: number;
  players: PlayerInfo[];
  currentPlayerId: string | null;
  myPlayerId: string | null;
}

export function RightSidebar({ chatLog, deckSize, players, currentPlayerId, myPlayerId }: RightSidebarProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat / Game Log — fixed at 50% */}
      <div className="h-1/2 min-h-0 overflow-hidden flex-shrink-0">
        {chatLog}
      </div>

      {/* Bank cards row — centered on right edge */}
      <BankDisplay deckSize={deckSize} players={players} myPlayerId={myPlayerId} />

      {/* Player cards — fills remaining space, scrolls only for >4 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SidebarPlayerList
          players={players}
          currentPlayerId={currentPlayerId}
          myPlayerId={myPlayerId}
        />
      </div>
    </div>
  );
}
