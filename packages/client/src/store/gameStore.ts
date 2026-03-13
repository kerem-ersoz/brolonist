import { create } from 'zustand';

// Use simplified types here to avoid import issues — match the server's filtered state shape
interface Resources {
  brick: number;
  lumber: number;
  ore: number;
  grain: number;
  wool: number;
}

interface PlayerView {
  id: string;
  name: string;
  color: string;
  status: string;
  isBot: boolean;
  resources: Resources;         // own resources (full) or empty for opponents
  resourceCount?: number;       // opponent total card count
  developmentCards: unknown[];   // own dev cards or empty for opponents
  devCardCount?: number;        // opponent dev card count
  victoryPoints: number;
  knightsPlayed: number;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  harbors?: string[];
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
}

interface GameStateView {
  id: string;
  name: string;
  status: string;
  board: unknown;  // Full board data
  players: PlayerView[];
  currentPlayerIndex: number;
  currentPhase: string;
  robberPosition: { q: number; r: number };
  dice: [number, number];
  turnNumber: number;
  setupRound: number;
  setupAction?: 'settlement' | 'road';
  activeTradeOffers: unknown[];
  pendingDiscards: string[];
  pendingStealTargets?: string[];
  longestRoadHolder: string | null;
  largestArmyHolder: string | null;
  deckSize?: number;
  freeRoadsRemaining?: number;
  log: Array<{ timestamp: string; playerId?: string; type: string; message: string; data?: Record<string, unknown> }>;
  config?: { turnTimerSeconds?: number; victoryPoints?: number; [key: string]: unknown };
  turnDeadline?: string | null;
}

interface PlayerStanding {
  playerId: string;
  name: string;
  color: string;
  totalVP: number;
  settlements: number;
  cities: number;
  longestRoad: boolean;
  largestArmy: boolean;
  vpCards: number;
  knightsPlayed: number;
  roadsBuilt: number;
}

interface GameResult {
  winnerId: string;
  winnerName: string;
  winnerColor?: string;
  victoryPoints: number;
  standings?: PlayerStanding[];
}

interface GameStore {
  // State
  gameState: GameStateView | null;
  myPlayerId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  lastError: string | null;
  gameResult: GameResult | null;

  // Derived getters
  isMyTurn: () => boolean;
  myPlayer: () => PlayerView | null;
  currentPlayer: () => PlayerView | null;

  // Actions from server
  setGameState: (state: GameStateView) => void;
  applyDelta: (delta: Partial<GameStateView>) => void;
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  setMyPlayerId: (id: string) => void;
  setError: (error: string | null) => void;
  setGameResult: (result: GameResult) => void;
  addLogEntry: (entry: GameStateView['log'][0]) => void;
  reset: () => void;
}

export type { GameStateView, PlayerView, Resources, GameStore, GameResult };

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  myPlayerId: null,
  connectionStatus: 'disconnected',
  lastError: null,
  gameResult: null,

  isMyTurn: () => {
    const { gameState, myPlayerId } = get();
    if (!gameState || !myPlayerId) return false;
    return gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;
  },

  myPlayer: () => {
    const { gameState, myPlayerId } = get();
    if (!gameState || !myPlayerId) return null;
    return gameState.players.find(p => p.id === myPlayerId) || null;
  },

  currentPlayer: () => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex] || null;
  },

  setGameState: (state) => set((s) => {
    // If no existing state, just set it directly
    if (!s.gameState) return { gameState: state, lastError: null };
    // Merge log: preserve client-only entries (chat messages) that the server doesn't have
    if (state.log && s.gameState.log) {
      const serverSet = new Set(state.log.map((e) => `${e.timestamp}|${e.type}|${e.playerId ?? ''}`));
      const clientOnly = s.gameState.log.filter(
        (e) => !serverSet.has(`${e.timestamp}|${e.type}|${e.playerId ?? ''}`)
      );
      state = { ...state, log: [...state.log, ...clientOnly].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) };
    }
    return { gameState: state, lastError: null };
  }),

  applyDelta: (delta) => set((s) => {
    if (!s.gameState) return { gameState: null };
    const merged = { ...s.gameState, ...delta };
    // Merge log: keep client-only entries (chat, trades) that the server log doesn't have
    if (delta.log && s.gameState.log) {
      const serverLog = delta.log;
      const clientLog = s.gameState.log;
      // Server log is authoritative for game events; client may have extra entries
      // (chat, trade_proposed, trade_completed) appended via addLogEntry.
      // Keep all server entries + any client entries beyond the previous server log length.
      const prevServerLen = clientLog.findIndex((e) =>
        e.type === 'chat' || e.type === 'trade_proposed' || e.type === 'trade_completed'
      );
      // Simpler approach: server log is the base, append any client-only entries
      // that aren't in the server log (matched by timestamp + type)
      const serverSet = new Set(serverLog.map((e) => `${e.timestamp}|${e.type}|${e.playerId ?? ''}`));
      const clientOnly = clientLog.filter(
        (e) => !serverSet.has(`${e.timestamp}|${e.type}|${e.playerId ?? ''}`)
      );
      merged.log = [...serverLog, ...clientOnly].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    return { gameState: merged };
  }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  setError: (lastError) => set({ lastError }),
  setGameResult: (gameResult) => set({ gameResult }),

  addLogEntry: (entry) => set((s) => ({
    gameState: s.gameState
      ? { ...s.gameState, log: [...s.gameState.log, entry] }
      : null,
  })),

  reset: () => set({ gameState: null, myPlayerId: null, lastError: null, gameResult: null }),
}));
