import {
  GameState,
  GamePhase,
  getCurrentPlayer,
} from '../types/game.js';
import {
  DevelopmentCardType,
  DEV_CARD_COST,
  ResourceType,
  ALL_RESOURCES,
  hasResources,
  subtractResources,
} from '../types/resources.js';

/** Check if a player can buy a development card. Returns null if valid, error string otherwise. */
export function canBuyDevCard(state: GameState, playerId: string): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  if (state.currentPhase === GamePhase.SpecialBuild) return 'Cannot buy dev cards during special build';
  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return 'Not your turn';
  if (state.currentPhase !== GamePhase.TradeAndBuild)
    return 'Cannot buy in this phase';
  if (!hasResources(player.resources, DEV_CARD_COST)) return 'Insufficient resources';
  if (state.developmentDeck.length === 0) return 'No development cards remaining';
  return null;
}

/** Buy a development card from the deck. Mutates state. */
export function executeBuyDevCard(state: GameState, playerId: string): DevelopmentCardType {
  const player = state.players.find((p) => p.id === playerId)!;
  player.resources = subtractResources(player.resources, DEV_CARD_COST);
  const cardType = state.developmentDeck.pop()!;
  player.developmentCards.push({ type: cardType, turnPurchased: state.turnNumber });
  return cardType;
}

/** Check if a player can play a development card. Returns null if valid, error string otherwise. */
export function canPlayDevCard(
  state: GameState,
  playerId: string,
  cardType: DevelopmentCardType,
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return 'Not your turn';
  if (player.devCardPlayedThisTurn) return 'Already played a development card this turn';

  // VP cards are never "played" as an action
  if (cardType === DevelopmentCardType.VictoryPoint) return 'Victory point cards cannot be played';

  const card = player.developmentCards.find(
    (c) => c.type === cardType && c.turnPurchased < state.turnNumber,
  );
  if (!card) return 'Card not in hand or was purchased this turn';

  return null;
}

/** Remove the played card from hand and mark devCardPlayedThisTurn. */
function consumeCard(state: GameState, playerId: string, cardType: DevelopmentCardType): void {
  const player = state.players.find((p) => p.id === playerId)!;
  const idx = player.developmentCards.findIndex(
    (c) => c.type === cardType && c.turnPurchased < state.turnNumber,
  );
  if (idx !== -1) player.developmentCards.splice(idx, 1);
  player.devCardPlayedThisTurn = true;
}

/** Execute playing a Knight card. Transitions to MoveRobber phase. Mutates state. */
export function executePlayKnight(state: GameState, playerId: string): void {
  consumeCard(state, playerId, DevelopmentCardType.Knight);
  const player = state.players.find((p) => p.id === playerId)!;
  player.knightsPlayed += 1;
  state.currentPhase = GamePhase.MoveRobber;
}

/** Execute Road Building card. Returns the number of free roads the player may build (up to 2). */
export function executeRoadBuilding(state: GameState, playerId: string): number {
  consumeCard(state, playerId, DevelopmentCardType.RoadBuilding);
  const player = state.players.find((p) => p.id === playerId)!;
  const remaining = 15 - player.roadsBuilt;
  return Math.min(2, remaining);
}

/** Execute Year of Plenty card: take 2 resources from the bank. Mutates state. */
export function executeYearOfPlenty(
  state: GameState,
  playerId: string,
  resource1: ResourceType,
  resource2: ResourceType,
): void {
  consumeCard(state, playerId, DevelopmentCardType.YearOfPlenty);
  const player = state.players.find((p) => p.id === playerId)!;
  player.resources[resource1] += 1;
  player.resources[resource2] += 1;
}

/** Execute Monopoly card: steal all of one resource type from every other player. Mutates state. */
export function executeMonopoly(
  state: GameState,
  playerId: string,
  resourceType: ResourceType,
): number {
  consumeCard(state, playerId, DevelopmentCardType.Monopoly);
  const player = state.players.find((p) => p.id === playerId)!;
  let total = 0;
  for (const other of state.players) {
    if (other.id === playerId) continue;
    const amount = other.resources[resourceType];
    if (amount > 0) {
      other.resources[resourceType] = 0;
      total += amount;
    }
  }
  player.resources[resourceType] += total;
  return total;
}
