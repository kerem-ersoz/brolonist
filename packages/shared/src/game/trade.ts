import {
  GameState,
  GamePhase,
  Player,
  getCurrentPlayer,
  vertexKey,
} from '../types/game.js';
import {
  ResourceType,
  Resources,
  HarborType,
  hasResources,
  emptyResources,
  addResources,
  subtractResources,
} from '../types/resources.js';

/** Map HarborType to its matching ResourceType (if specific). */
const HARBOR_RESOURCE: Partial<Record<HarborType, ResourceType>> = {
  [HarborType.Brick]: ResourceType.Brick,
  [HarborType.Lumber]: ResourceType.Lumber,
  [HarborType.Ore]: ResourceType.Ore,
  [HarborType.Grain]: ResourceType.Grain,
  [HarborType.Wool]: ResourceType.Wool,
};

/** Returns the bank-trade ratio a player has for a given resource. */
export function getTradeRatio(player: Player, resourceType: ResourceType): number {
  // Check for 2:1 specific harbor
  for (const h of player.harbors) {
    if (HARBOR_RESOURCE[h] === resourceType) return 2;
  }
  // Check for 3:1 generic harbor
  if (player.harbors.includes(HarborType.Generic)) return 3;
  // Default 4:1
  return 4;
}

/** Validate a bank trade. Returns null if valid, otherwise an error string. */
export function canTradeWithBank(
  state: GameState,
  playerId: string,
  giving: ResourceType,
  givingCount: number,
  receiving: ResourceType,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return 'Not your turn';
  if (state.currentPhase !== GamePhase.TradeAndBuild) return 'Cannot trade in this phase';
  if (giving === receiving) return 'Cannot trade same resource';

  const ratio = getTradeRatio(player, giving);
  if (givingCount !== ratio) return `Must give exactly ${ratio} of ${giving}`;
  if (player.resources[giving] < givingCount) return 'Insufficient resources';

  return null;
}

/** Execute a bank trade. Mutates state. */
export function executeTradeWithBank(
  state: GameState,
  playerId: string,
  giving: ResourceType,
  givingCount: number,
  receiving: ResourceType,
): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.resources[giving] -= givingCount;
  player.resources[receiving] += 1;
}

/** Check if a player can propose a trade. Returns null if valid, error string otherwise. */
export function canProposeTrade(state: GameState, playerId: string): string | null {
  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return 'Not your turn';
  if (state.currentPhase !== GamePhase.TradeAndBuild) return 'Cannot trade in this phase';
  return null;
}

/** Execute an atomic player-to-player trade. Mutates state. */
export function executeTrade(
  state: GameState,
  fromId: string,
  toId: string,
  offering: Resources,
  requesting: Resources,
): string | null {
  const from = state.players.find((p) => p.id === fromId);
  const to = state.players.find((p) => p.id === toId);
  if (!from || !to) return 'Player not found';
  if (!hasResources(from.resources, offering)) return 'Offering player has insufficient resources';
  if (!hasResources(to.resources, requesting))
    return 'Accepting player has insufficient resources';

  from.resources = subtractResources(from.resources, offering);
  from.resources = addResources(from.resources, requesting);
  to.resources = subtractResources(to.resources, requesting);
  to.resources = addResources(to.resources, offering);

  return null;
}
