import type { GameState } from '@brolonist/shared';
import { createBot, type Bot, type BotAction } from './bot.js';

class BotManager {
  private bots = new Map<string, Bot>();

  createBot(strategy: 'random' | 'greedy' | 'smart'): Bot {
    const index = this.bots.size;
    const bot = createBot(strategy, index);
    this.bots.set(bot.id, bot);
    return bot;
  }

  removeBot(botId: string): void {
    this.bots.delete(botId);
  }

  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  isBot(playerId: string): boolean {
    return this.bots.has(playerId);
  }

  getBotAction(botId: string, state: GameState, validActions: BotAction[]): BotAction | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;
    return bot.decideAction(state, validActions);
  }

  cleanupGame(botIds: string[]): void {
    for (const id of botIds) {
      this.bots.delete(id);
    }
  }
}

export const botManager = new BotManager();
