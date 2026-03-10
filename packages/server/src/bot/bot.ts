import type { GameState } from '@brolonist/shared';
import { RandomBot, GreedyBot, SmartBot } from './strategies.js';

export interface BotAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface Bot {
  id: string;
  name: string;
  strategy: 'random' | 'greedy' | 'smart';
  decideAction(state: GameState, validActions: BotAction[]): BotAction;
}

export function createBot(strategy: 'random' | 'greedy' | 'smart', index: number): Bot {
  const names = ['AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot', 'EpsilonBot', 'ZetaBot', 'EtaBot', 'ThetaBot'];
  const name = names[index % names.length];
  const id = `bot-${strategy}-${index}`;

  switch (strategy) {
    case 'random':
      return new RandomBot(id, name);
    case 'greedy':
      return new GreedyBot(id, name);
    case 'smart':
      return new SmartBot(id, name);
  }
}
