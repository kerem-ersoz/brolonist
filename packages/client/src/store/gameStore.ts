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
  activeTradeOffers: unknown[];
  pendingDiscards: string[];
  longestRoadHolder: string | null;
  largestArmyHolder: string | null;
  deckSize?: number;
  log: Array<{ timestamp: string; playerId?: string; type: string; message: string }>;
}

interface GameStore {
  // State
  gameState: GameStateView | null;
  myPlayerId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  lastError: string | null;

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
  addLogEntry: (entry: GameStateView['log'][0]) => void;
  reset: () => void;
}

export type { GameStateView, PlayerView, Resources, GameStore };

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  myPlayerId: null,
  connectionStatus: 'disconnected',
  lastError: null,

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

  setGameState: (state) => set({ gameState: state, lastError: null }),

  applyDelta: (delta) => set((s) => ({
    gameState: s.gameState ? { ...s.gameState, ...delta } : null,
  })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  setError: (lastError) => set({ lastError }),

  addLogEntry: (entry) => set((s) => ({
    gameState: s.gameState
      ? { ...s.gameState, log: [...s.gameState.log, entry] }
      : null,
  })),

  reset: () => set({ gameState: null, myPlayerId: null, lastError: null }),
}));
