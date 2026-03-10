import type { GameState } from '@brolonist/shared';
import type { Bot, BotAction } from './bot.js';

/** RandomBot: picks a valid random action. */
export class RandomBot implements Bot {
  strategy = 'random' as const;
  constructor(public id: string, public name: string) {}

  decideAction(_state: GameState, validActions: BotAction[]): BotAction {
    if (validActions.length === 0) {
      return { type: 'end_turn', payload: {} };
    }
    return validActions[Math.floor(Math.random() * validActions.length)];
  }
}

/** GreedyBot: prioritizes actions that give the most VP. */
export class GreedyBot implements Bot {
  strategy = 'greedy' as const;
  constructor(public id: string, public name: string) {}

  decideAction(_state: GameState, validActions: BotAction[]): BotAction {
    const priority = ['place_city', 'place_settlement', 'buy_dev_card', 'place_road', 'end_turn'];
    for (const actionType of priority) {
      const action = validActions.find(a => a.type === actionType);
      if (action) return action;
    }
    return validActions[0] || { type: 'end_turn', payload: {} };
  }
}

/** SmartBot: uses heuristics to pick the best action. */
export class SmartBot implements Bot {
  strategy = 'smart' as const;
  constructor(public id: string, public name: string) {}

  decideAction(_state: GameState, validActions: BotAction[]): BotAction {
    // 1. Build city (best VP per resource)
    const cityAction = validActions.find(a => a.type === 'place_city');
    if (cityAction) return cityAction;

    // 2. Build settlement on high-value intersections
    const settlementAction = validActions.find(a => a.type === 'place_settlement');
    if (settlementAction) return settlementAction;

    // 3. Build road toward good settlement spots
    const roadAction = validActions.find(a => a.type === 'place_road');
    if (roadAction) return roadAction;

    // 4. Buy dev card if have resources
    const devCardAction = validActions.find(a => a.type === 'buy_dev_card');
    if (devCardAction) return devCardAction;

    // 5. End turn
    return validActions.find(a => a.type === 'end_turn') || { type: 'end_turn', payload: {} };
  }
}
