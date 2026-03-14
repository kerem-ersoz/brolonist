import type { GameState } from '@brolonist/shared';
import { calculateLongestRoad, DevelopmentCardType } from '@brolonist/shared';

// Import free roads tracking from gameHandler
let _getFreeRoads: ((gameId: string) => number) | null = null;
export function registerFreeRoadsGetter(fn: (gameId: string) => number): void {
  _getFreeRoads = fn;
}

/**
 * Filter game state per player — hide secret info (other players' resources,
 * dev cards, and the development deck contents).
 */
export function filterStateForPlayer(state: GameState, playerId: string): unknown {
  const filtered = JSON.parse(JSON.stringify(state, mapReplacer));

  for (const player of filtered.players) {
    // Compute and attach longest road length for each player
    player.longestRoadLength = calculateLongestRoad(state, player.id);

    if (player.id !== playerId) {
      // Count VP cards before hiding dev cards
      const vpCardCount = (player.developmentCards as Array<{ type: string }>)?.filter(
        (c) => c.type === DevelopmentCardType.VictoryPoint
      ).length ?? 0;
      // Subtract hidden VP card points from visible victory points
      player.victoryPoints = (player.victoryPoints ?? 0) - vpCardCount;

      const totalResources = Object.values(player.resources as Record<string, number>)
        .reduce((a: number, b: number) => a + b, 0);
      player.resources = { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
      player.resourceCount = totalResources;
      const devCardCount = player.developmentCards?.length ?? 0;
      player.developmentCards = [];
      player.devCardCount = devCardCount;
    }
  }

  // Hide development deck contents but expose count
  filtered.deckSize = state.developmentDeck.length;
  filtered.developmentDeck = [];

  // Expose free roads remaining from Road Building card
  if (_getFreeRoads) {
    filtered.freeRoadsRemaining = _getFreeRoads(state.id);
  }

  // Compute actual bank resources (19 per type minus ALL players' holdings)
  const bankResources: Record<string, number> = { brick: 19, lumber: 19, ore: 19, grain: 19, wool: 19 };
  for (const p of state.players) {
    for (const [res, count] of Object.entries(p.resources)) {
      if (res in bankResources) bankResources[res] -= count as number;
    }
  }
  filtered.bankResources = bankResources;

  return filtered;
}

/**
 * JSON.stringify replacer that serialises Map instances as plain objects
 * so the deep-clone round-trip works correctly for Board maps.
 */
function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
}
