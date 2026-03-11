import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Board as BoardType, HexCoord, VertexDirection, EdgeDirection } from '@brolonist/shared';
import { useGameStore } from '../../store/gameStore';
import { useLobbyStore } from '../../store/lobbyStore';
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
import { GameWaitingRoom } from '../Lobby/GameWaitingRoom';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  // Reset game and lobby state when entering a new game page
  const resetGame = useGameStore((s) => s.reset);
  const clearLobby = useLobbyStore((s) => s.setCurrentLobby);
  useEffect(() => {
    resetGame();
    clearLobby(null);
  }, [gameId, resetGame, clearLobby]);

  const { sendMessage, connectionStatus } = useWebSocket(gameId || null);
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const myPlayer = useGameStore((s) => s.myPlayer);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const gameResult = useGameStore((s) => s.gameResult);

  const [showTrade, setShowTrade] = useState(false);
  const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);

  const phase = gameState?.currentPhase || '';
  const isSetup = phase === 'setup_forward' || phase === 'setup_reverse';
  const setupAction = (gameState as unknown as Record<string, unknown>)?.setupAction as string | undefined;
  const myTurn = isMyTurn();

  // Compute what the player needs to click on
  const effectiveBuildMode = useMemo<string | null>(() => {
    if (isSetup && myTurn) {
      return setupAction === 'road' ? 'road' : 'settlement';
    }
    if (phase === 'move_robber' && myTurn) return 'robber';
    return buildMode;
  }, [isSetup, myTurn, setupAction, phase, buildMode]);

  // Compute valid placement highlights to show on the board
  const validSettlements = useMemo(() => {
    if (!gameState || !myPlayerId || effectiveBuildMode !== 'settlement') return [];
    // Show all hex vertices as potential placements — server validates the actual click
    const verts: Array<{ hex: HexCoord; direction: VertexDirection }> = [];
    for (const hex of (gameState.board as BoardType).hexes) {
      for (const dir of ['N', 'S'] as VertexDirection[]) {
        verts.push({ hex: hex.coord, direction: dir });
      }
    }
    return verts;
  }, [gameState, myPlayerId, effectiveBuildMode]);

  const validRoads = useMemo(() => {
    if (!gameState || !myPlayerId || effectiveBuildMode !== 'road') return [];
    const edges: Array<{ hex: HexCoord; direction: EdgeDirection }> = [];
    for (const hex of (gameState.board as BoardType).hexes) {
      for (const dir of ['NE', 'E', 'SE'] as EdgeDirection[]) {
        edges.push({ hex: hex.coord, direction: dir });
      }
    }
    return edges;
  }, [gameState, myPlayerId, effectiveBuildMode]);

  const validRobberHexes = useMemo(() => {
    if (!gameState || effectiveBuildMode !== 'robber') return [];
    return (gameState.board as BoardType).hexes
      .map(h => h.coord)
      .filter(c => !(c.q === gameState.robberPosition.q && c.r === gameState.robberPosition.r));
  }, [gameState, effectiveBuildMode]);

  const canRoll = myTurn && phase === 'roll_dice';
  const canBuild = myTurn && (phase === 'trade_and_build' || phase === 'special_build');
  const canTrade = myTurn && phase === 'trade_and_build';
  const canEndTurn = myTurn && phase === 'trade_and_build';
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

  const handleVertexClick = useCallback((vertex: { hex: HexCoord; direction: VertexDirection }) => {
    // During setup, clicking a vertex places a settlement
    if (isSetup && myTurn && setupAction !== 'road') {
      sendMessage('place_settlement', { vertex });
      return;
    }
    if (buildMode === 'settlement') {
      sendMessage('place_settlement', { vertex });
      setBuildMode(null);
    } else if (buildMode === 'city') {
      sendMessage('place_city', { vertex });
      setBuildMode(null);
    }
  }, [isSetup, myTurn, setupAction, buildMode, sendMessage]);

  const handleEdgeClick = useCallback((edge: { hex: HexCoord; direction: EdgeDirection }) => {
    // During setup after placing settlement, clicking an edge places a road
    if (isSetup && myTurn && setupAction === 'road') {
      sendMessage('place_road', { edge });
      return;
    }
    if (buildMode === 'road') {
      sendMessage('place_road', { edge });
      setBuildMode(null);
    }
  }, [isSetup, myTurn, setupAction, buildMode, sendMessage]);

  const handleHexClick = useCallback((hex: HexCoord) => {
    if (phase === 'move_robber' && myTurn) {
      sendMessage('move_robber', { hex });
    }
  }, [phase, myTurn, sendMessage]);

  const currentLobby = useLobbyStore((s) => s.currentLobby);

  // Game over screen
  if (gameResult) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold mb-2">
          {gameResult.winnerId === myPlayerId ? 'You won!' : (gameResult.winnerName || 'Game Over')}
        </h1>
        <p className="text-gray-400 mb-8">Victory Points: {gameResult.victoryPoints}</p>
        <button onClick={() => { window.location.href = '/'; }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
          {t('common.back')}
        </button>
      </div>
    );
  }

  if (!gameState) {
    if (connectionStatus === 'connected' && currentLobby) {
      return (
        <GameWaitingRoom
          lobby={currentLobby}
          myPlayerId={myPlayerId}
          onReady={(ready) => sendMessage('ready', { ready })}
          onAddBot={(strategy) => sendMessage('add_bot', { strategy })}
          onRemoveBot={(botId) => sendMessage('remove_bot', { botId })}
          onKick={(targetId) => sendMessage('kick_player', { targetId })}
          onStartGame={() => sendMessage('start_game', {})}
        />
      );
    }

    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        <Navbar userName={user?.name} connectionStatus={connectionStatus} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center space-y-4">
            <div className="animate-spin text-4xl">⏳</div>
            <p>{connectionStatus === 'connected' ? t('lobby.waitingForPlayers') : t('status.reconnecting')}</p>
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

  // Phase instruction banner
  let phaseHint = '';
  if (isSetup && myTurn) {
    phaseHint = setupAction === 'road'
      ? '🛣️ Place your road'
      : '🏠 Place your settlement';
  } else if (phase === 'move_robber' && myTurn) {
    phaseHint = '🏴‍☠️ Move the robber to a new hex';
  } else if (phase === 'discard') {
    phaseHint = '✂️ Discard half your cards';
  } else if (phase === 'roll_dice' && myTurn) {
    phaseHint = '🎲 Roll the dice!';
  } else if (!myTurn && phase !== 'game_over') {
    phaseHint = `⏳ Waiting for ${currentPlayer?.name || 'opponent'}...`;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Navbar userName={user?.name} connectionStatus={connectionStatus} onLogout={logout} />

      {/* Phase hint banner */}
      {phaseHint && (
        <div className={`text-white text-center py-2 text-sm font-semibold ${myTurn ? 'bg-yellow-600 animate-pulse' : 'bg-gray-700'}`}>
          {phaseHint}
        </div>
      )}

      <GameLayout
        board={
          <Board
            board={gameState.board as BoardType}
            robberPosition={gameState.robberPosition}
            players={gameState.players}
            validSettlements={validSettlements}
            validRoads={validRoads}
            validRobberHexes={validRobberHexes}
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
            isMyTurn={myTurn}
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
              activeOffers={(gameState.activeTradeOffers as Array<{ id: string; fromPlayerId: string; offering: Record<string, number>; requesting: Record<string, number> }>).map(o => ({
                id: o.id,
                fromPlayerName: playerNames[o.fromPlayerId]?.name ?? 'Unknown',
                offering: o.offering,
                requesting: o.requesting,
              }))}
              harbors={me.harbors ?? []}
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
