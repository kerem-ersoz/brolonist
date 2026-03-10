import type { WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  playerId: string;
  playerName: string;
  gameId: string | null;
}

class Hub {
  private clients = new Map<string, Client>(); // playerId → Client
  private rooms = new Map<string, Set<string>>(); // gameId → Set<playerId>

  addClient(playerId: string, playerName: string, ws: WebSocket): void {
    this.clients.set(playerId, { ws, playerId, playerName, gameId: null });
  }

  removeClient(playerId: string): void {
    const client = this.clients.get(playerId);
    if (client?.gameId) {
      this.leaveRoom(playerId, client.gameId);
    }
    this.clients.delete(playerId);
  }

  joinRoom(playerId: string, gameId: string): void {
    const client = this.clients.get(playerId);
    if (!client) return;
    client.gameId = gameId;
    if (!this.rooms.has(gameId)) {
      this.rooms.set(gameId, new Set());
    }
    this.rooms.get(gameId)!.add(playerId);
  }

  leaveRoom(playerId: string, gameId: string): void {
    const room = this.rooms.get(gameId);
    if (room) {
      room.delete(playerId);
      if (room.size === 0) this.rooms.delete(gameId);
    }
    const client = this.clients.get(playerId);
    if (client) client.gameId = null;
  }

  /** Send to one player */
  send(playerId: string, type: string, payload: unknown): void {
    const client = this.clients.get(playerId);
    if (client?.ws.readyState === 1) {
      client.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    }
  }

  /** Broadcast to all players in a room */
  broadcast(gameId: string, type: string, payload: unknown, excludePlayerId?: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    for (const pid of room) {
      if (pid !== excludePlayerId) {
        this.send(pid, type, payload);
      }
    }
  }

  getClient(playerId: string): Client | undefined {
    return this.clients.get(playerId);
  }

  getRoomMembers(gameId: string): string[] {
    return Array.from(this.rooms.get(gameId) || []);
  }
}

export const hub = new Hub();
