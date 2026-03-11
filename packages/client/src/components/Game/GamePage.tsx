import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Board as BoardType } from '@brolonist/shared';
import { useGameStore } from '../../store/gameStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { Board } from '../Board/Board';
import { PlayerPanel } from '../Player/PlayerPanel';
import { OpponentBar } from '../Player/OpponentBar';
import { ActionBar } from '../Actions/ActionBar';
import { DiceDisplay } from '../Actions/DiceDisplay';
import { TradePanel } from '../Trade/TradePanel';
import { GameLog } from '../Chat/GameLog';
import { GameLayout } from '../Layout/GameLayout';
import { Navbar } from '../Layout/Navbar';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { sendMessage, connectionStatus } = useWebSocket(gameId || null);
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const myPlayer = useGameStore((s) => s.myPlayer);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const [showTrade, setShowTrade] = useState(false);
  const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);

  const phase = gameState?.currentPhase || '';
  const canRoll = isMyTurn() && phase === 'roll_dice';
  const canBuild = isMyTurn() && (phase === 'trade_and_build' || phase === 'special_build');
  const canTrade = isMyTurn() && phase === 'trade_and_build';
  const canEndTurn = isMyTurn() && phase === 'trade_and_build';
  const canBuyDevCard = canBuild;

  const handleRollDice = useCallback(() => sendMessage('roll_dice'), [sendMessage]);
  const handleEndTurn = useCallback(() => {
    setBuildMode(null);
    sendMessage('end_turn');
  }, [sendMessage]);
  const handleBuyDevCard = useCallback(() => sendMessage('buy_dev_card'), [sendMessage]);
  const handleBuild = useCallback((type: 'road' | 'settlement' | 'city') => {
    setBuildMode(type);
  }, []);

  const handleVertexClick = useCallback((vertex: Parameters<NonNullable<Parameters<typeof Board>[0]['onVertexClick']>>[0]) => {
    if (buildMode === 'settlement') {
      sendMessage('place_settlement', { vertex });
      setBuildMode(null);
    } else if (buildMode === 'city') {
      sendMessage('place_city', { vertex });
      setBuildMode(null);
    }
  }, [buildMode, sendMessage]);

  const handleEdgeClick = useCallback((edge: Parameters<NonNullable<Parameters<typeof Board>[0]['onEdgeClick']>>[0]) => {
    if (buildMode === 'road') {
      sendMessage('place_road', { edge });
      setBuildMode(null);
    }
  }, [buildMode, sendMessage]);

  const handleHexClick = useCallback((hex: Parameters<NonNullable<Parameters<typeof Board>[0]['onHexClick']>>[0]) => {
    if (phase === 'move_robber') {
      sendMessage('move_robber', { hex });
    }
  }, [phase, sendMessage]);

  if (!gameState) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        <Navbar userName={user?.name} connectionStatus={connectionStatus} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center space-y-4">
            {connectionStatus === 'connected' ? (
              <>
                <div className="text-6xl">🎲</div>
                <h2 className="text-2xl font-bold">{t('lobby.title')}</h2>
                <p className="text-gray-400">{t('lobby.waitingForPlayers')}</p>
                <button
                  onClick={() => sendMessage('start_game', {})}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg"
                >
                  {t('lobby.startGame')}
                </button>
              </>
            ) : (
              <>
                <div className="animate-spin text-4xl">⏳</div>
                <p>{t('status.reconnecting')}</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const me = myPlayer();
  const opponents = gameState.players.filter(p => p.id !== myPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerNames: Record<string, { name: string; color: string }> = {};
  for (const p of gameState.players) playerNames[p.id] = { name: p.name, color: p.color };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Navbar userName={user?.name} connectionStatus={connectionStatus} onLogout={logout} />
      <GameLayout
        board={
          <Board
            board={gameState.board as BoardType}
            robberPosition={gameState.robberPosition}
            players={gameState.players}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            onHexClick={handleHexClick}
          />
        }
        opponents={
          <OpponentBar opponents={opponents} currentPlayerId={currentPlayer?.id || null} />
        }
        playerPanel={
          me ? (
            <PlayerPanel
              resources={me.resources as unknown as Record<string, number>}
              developmentCards={me.developmentCards as Array<{ type: string }>}
              roadsBuilt={me.roadsBuilt}
              settlementsBuilt={me.settlementsBuilt}
              citiesBuilt={me.citiesBuilt}
              victoryPoints={me.victoryPoints}
            />
          ) : null
        }
        actions={
          <ActionBar
            phase={phase}
            isMyTurn={isMyTurn()}
            canRoll={canRoll}
            canBuild={canBuild}
            canTrade={canTrade}
            canBuyDevCard={canBuyDevCard}
            canEndTurn={canEndTurn}
            onRollDice={handleRollDice}
            onBuild={handleBuild}
            onBuyDevCard={handleBuyDevCard}
            onTrade={() => setShowTrade(true)}
            onEndTurn={handleEndTurn}
          />
        }
        dice={gameState.dice[0] > 0 ? <DiceDisplay dice={gameState.dice} /> : null}
        sidePanel={
          showTrade && me ? (
            <TradePanel
              myResources={me.resources as unknown as Record<string, number>}
              activeOffers={[]}
              harbors={[]}
              onPropose={(offering, requesting) => sendMessage('trade_offer', { offering, requesting })}
              onAccept={(offerId) => sendMessage('trade_respond', { offerId, response: 'accept' })}
              onDecline={(offerId) => sendMessage('trade_respond', { offerId, response: 'decline' })}
              onBankTrade={(giving, givingCount, receiving) => sendMessage('trade_with_bank', { giving, givingCount, receiving })}
              onClose={() => setShowTrade(false)}
            />
          ) : (
            <GameLog entries={gameState.log} playerNames={playerNames} />
          )
        }
      />
    </div>
  );
}
