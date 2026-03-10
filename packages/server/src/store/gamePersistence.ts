import { prisma } from './prisma.js';

interface GameResult {
  gameId: string;
  status: 'completed' | 'abandoned';
  playerCount: number;
  winnerId: string | null;
  config: Record<string, unknown>;
  players: Array<{
    userId: string;
    playerIndex: number;
    color: string;
    finalVp: number;
    placement: number;
    quit: boolean;
  }>;
}

export async function saveGameResult(result: GameResult): Promise<void> {
  try {
    await prisma.game.create({
      data: {
        id: result.gameId,
        status: result.status,
        playerCount: result.playerCount,
        winnerId: result.winnerId,
        config: result.config as any,
        endedAt: new Date(),
        players: {
          create: result.players.map(p => ({
            userId: p.userId,
            playerIndex: p.playerIndex,
            color: p.color,
            finalVp: p.finalVp,
            placement: p.placement,
            quit: p.quit,
          })),
        },
      },
    });
  } catch (err) {
    console.error('Failed to save game result:', err);
  }
}

export async function saveGameEvent(
  gameId: string, seq: number, eventType: string, playerId: string | null, payload: unknown
): Promise<void> {
  try {
    await prisma.gameEvent.create({
      data: { gameId, seq, eventType, playerId, payload: payload as any },
    });
  } catch {
    // Non-critical — log and continue
  }
}
