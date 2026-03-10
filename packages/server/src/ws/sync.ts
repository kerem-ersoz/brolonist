import type { GameState } from '@brolonist/shared';

/**
 * Filter game state per player — hide secret info (other players' resources,
 * dev cards, and the development deck contents).
 */
export function filterStateForPlayer(state: GameState, playerId: string): unknown {
  const filtered = JSON.parse(JSON.stringify(state, mapReplacer));

  for (const player of filtered.players) {
    if (player.id !== playerId) {
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
