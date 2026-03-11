import { create } from 'zustand';

interface GameListing {
  id: string;
  name: string;
  host: string;
  playerCount: number;
  mapType: string;
  isPrivate: boolean;
}

interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  isBot: boolean;
  botStrategy?: string;
}

interface GameLobby {
  id: string;
  name: string;
  hostId: string;
  players: LobbyPlayer[];
  spectators?: { id: string; name: string }[];
  config: {
    victoryPoints: number;
    mapType: string;
    turnTimerSeconds: number;
    isPrivate: boolean;
  };
}

interface LobbyStore {
  games: GameListing[];
  currentLobby: GameLobby | null;
  loading: boolean;

  fetchGames: () => Promise<void>;
  createGame: () => Promise<string>;
  setCurrentLobby: (lobby: GameLobby | null) => void;
  updateLobby: (update: Partial<GameLobby>) => void;
}

export type { GameListing, LobbyPlayer, GameLobby, LobbyStore };

export const useLobbyStore = create<LobbyStore>((set) => ({
  games: [],
  currentLobby: null,
  loading: false,

  fetchGames: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/games');
      const games = await res.json();
      set({ games, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createGame: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const game = await res.json();
    set({ currentLobby: game });
    return game.id;
  },

  setCurrentLobby: (currentLobby) => set({ currentLobby }),
  updateLobby: (update) => set((s) => ({
    currentLobby: s.currentLobby ? { ...s.currentLobby, ...update } : null,
  })),
}));
