import { useState, useCallback, useMemo, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Board as BoardType, HexCoord, VertexDirection, EdgeDirection } from '@brolonist/shared';
import { useGameStore } from '../../store/gameStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { Board } from '../Board/Board';
import { PlayerHand } from '../Player/PlayerHand';
import { OpponentBar } from '../Player/OpponentBar';
import { ActionBar } from '../Actions/ActionBar';
import { DiceDisplay } from '../Actions/DiceDisplay';
import { ResourceAnimation, type ResourceAnimationItem } from '../Actions/ResourceAnimation';
import { TradeModal } from '../Trade/TradeModal';
import { TradeOfferCard } from '../Trade/TradeOfferCard';
import { TradeInitiatorPanel } from '../Trade/TradeInitiatorPanel';
import { GameLog } from '../Chat/GameLog';
import { GameLayout } from '../Layout/GameLayout';
import { RightSidebar } from '../Layout/RightSidebar';
import { Navbar } from '../Layout/Navbar';
import { GameWaitingRoom } from '../Lobby/GameWaitingRoom';
import { DevPanel } from './DevPanel';
import { DiscardPanel } from './DiscardPanel';

class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('GamePage crash:', error, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen bg-gray-900 flex items-center justify-center text-white p-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto whitespace-pre-wrap text-red-300">{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
            <button onClick={() => window.location.href = '/'} className="mt-4 px-4 py-2 bg-blue-600 rounded">Back to lobby</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GamePage() {
  return <GameErrorBoundary><GamePageInner /></GameErrorBoundary>;
}

function GamePageInner() {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  // Reset game and lobby state when gameId changes
  const resetGame = useGameStore((s) => s.reset);
  const clearLobby = useLobbyStore((s) => s.setCurrentLobby);
  const prevGameId = useState(gameId)[0];
  useEffect(() => {
    // Only reset when gameId actually changes (not on initial mount before WS)
    return () => {
      // Cleanup: clear state when leaving this page
      resetGame();
      clearLobby(null);
    };
  }, [gameId, resetGame, clearLobby]);

  const { sendMessage, connectionStatus } = useWebSocket(gameId || null);
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const myPlayer = useGameStore((s) => s.myPlayer);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const gameResult = useGameStore((s) => s.gameResult);

  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradePreselect, setTradePreselect] = useState<string | null>(null);
  const [counterPrefillGet, setCounterPrefillGet] = useState<Record<string, number> | null>(null);
  const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);
  const [handSelection, setHandSelection] = useState<Record<string, number>>({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });
  const [clearSelectionCounter, setClearSelectionCounter] = useState(0);

  // Ghost placement state: first click sets ghost, second click confirms
  const [ghostPlacement, setGhostPlacement] = useState<{
    type: 'road' | 'settlement' | 'city';
    location: { hex: HexCoord; direction: string };
  } | null>(null);

  // Clear ghost on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGhostPlacement(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // --- Resource distribution & trade animations ---
  const [animationItems, setAnimationItems] = useState<ResourceAnimationItem[]>([]);
  const prevLogLengthRef = useRef(0);

  useEffect(() => {
    if (!gameState || !myPlayerId) return;
    const logLen = gameState.log.length;
    const prevLen = prevLogLengthRef.current;
    prevLogLengthRef.current = logLen;
    if (prevLen === 0 || logLen <= prevLen) return;

    const newEntries = gameState.log.slice(prevLen);
    const newItems: ResourceAnimationItem[] = [];

    // Distribution animations
    for (const entry of newEntries) {
      if (entry.type === 'distribute' && entry.data?.resources && entry.playerId) {
        newItems.push({
          kind: 'distribute',
          id: `${entry.timestamp}-${entry.playerId}`,
          playerId: entry.playerId,
          resources: entry.data.resources as Record<string, number>,
          isMe: entry.playerId === myPlayerId,
        });
      }

      // Trade animations — only when I'm involved
      if (entry.type === 'trade_completed' && entry.data) {
        const fromId = entry.data.fromPlayerId as string;
        const toId = entry.data.toPlayerId as string;
        if (fromId === myPlayerId || toId === myPlayerId) {
          newItems.push({
            kind: 'trade',
            id: `${entry.timestamp}-trade`,
            fromPlayerId: fromId,
            toPlayerId: toId,
            offering: entry.data.offering as Record<string, number>,
            requesting: entry.data.requesting as Record<string, number>,
            myPlayerId,
          });
        }
      }
    }

    if (newItems.length > 0) {
      setAnimationItems((prev) => [...prev, ...newItems]);
    }
  }, [gameState?.log.length, gameState, myPlayerId]);

  const handleAnimationComplete = useCallback((id: string) => {
    setAnimationItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const phase = gameState?.currentPhase || '';
  const isSetup = phase === 'setup_forward' || phase === 'setup_reverse';
  const setupAction = (gameState as unknown as Record<string, unknown>)?.setupAction as string | undefined;
  const myTurn = isMyTurn();
  const freeRoadsRemaining = (gameState?.freeRoadsRemaining as number) || 0;

  // Discard mode
  const mustDiscard = phase === 'discard' && !!myPlayerId && (gameState?.pendingDiscards ?? []).includes(myPlayerId);
  const discardCount = useMemo(() => {
    if (!mustDiscard || !gameState || !myPlayerId) return 0;
    const player = gameState.players.find(p => p.id === myPlayerId);
    if (!player) return 0;
    const total = Object.values(player.resources as unknown as Record<string, number>).reduce((a, b) => a + b, 0);
    return Math.floor(total / 2);
  }, [mustDiscard, gameState, myPlayerId]);

  // Compute what the player needs to click on
  const effectiveBuildMode = useMemo<string | null>(() => {
    if (isSetup && myTurn) {
      return setupAction === 'road' ? 'road' : 'settlement';
    }
    if (phase === 'move_robber' && myTurn) return 'robber';
    // Road Building card: force road mode
    if (freeRoadsRemaining > 0 && myTurn) return 'road';
    return buildMode;
  }, [isSetup, myTurn, setupAction, phase, buildMode, freeRoadsRemaining]);

  const canBuild = myTurn && (phase === 'trade_and_build' || phase === 'special_build');

  // Compute valid placement highlights to show on the board
  // Green highlights only during setup. During build phases, spots are clickable but invisible.
  const validSettlements = useMemo(() => {
    if (!gameState || !myPlayerId) return [];

    // Setup: show settlement spots with green highlights
    if (effectiveBuildMode === 'settlement') {
      const verts: Array<{ hex: HexCoord; direction: VertexDirection }> = [];
      for (const hex of (gameState.board as BoardType).hexes) {
        for (const dir of ['N', 'S'] as VertexDirection[]) {
          verts.push({ hex: hex.coord, direction: dir });
        }
      }
      return verts;
    }

    // Legacy: explicit city build mode
    if (effectiveBuildMode === 'city') {
      const board = gameState.board as BoardType;
      const buildings = board.vertexBuildings;
      const verts: Array<{ hex: HexCoord; direction: VertexDirection }> = [];
      const entries = buildings instanceof Map
        ? Array.from(buildings.entries())
        : Object.entries(buildings || {});
      for (const [key, building] of entries) {
        const b = building as { type: string; playerId: string };
        if (b.playerId === myPlayerId && b.type === 'settlement') {
          const parts = key.split(',');
          if (parts.length === 3) {
            verts.push({
              hex: { q: parseInt(parts[0]), r: parseInt(parts[1]) },
              direction: parts[2] as VertexDirection,
            });
          }
        }
      }
      return verts;
    }

    return [];
  }, [gameState, myPlayerId, effectiveBuildMode]);

  const validRoads = useMemo(() => {
    if (!gameState || !myPlayerId) return [];
    // Green highlights only during setup road phase
    if (effectiveBuildMode === 'road') {
      const edges: Array<{ hex: HexCoord; direction: EdgeDirection }> = [];
      for (const hex of (gameState.board as BoardType).hexes) {
        for (const dir of ['NE', 'E', 'SE'] as EdgeDirection[]) {
          edges.push({ hex: hex.coord, direction: dir });
        }
      }
      return edges;
    }
    return [];
  }, [gameState, myPlayerId, effectiveBuildMode]);

  const validRobberHexes = useMemo(() => {
    if (!gameState || effectiveBuildMode !== 'robber') return [];
    return (gameState.board as BoardType).hexes
      .map(h => h.coord)
      .filter(c => !(c.q === gameState.robberPosition.q && c.r === gameState.robberPosition.r));
  }, [gameState, effectiveBuildMode]);

  const canRoll = myTurn && phase === 'roll_dice';
  const canTrade = myTurn && phase === 'trade_and_build';
  const canEndTurn = myTurn && phase === 'trade_and_build';
  const canBuyDevCard = canBuild;

  // Auto-open trade modal when player selects cards in hand
  useEffect(() => {
    const totalSelected = Object.values(handSelection).reduce((a, b) => a + b, 0);
    if (totalSelected > 0 && !tradeModalOpen && canTrade) {
      setTradeModalOpen(true);
    }
  }, [handSelection, tradeModalOpen, canTrade]);

  const openTradeModal = useCallback((resource?: string) => {
    setTradePreselect(resource ?? null);
    setCounterPrefillGet(null);
    setTradeModalOpen(true);
  }, []);

  const closeTradeModal = useCallback(() => {
    setTradeModalOpen(false);
    setTradePreselect(null);
    setCounterPrefillGet(null);
    setHandSelection({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });
    setClearSelectionCounter((c) => c + 1);
  }, []);

  const handleRollDice = useCallback(() => sendMessage('roll_dice'), [sendMessage]);
  const handleEndTurn = useCallback(() => {
    setBuildMode(null);
    setGhostPlacement(null);
    sendMessage('end_turn');
  }, [sendMessage]);
  const handleBuyDevCard = useCallback(() => sendMessage('buy_dev_card'), [sendMessage]);
  const handlePlayDevCard = useCallback((cardType: string, params?: Record<string, unknown>) => {
    sendMessage('play_dev_card', { cardType, params });
  }, [sendMessage]);
  const handleBuild = useCallback((type: 'road' | 'settlement' | 'city') => {
    setBuildMode(type);
  }, []);

  // Determine if a vertex click should be a city upgrade or a new settlement
  const isMyCityUpgradeTarget = useCallback((vertex: { hex: HexCoord; direction: VertexDirection }) => {
    if (!gameState || !myPlayerId) return false;
    const board = gameState.board as BoardType;
    const buildings = board.vertexBuildings;
    const key = `${vertex.hex.q},${vertex.hex.r},${vertex.direction}`;
    const b = buildings instanceof Map ? buildings.get(key) : (buildings as Record<string, { type: string; playerId: string }>)?.[key];
    return b?.playerId === myPlayerId && b?.type === 'settlement';
  }, [gameState, myPlayerId]);

  const handleVertexClick = useCallback((vertex: { hex: HexCoord; direction: VertexDirection }) => {
    // During setup, clicking a vertex places immediately (no ghost)
    if (isSetup && myTurn && setupAction !== 'road') {
      sendMessage('place_settlement', { vertex });
      return;
    }

    // Ghost flow during build phases
    if (canBuild) {
      const locKey = `${vertex.hex.q},${vertex.hex.r},${vertex.direction}`;
      const ghostLocKey = ghostPlacement
        ? `${ghostPlacement.location.hex.q},${ghostPlacement.location.hex.r},${ghostPlacement.location.direction}`
        : '';

      // Second click on same ghost → confirm build
      if (ghostPlacement && ghostLocKey === locKey) {
        if (ghostPlacement.type === 'settlement') {
          sendMessage('place_settlement', { vertex });
        } else if (ghostPlacement.type === 'city') {
          sendMessage('place_city', { vertex });
        }
        setGhostPlacement(null);
        return;
      }

      // Clicking a different spot while ghost is active → cancel ghost
      if (ghostPlacement) {
        setGhostPlacement(null);
        return;
      }

      // First click → determine type and set ghost
      const buildType = isMyCityUpgradeTarget(vertex) ? 'city' : 'settlement';
      setGhostPlacement({
        type: buildType,
        location: { hex: vertex.hex, direction: vertex.direction },
      });
      return;
    }

    // Legacy explicit build mode (fallback)
    if (buildMode === 'settlement') {
      sendMessage('place_settlement', { vertex });
      setBuildMode(null);
    } else if (buildMode === 'city') {
      sendMessage('place_city', { vertex });
      setBuildMode(null);
    }
  }, [isSetup, myTurn, setupAction, canBuild, ghostPlacement, isMyCityUpgradeTarget, buildMode, sendMessage]);

  const handleEdgeClick = useCallback((edge: { hex: HexCoord; direction: EdgeDirection }) => {
    // During setup, clicking an edge places immediately (no ghost)
    if (isSetup && myTurn && setupAction === 'road') {
      sendMessage('place_road', { edge });
      return;
    }

    // Road Building free roads: place immediately without ghost
    if (freeRoadsRemaining > 0 && myTurn) {
      sendMessage('place_road', { edge });
      return;
    }

    // Ghost flow during build phases
    if (canBuild) {
      const locKey = `${edge.hex.q},${edge.hex.r},${edge.direction}`;
      const ghostLocKey = ghostPlacement
        ? `${ghostPlacement.location.hex.q},${ghostPlacement.location.hex.r},${ghostPlacement.location.direction}`
        : '';

      // Second click on same ghost → confirm build
      if (ghostPlacement && ghostPlacement.type === 'road' && ghostLocKey === locKey) {
        sendMessage('place_road', { edge });
        setGhostPlacement(null);
        return;
      }

      // Clicking a different spot while ghost is active → cancel ghost
      if (ghostPlacement) {
        setGhostPlacement(null);
        return;
      }

      // First click → set road ghost
      setGhostPlacement({
        type: 'road',
        location: { hex: edge.hex, direction: edge.direction },
      });
      return;
    }

    // Legacy explicit build mode (fallback)
    if (buildMode === 'road') {
      sendMessage('place_road', { edge });
      setBuildMode(null);
    }
  }, [isSetup, myTurn, setupAction, canBuild, freeRoadsRemaining, ghostPlacement, buildMode, sendMessage]);

  const handleHexClick = useCallback((hex: HexCoord) => {
    if (ghostPlacement) {
      setGhostPlacement(null);
      return;
    }
    if (phase === 'move_robber' && myTurn) {
      sendMessage('move_robber', { hex });
    }
  }, [phase, myTurn, ghostPlacement, sendMessage]);

  const handleBoardBackgroundClick = useCallback(() => {
    if (ghostPlacement) {
      setGhostPlacement(null);
    }
  }, [ghostPlacement]);

  const currentLobby = useLobbyStore((s) => s.currentLobby);

  // These hooks must be before any early returns (Rules of Hooks)
  const incomingOffers = useMemo(() => {
    if (!gameState) return [];
    return (gameState.activeTradeOffers as Array<{ id: string; fromPlayerId: string; offering: Record<string, number>; requesting: Record<string, number>; openToOffers?: boolean; status?: string; expiresAt?: number }>)
      .filter(o => o.fromPlayerId !== myPlayerId && (!o.status || o.status === 'open'))
      .map(o => {
        const playerNameMap: Record<string, { name: string; color: string }> = {};
        for (const p of gameState.players) playerNameMap[p.id] = { name: p.name, color: p.color };
        return {
          id: o.id,
          fromPlayerName: playerNameMap[o.fromPlayerId]?.name ?? 'Unknown',
          fromPlayerColor: playerNameMap[o.fromPlayerId]?.color ?? 'gray',
          offering: o.offering,
          requesting: o.requesting,
          openToOffers: o.openToOffers,
          expiresAt: o.expiresAt,
        };
      });
  }, [gameState, myPlayerId]);

  const myActiveOffers = useMemo(() => {
    if (!gameState || !myPlayerId) return [];
    return (gameState.activeTradeOffers as Array<{
      id: string; fromPlayerId: string;
      offering: Record<string, number>; requesting: Record<string, number>;
      openToOffers?: boolean;
      responses: Record<string, 'accept' | 'decline' | 'counter'>;
      counterOffers: Record<string, { offering: Record<string, number>; requesting: Record<string, number> }>;
      status: string;
      expiresAt?: number;
    }>).filter(o => o.fromPlayerId === myPlayerId && o.status === 'open');
  }, [gameState, myPlayerId]);

  const handleCounterOffer = useCallback((offer: { offering: Record<string, number>; requesting: Record<string, number> }) => {
    setCounterPrefillGet(offer.offering);
    setTradePreselect(null);
    setTradeModalOpen(true);
  }, []);

  const me = myPlayer();

  // Build ghost object with player color for the Board
  const boardGhost = useMemo(() => {
    if (!ghostPlacement || !me) return null;
    return {
      type: ghostPlacement.type,
      location: ghostPlacement.location,
      color: me.color,
    };
  }, [ghostPlacement, me]);

  // --- Early returns (no hooks below this point) ---

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
    if (connectionStatus === 'connected' && currentLobby && myPlayerId) {
      return (
        <GameWaitingRoom
          lobby={currentLobby}
          myPlayerId={myPlayerId}
          onReady={(ready) => sendMessage('ready', { ready })}
          onAddBot={(strategy) => sendMessage('add_bot', { strategy })}
          onRemoveBot={(botId) => sendMessage('remove_bot', { botId })}
          onKick={(targetId) => sendMessage('kick_player', { targetId })}
          onStartGame={() => sendMessage('start_game', {})}
          onUpdateConfig={(updates: { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string }) => sendMessage('update_config', updates)}
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

  const opponents = gameState.players.filter(p => p.id !== myPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerNames: Record<string, { name: string; color: string }> = {};
  for (const p of gameState.players) playerNames[p.id] = { name: p.name, color: p.color };

  // Phase instruction banner
  let phaseHint = '';
  if (freeRoadsRemaining > 0 && myTurn) {
    phaseHint = `🛣️ Place ${freeRoadsRemaining} free road${freeRoadsRemaining > 1 ? 's' : ''} (Road Building)`;
  } else if (isSetup && myTurn) {
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
            ghost={boardGhost}
            buildPhaseActive={canBuild}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            onHexClick={handleHexClick}
            onBackgroundClick={handleBoardBackgroundClick}
          />
        }
        playerHand={
          me ? (
            <PlayerHand
              resources={me.resources as unknown as Record<string, number>}
              developmentCards={me.developmentCards as Array<{ type: string; turnPurchased?: number }>}
              turnNumber={gameState.turnNumber}
              isMyTurn={myTurn}
              devCardPlayedThisTurn={!!(me as unknown as Record<string, unknown>).devCardPlayedThisTurn}
              roadsBuilt={me.roadsBuilt}
              settlementsBuilt={me.settlementsBuilt}
              citiesBuilt={me.citiesBuilt}
              victoryPoints={me.victoryPoints}
              onCardClick={() => {}}
              onPlayDevCard={handlePlayDevCard}
              onSelectionChange={setHandSelection}
              clearSelection={clearSelectionCounter}
              discardMode={mustDiscard}
              discardMax={discardCount}
            />
          ) : null
        }
        dice={
          canRoll
            ? <DiceDisplay dice={null} canRoll onRoll={handleRollDice} />
            : gameState.dice[0] > 0 ? <DiceDisplay dice={gameState.dice} /> : null
        }
        endTurnButton={
          <button
            onClick={canEndTurn ? handleEndTurn : undefined}
            disabled={!canEndTurn}
            className={`rounded-lg font-semibold shadow-lg pointer-events-auto flex items-center justify-center transition-colors ${
              canEndTurn ? 'bg-red-700 hover:bg-red-600 text-white cursor-pointer' : 'bg-gray-700 text-gray-500 cursor-default'
            }`}
            style={{ width: '9rem', height: '9rem', fontSize: '5rem' }}
          >
            ⏩
          </button>
        }
        rightPanel={
          <RightSidebar
            chatLog={
              <GameLog
                entries={gameState.log}
                playerNames={playerNames}
                onSendChat={(message) => sendMessage('chat', { message })}
              />
            }
            deckSize={(gameState as unknown as Record<string, unknown>).deckSize as number ?? 0}
            players={gameState.players as unknown as Array<{
              id: string; name: string; color: string; status: string;
              victoryPoints: number; resourceCount?: number; devCardCount?: number;
              resources: Record<string, number>; developmentCards: unknown[];
              hasLongestRoad: boolean; hasLargestArmy: boolean;
              roadsBuilt: number; settlementsBuilt: number; citiesBuilt: number;
              knightsPlayed: number;
            }>}
            currentPlayerId={currentPlayer?.id || null}
            myPlayerId={myPlayerId}
          />
        }
        tradeOffers={
          <>
            {myActiveOffers.map(offer => (
              <TradeInitiatorPanel
                key={offer.id}
                offer={offer}
                opponents={opponents.map(p => ({ id: p.id, name: p.name, color: p.color }))}
                onConfirm={(offerId, withPlayerId) => sendMessage('trade_confirm', { offerId, withPlayerId })}
                onCancel={(offerId) => sendMessage('trade_cancel', { offerId })}
              />
            ))}
            <TradeOfferCard
              offers={incomingOffers}
              onAccept={(offerId) => sendMessage('trade_respond', { offerId, response: 'accept' })}
              onDecline={(offerId) => sendMessage('trade_respond', { offerId, response: 'decline' })}
              onCounter={handleCounterOffer}
            />
          </>
        }
      />

      {/* Trade Modal — fixed position above hand */}
      {tradeModalOpen && me && (
        <TradeModal
          myResources={me.resources as unknown as Record<string, number>}
          myColor={me.color}
          harbors={me.harbors ?? []}
          offering={handSelection}
          preselectedResource={tradePreselect}
          prefillGet={counterPrefillGet}
          onPropose={(offering, requesting, openToOffers) => {
            sendMessage('trade_offer', { offering, requesting, openToOffers: openToOffers ?? false });
            closeTradeModal();
          }}
          onBankTrade={(giving, givingCount, receiving) => {
            sendMessage('trade_with_bank', { giving, givingCount, receiving });
            closeTradeModal();
          }}
          onClose={closeTradeModal}
        />
      )}

      {/* Resource distribution animation */}
      <ResourceAnimation items={animationItems} onComplete={handleAnimationComplete} />

      {/* Discard Panel */}
      {mustDiscard && (
        <DiscardPanel
          discardCount={discardCount}
          selectedCount={Object.values(handSelection).reduce((a, b) => a + b, 0)}
          timerSeconds={15}
          onConfirm={() => {
            sendMessage('discard_cards', { resources: handSelection });
            setHandSelection({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });
            setClearSelectionCounter((c) => c + 1);
          }}
        />
      )}

      {/* Dev panel (development only) */}
      {import.meta.env.DEV && <DevPanel sendMessage={sendMessage} />}
    </div>
  );
}
