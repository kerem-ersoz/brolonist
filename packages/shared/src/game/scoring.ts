import {
  GameState,
  getCurrentPlayer,
} from '../types/game.js';
import {
  BuildingType,
  DevelopmentCardType,
} from '../types/resources.js';

/** Returns the target victory points based on player count. */
export function getTargetVP(playerCount: number): number {
  if (playerCount <= 4) return 10;
  if (playerCount <= 6) return 12;
  return 14;
}

/** Calculate total victory points for a player. */
export function calculateVictoryPoints(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;

  let vp = 0;

  // 1 VP per settlement
  vp += player.settlementsBuilt;

  // 2 VP per city
  vp += player.citiesBuilt * 2;

  // Longest road: 2 VP
  if (player.hasLongestRoad) vp += 2;

  // Largest army: 2 VP
  if (player.hasLargestArmy) vp += 2;

  // Hidden VP development cards
  for (const card of player.developmentCards) {
    if (card.type === DevelopmentCardType.VictoryPoint) vp += 1;
  }

  return vp;
}

/** Check if any player has won. Returns winner ID or null. */
export function checkVictoryCondition(state: GameState): string | null {
  const target = state.config.victoryPoints || getTargetVP(state.players.length);

  // First check the current player (they have priority per Catan rules)
  const current = getCurrentPlayer(state);
  const currentVp = calculateVictoryPoints(state, current.id);
  if (currentVp >= target) return current.id;

  // Also check all other players (e.g. VP cards accumulated)
  for (const player of state.players) {
    if (player.id === current.id) continue;
    const vp = calculateVictoryPoints(state, player.id);
    if (vp >= target) return player.id;
  }

  return null;
}

/** Update largest army holder. Minimum 3 knights to qualify. Mutates state. */
export function updateLargestArmyHolder(state: GameState): void {
  // Clear all flags
  for (const p of state.players) {
    p.hasLargestArmy = false;
  }

  let maxKnights = 2; // minimum 3 to qualify
  let maxPlayer: string | null = null;

  for (const p of state.players) {
    if (p.knightsPlayed > maxKnights) {
      maxKnights = p.knightsPlayed;
      maxPlayer = p.id;
    }
  }

  // Handle ties: current holder keeps it
  if (maxPlayer === null && state.largestArmyHolder) {
    const holder = state.players.find((p) => p.id === state.largestArmyHolder);
    if (holder && holder.knightsPlayed >= 3) {
      maxPlayer = state.largestArmyHolder;
      maxKnights = holder.knightsPlayed;
    }
  } else if (maxPlayer !== null) {
    // Check for ties
    const tiedPlayers = state.players.filter((p) => p.knightsPlayed === maxKnights);
    if (tiedPlayers.length > 1 && state.largestArmyHolder) {
      const currentHolderTied = tiedPlayers.some((p) => p.id === state.largestArmyHolder);
      if (currentHolderTied) {
        maxPlayer = state.largestArmyHolder;
      }
    }
  }

  state.largestArmyHolder = maxPlayer;
  state.largestArmySize = maxPlayer ? maxKnights : 0;

  if (maxPlayer) {
    const player = state.players.find((p) => p.id === maxPlayer);
    if (player) player.hasLargestArmy = true;
  }
}
