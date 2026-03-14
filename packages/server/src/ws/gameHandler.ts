import { v4 as uuidv4 } from 'uuid';
import { startTurnTimer, clearTurnTimer, cleanupTimers } from './turnTimer.js';
import {
  type GameState,
  type GameConfig,
  type Player,
  type Resources,
  type TradeOffer,
  type HexCoord,
  type VertexId,
  type EdgeId,
  GamePhase,
  PlayerColor,
  PlayerStatus,
  DevelopmentCardType,
  DEV_CARD_COUNTS,
  ResourceType,
  BuildingType,
  BUILDING_COSTS,
  DEV_CARD_COST,
  createPlayer,
  getCurrentPlayer,
  generateBoard,
  // engine
  rollDice,
  distributeResources,
  getPlayersWhoMustDiscard,
  transitionPhase,
  endTurn as engineEndTurn,
  advanceSpecialBuild,
  addLogEntry,
  // rules
  canPlaceSettlement,
  canPlaceRoad,
  canPlaceCity,
  vertexKey,
  edgeKey,
  getValidSettlementLocations,
  getValidRoadLocations,
  // setup
  handleSetupSettlement,
  handleSetupRoad,
  advanceSetupPhase,
  distributeInitialResources,
  // trade
  canTradeWithBank,
  executeTradeWithBank,
  canProposeTrade,
  executeTrade,
  // robber
  canMoveRobber,
  executeRobberMove,
  getStealTargets,
  executeSteal,
  validateDiscard,
  executeDiscard,
  autoDiscardRandom,
  totalCards,
  hexEquals,
  // devcard
  canBuyDevCard,
  executeBuyDevCard,
  canPlayDevCard,
  executePlayKnight,
  executeRoadBuilding,
  executeYearOfPlenty,
  executeMonopoly,
  // scoring
  checkVictoryCondition,
  calculateVictoryPoints,
  updateLargestArmyHolder,
  // longest road
  updateLongestRoadHolder,
  hasResources,
  subtractResources,
  addResources,
  vertexAdjacentEdges,
  TERRAIN_RESOURCE,
} from '@brolonist/shared';

import { hub } from './hub.js';
import { filterStateForPlayer, registerFreeRoadsGetter } from './sync.js';

// ---------------------------------------------------------------------------
// In-memory game state store
// ---------------------------------------------------------------------------

const games = new Map<string, GameState>();

// Track the phase before a dev card was played so we can return to it.
// Key: gameId, Value: the phase (e.g. RollDice) that should be restored after the card resolves.
const preDevCardPhase = new Map<string, string>();

// Track free road placements from Road Building dev card.
// Key: gameId, Value: { playerId, remaining, phaseBefore }
const freeRoadsRemaining = new Map<string, { playerId: string; remaining: number; phaseBefore: string }>();

// Register getter so sync.ts can include freeRoadsRemaining in filtered state
registerFreeRoadsGetter((gameId: string) => {
  const info = freeRoadsRemaining.get(gameId);
  return info ? info.remaining : 0;
});

export function getGame(gameId: string): GameState | undefined {
  return games.get(gameId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendError(playerId: string, message: string): void {
  hub.send(playerId, 'error', { code: 'GAME_ERROR', message });
}

/** Log per-player resource gains from distribution. */
function logDistribution(state: GameState, distribution: Record<string, Resources>): void {
  for (const [pid, resources] of Object.entries(distribution)) {
    const total = Object.values(resources).reduce((a: number, b: number) => a + b, 0);
    if (total === 0) continue;
    const parts: string[] = [];
    for (const [res, count] of Object.entries(resources)) {
      if ((count as number) > 0) parts.push(`${count} ${res}`);
    }
    addLogEntry(state, {
      type: 'distribute',
      message: `received ${parts.join(', ')}`,
      playerId: pid,
      data: { resources },
    });
  }
}

function broadcastState(gameId: string, state: GameState): void {
  // Auto-manage turn timer: reset whenever the active player or phase changes
  const timerKey = `${state.currentPlayerIndex}:${state.currentPhase}:${state.turnNumber}:${state.specialBuildCurrentIndex}`;
  const prevKey = lastTimerKey.get(gameId);
  if (timerKey !== prevKey) {
    lastTimerKey.set(gameId, timerKey);
    resetTurnTimer(gameId, state);
  }

  const members = hub.getRoomMembers(gameId);
  for (const pid of members) {
    hub.send(pid, 'game_state', filterStateForPlayer(state, pid));
  }
}

const lastTimerKey = new Map<string, string>();

function broadcastAndCheckVictory(gameId: string, state: GameState): void {
  broadcastState(gameId, state);
  const winnerId = checkVictoryCondition(state);
  if (winnerId) {
    state.currentPhase = GamePhase.GameOver;
    state.status = 'finished';
    state.turnDeadline = null;
    cleanupTimers(gameId);
    lastTimerKey.delete(gameId);
    const winner = state.players.find((p) => p.id === winnerId);

    // Build full scoreboard with VP breakdown for all players
    const standings = state.players
      .map((p) => {
        const vpCards = p.developmentCards.filter(c => c.type === DevelopmentCardType.VictoryPoint).length;
        return {
          playerId: p.id,
          name: p.name,
          color: p.color,
          totalVP: calculateVictoryPoints(state, p.id),
          settlements: p.settlementsBuilt,
          cities: p.citiesBuilt,
          longestRoad: p.hasLongestRoad,
          largestArmy: p.hasLargestArmy,
          vpCards,
          knightsPlayed: p.knightsPlayed,
          roadsBuilt: p.roadsBuilt,
        };
      })
      .sort((a, b) => b.totalVP - a.totalVP);

    hub.broadcast(gameId, 'game_ended', {
      winnerId,
      winnerName: winner?.name ?? 'Unknown',
      winnerColor: winner?.color ?? 'blue',
      victoryPoints: calculateVictoryPoints(state, winnerId),
      standings,
    });
    broadcastState(gameId, state);
  }
}

// ---------------------------------------------------------------------------
// Turn timer management
// ---------------------------------------------------------------------------

const ROLL_TIMER_SECONDS = 5;
const ROBBER_TIMER_SECONDS = 30;
const SPECIAL_BUILD_TIMER_SECONDS = 25;
const DISCARD_TIMER_SECONDS = 15;

/** Return true if the player is allowed to act: either the current player, or the active special-build player. */
function isActivePlayer(state: GameState, playerId: string): boolean {
  if (state.currentPhase === GamePhase.SpecialBuild) {
    return state.specialBuildOrder[state.specialBuildCurrentIndex] === playerId;
  }
  return getCurrentPlayer(state).id === playerId;
}

function resetTurnTimer(gameId: string, state: GameState): void {
  const seconds = state.config.turnTimerSeconds;
  if (state.currentPhase === GamePhase.GameOver) {
    state.turnDeadline = null;
    clearTurnTimer(gameId);
    return;
  }

  // Roll phase always gets a fixed 5-second timer
  if (state.currentPhase === GamePhase.RollDice) {
    const deadline = new Date(Date.now() + ROLL_TIMER_SECONDS * 1000).toISOString();
    state.turnDeadline = deadline;

    startTurnTimer(gameId, ROLL_TIMER_SECONDS * 1000, () => {
      const s = games.get(gameId);
      if (!s || s.currentPhase !== GamePhase.RollDice) return;
      const current = getCurrentPlayer(s);
      handleRollDice(current.id, gameId);
    });
    return;
  }

  // Move robber always gets a fixed 30-second timer
  if (state.currentPhase === GamePhase.MoveRobber) {
    const deadline = new Date(Date.now() + ROBBER_TIMER_SECONDS * 1000).toISOString();
    state.turnDeadline = deadline;

    startTurnTimer(gameId, ROBBER_TIMER_SECONDS * 1000, () => {
      const s = games.get(gameId);
      if (!s || s.currentPhase !== GamePhase.MoveRobber) return;
      const current = getCurrentPlayer(s);
      // If pending steal targets, pick randomly
      if (s.pendingStealTargets && s.pendingStealTargets.length > 0) {
        const victimId = s.pendingStealTargets[Math.floor(Math.random() * s.pendingStealTargets.length)];
        handleStealFrom(current.id, gameId, { victimId });
        return;
      }
      // Move robber to a random hex
      const validHexes = s.board.hexes
        .map(h => h.coord)
        .filter(c => !(c.q === s.robberPosition.q && c.r === s.robberPosition.r));
      if (validHexes.length > 0) {
        const target = validHexes[Math.floor(Math.random() * validHexes.length)];
        handleMoveRobber(current.id, gameId, { hex: target, victimId: undefined });
      }
    });
    return;
  }

  // Discard phase gets a fixed 15-second timer
  if (state.currentPhase === GamePhase.Discard) {
    const deadline = new Date(Date.now() + DISCARD_TIMER_SECONDS * 1000).toISOString();
    state.turnDeadline = deadline;

    startTurnTimer(gameId, DISCARD_TIMER_SECONDS * 1000, () => {
      const s = games.get(gameId);
      if (!s || s.currentPhase !== GamePhase.Discard) return;
      for (const pid of [...s.pendingDiscards]) {
        const player = s.players.find(p => p.id === pid);
        if (!player) continue;
        const count = Math.floor(totalCards(player.resources) / 2);
        autoDiscardRandom(player, count);
        s.pendingDiscards = s.pendingDiscards.filter(id => id !== pid);
        addLogEntry(s, { type: 'discard', message: 'Auto-discarded (time expired)', playerId: pid });
      }
      if (s.pendingDiscards.length === 0) {
        transitionPhase(s, GamePhase.MoveRobber);
      }
      broadcastAndCheckVictory(gameId, s);
      scheduleBotTurn(gameId);
    });
    return;
  }

  // Special build phase always gets a fixed 25-second timer
  if (state.currentPhase === GamePhase.SpecialBuild) {
    const deadline = new Date(Date.now() + SPECIAL_BUILD_TIMER_SECONDS * 1000).toISOString();
    state.turnDeadline = deadline;

    startTurnTimer(gameId, SPECIAL_BUILD_TIMER_SECONDS * 1000, () => {
      const s = games.get(gameId);
      if (!s || s.currentPhase !== GamePhase.SpecialBuild) return;
      const sbPlayerId = s.specialBuildOrder[s.specialBuildCurrentIndex];
      if (sbPlayerId) {
        advanceSpecialBuild(s);
        addLogEntry(s, { type: 'pass_special_build', message: 'Passed special build (timeout)', playerId: sbPlayerId });
        broadcastState(gameId, s);
        scheduleBotTurn(gameId);
      }
    });
    return;
  }

  if (!seconds || seconds <= 0) {
    state.turnDeadline = null;
    clearTurnTimer(gameId);
    return;
  }

  const deadline = new Date(Date.now() + seconds * 1000).toISOString();
  state.turnDeadline = deadline;

  startTurnTimer(gameId, seconds * 1000, () => {
    const s = games.get(gameId);
    if (!s || s.currentPhase === GamePhase.GameOver) return;

    const current = getCurrentPlayer(s);

    // Auto-action based on current phase
    if (s.currentPhase === GamePhase.TradeAndBuild) {
      handleEndTurn(current.id, gameId);
    } else {
      engineEndTurn(s);
      addLogEntry(s, { type: 'end_turn', message: 'Turn ended (timeout)', playerId: current.id });
      resetTurnTimer(gameId, s);
      broadcastState(gameId, s);
      scheduleBotTurn(gameId);
    }
  });
}

function createDevelopmentDeck(): DevelopmentCardType[] {
  const deck: DevelopmentCardType[] = [];
  for (const [type, count] of Object.entries(DEV_CARD_COUNTS)) {
    for (let i = 0; i < count; i++) {
      deck.push(type as DevelopmentCardType);
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.Red,
  PlayerColor.Blue,
  PlayerColor.White,
  PlayerColor.Orange,
  PlayerColor.Green,
  PlayerColor.Brown,
  PlayerColor.Purple,
  PlayerColor.Teal,
];

// ---------------------------------------------------------------------------
// initializeGame
// ---------------------------------------------------------------------------

export interface PlayerInit {
  id: string;
  name: string;
  color?: string;
  isBot?: boolean;
  botStrategy?: 'random' | 'greedy' | 'smart';
}

export function initializeGame(
  gameId: string,
  players: PlayerInit[],
  config: GameConfig,
): GameState {
  const board = generateBoard({ playerCount: players.length, mapType: config.mapType });

  const gamePlayers: Player[] = players.map((p, i) =>
    createPlayer(p.id, p.name, (p.color as PlayerColor) || PLAYER_COLORS[i % PLAYER_COLORS.length], p.isBot, p.botStrategy),
  );

  // Find desert hex for initial robber position
  const desertHex = board.hexes.find((h) => h.terrain === 'desert');
  const robberPosition: HexCoord = desertHex ? desertHex.coord : { q: 0, r: 0 };

  const state: GameState = {
    id: gameId,
    name: `Game ${gameId.slice(0, 8)}`,
    hostId: players[0].id,
    config,
    status: 'setup',
    board,
    players: gamePlayers,
    currentPlayerIndex: 0,
    currentPhase: GamePhase.SetupForward,
    robberPosition,
    developmentDeck: createDevelopmentDeck(),
    longestRoadHolder: null,
    longestRoadLength: 0,
    largestArmyHolder: null,
    largestArmySize: 0,
    dice: [0, 0],
    turnNumber: 0,
    setupRound: 1,
    setupAction: 'settlement',
    lastSetupSettlement: null,
    activeTradeOffers: [],
    pendingDiscards: [],
    pendingStealTargets: [],
    specialBuildOrder: [],
    specialBuildCurrentIndex: 0,
    specialBuildRequests: [],
    log: [],
    turnDeadline: null,
  };

  games.set(gameId, state);
  return state;
}

// ---------------------------------------------------------------------------
// Trade expiry timers
// ---------------------------------------------------------------------------

const tradeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleTradeExpiry(gameId: string, offerId: string, delayMs: number): void {
  // Clear any existing timer for this offer
  const key = `${gameId}:${offerId}`;
  const existing = tradeTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    tradeTimers.delete(key);
    const state = games.get(gameId);
    if (!state) return;
    const offer = state.activeTradeOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== 'open') return;
    offer.status = 'cancelled';
    state.activeTradeOffers = state.activeTradeOffers.filter(o => o.id !== offerId);
    addLogEntry(state, { type: 'trade_expired', message: 'trade offer expired', playerId: offer.fromPlayerId });
    broadcastState(gameId, state);
  }, delayMs);
  tradeTimers.set(key, timer);
}

function cancelTradeTimer(gameId: string, offerId: string): void {
  const key = `${gameId}:${offerId}`;
  const existing = tradeTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    tradeTimers.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Game action handlers
// ---------------------------------------------------------------------------

export function handleStartGame(
  playerId: string,
  payload: { gameId: string; players: PlayerInit[]; config: GameConfig },
): void {
  const { gameId, players: playerInits, config } = payload;
  if (games.has(gameId)) {
    sendError(playerId, 'Game already started');
    return;
  }

  const state = initializeGame(gameId, playerInits, config);
  addLogEntry(state, { type: 'game_start', message: 'Game started', playerId });
  broadcastState(gameId, state);
  scheduleBotTurn(gameId);
}

export function handleRollDice(playerId: string, gameId: string): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return sendError(playerId, 'Not your turn');
  if (state.currentPhase !== GamePhase.RollDice) return sendError(playerId, 'Cannot roll now');

  // Clear any pre-roll dev card tracking since the dice are now being rolled
  preDevCardPhase.delete(gameId);

  const dice = rollDice();
  state.dice = dice;
  const diceSum = dice[0] + dice[1];

  addLogEntry(state, { type: 'roll_dice', message: `Rolled ${diceSum}`, playerId, data: { dice } });

  if (diceSum === 7) {
    const mustDiscard = getPlayersWhoMustDiscard(state);
    if (mustDiscard.length > 0) {
      state.pendingDiscards = mustDiscard;
      transitionPhase(state, GamePhase.Discard);
    } else {
      transitionPhase(state, GamePhase.MoveRobber);
    }
  } else {
    const { distribution, blockedResources } = distributeResources(state, diceSum);
    for (const res of blockedResources) {
      addLogEntry(state, {
        type: 'bank_shortage',
        message: `Bank has no ${res} left — no ${res} distributed`,
        data: { resource: res },
      });
    }
    logDistribution(state, distribution);
    transitionPhase(state, GamePhase.TradeAndBuild);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

export function handlePlaceSettlement(
  playerId: string,
  gameId: string,
  payload: { vertex: VertexId },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const isSetup =
    state.currentPhase === GamePhase.SetupForward ||
    state.currentPhase === GamePhase.SetupReverse;

  if (isSetup) {
    if (state.setupAction !== 'settlement') return sendError(playerId, 'You need to place a road first');
    const error = handleSetupSettlement(state, playerId, payload.vertex);
    if (error) return sendError(playerId, error);
    distributeInitialResources(state, playerId, payload.vertex);
    state.setupAction = 'road';
    addLogEntry(state, { type: 'place_settlement', message: 'Settlement placed (setup)', playerId });
  } else {
    if (state.currentPhase !== GamePhase.TradeAndBuild && state.currentPhase !== GamePhase.SpecialBuild) {
      return sendError(playerId, 'Cannot build in this phase');
    }
    if (!isActivePlayer(state, playerId)) return sendError(playerId, 'Not your turn');

    const error = canPlaceSettlement(state, playerId, payload.vertex, false);
    if (error) return sendError(playerId, error);

    const player = state.players.find((p) => p.id === playerId)!;
    player.resources = subtractResources(player.resources, BUILDING_COSTS[BuildingType.Settlement]);
    state.board.vertexBuildings.set(vertexKey(payload.vertex), {
      type: BuildingType.Settlement,
      playerId,
    });
    player.settlementsBuilt += 1;

    // Check harbors
    for (const harbor of state.board.harbors) {
      const hVerts = harbor.vertices.map((v) => vertexKey(v));
      if (hVerts.includes(vertexKey(payload.vertex)) && !player.harbors.includes(harbor.type)) {
        player.harbors.push(harbor.type);
      }
    }

    updateLongestRoadHolder(state);
    addLogEntry(state, { type: 'place_settlement', message: 'Settlement placed', playerId, data: { cost: BUILDING_COSTS[BuildingType.Settlement] } });
  }

  // Update VP
  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
}

export function handlePlaceRoad(
  playerId: string,
  gameId: string,
  payload: { edge: EdgeId },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const isSetup =
    state.currentPhase === GamePhase.SetupForward ||
    state.currentPhase === GamePhase.SetupReverse;

  if (isSetup) {
    if (state.setupAction !== 'road') return sendError(playerId, 'You need to place a settlement first');
    const error = handleSetupRoad(state, playerId, payload.edge);
    if (error) return sendError(playerId, error);
    addLogEntry(state, { type: 'place_road', message: 'Road placed (setup)', playerId });
    advanceSetupPhase(state);
  } else {
    // Allow road placement during RollDice if Road Building was played pre-roll
    const freeRoadInfo = freeRoadsRemaining.get(gameId);
    const isFreeRoad = freeRoadInfo && freeRoadInfo.playerId === playerId && freeRoadInfo.remaining > 0;
    const allowedPhase = state.currentPhase === GamePhase.TradeAndBuild
      || state.currentPhase === GamePhase.SpecialBuild
      || (state.currentPhase === GamePhase.RollDice && (preDevCardPhase.has(gameId) || isFreeRoad));
    if (!allowedPhase && !isFreeRoad) {
      return sendError(playerId, 'Cannot build in this phase');
    }
    if (!isActivePlayer(state, playerId)) return sendError(playerId, 'Not your turn');

    const error = canPlaceRoad(state, playerId, payload.edge, !!isFreeRoad);
    if (error) return sendError(playerId, error);

    const player = state.players.find((p) => p.id === playerId)!;

    // Free road from Road Building: don't charge resources
    if (isFreeRoad) {
      freeRoadInfo.remaining -= 1;
      if (freeRoadInfo.remaining <= 0) {
        // Restore original phase
        if (freeRoadInfo.phaseBefore === GamePhase.RollDice) {
          state.currentPhase = GamePhase.RollDice;
        }
        freeRoadsRemaining.delete(gameId);
      }
    } else {
      player.resources = subtractResources(player.resources, BUILDING_COSTS[BuildingType.Road]);
    }

    state.board.edgeBuildings.set(edgeKey(payload.edge), {
      type: BuildingType.Road,
      playerId,
    });
    player.roadsBuilt += 1;

    updateLongestRoadHolder(state);
    addLogEntry(state, { type: 'place_road', message: isFreeRoad ? 'Road placed (free)' : 'Road placed', playerId, data: isFreeRoad ? undefined : { cost: BUILDING_COSTS[BuildingType.Road] } });
  }

  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

export function handlePlaceCity(
  playerId: string,
  gameId: string,
  payload: { vertex: VertexId },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  if (state.currentPhase !== GamePhase.TradeAndBuild && state.currentPhase !== GamePhase.SpecialBuild) {
    return sendError(playerId, 'Cannot build in this phase');
  }

  if (!isActivePlayer(state, playerId)) return sendError(playerId, 'Not your turn');

  const error = canPlaceCity(state, playerId, payload.vertex);
  if (error) return sendError(playerId, error);

  const player = state.players.find((p) => p.id === playerId)!;
  player.resources = subtractResources(player.resources, BUILDING_COSTS[BuildingType.City]);
  state.board.vertexBuildings.set(vertexKey(payload.vertex), {
    type: BuildingType.City,
    playerId,
  });
  player.citiesBuilt += 1;
  player.settlementsBuilt -= 1; // city replaces settlement

  addLogEntry(state, { type: 'place_city', message: 'City placed', playerId, data: { cost: BUILDING_COSTS[BuildingType.City] } });

  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
}

export function handleBuyDevCard(playerId: string, gameId: string): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const error = canBuyDevCard(state, playerId);
  if (error) return sendError(playerId, error);

  const cardType = executeBuyDevCard(state, playerId);
  addLogEntry(state, { type: 'buy_dev_card', message: 'Bought a development card', playerId, data: { cost: DEV_CARD_COST } });

  // Notify the buyer privately of their card
  hub.send(playerId, 'action_result', { success: true, type: 'buy_dev_card', cardType });

  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
}

export function handlePlayDevCard(
  playerId: string,
  gameId: string,
  payload: { cardType: DevelopmentCardType; params?: Record<string, unknown> },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const error = canPlayDevCard(state, playerId, payload.cardType);
  if (error) return sendError(playerId, error);

  // Remember the phase before playing so we can return to it (e.g. RollDice)
  const phaseBefore = state.currentPhase;

  switch (payload.cardType) {
    case DevelopmentCardType.Knight: {
      executePlayKnight(state, playerId); // sets phase to MoveRobber
      updateLargestArmyHolder(state);
      addLogEntry(state, { type: 'play_dev_card', message: 'Played Knight', playerId });
      // If played before rolling, remember so robber resolution returns to RollDice
      if (phaseBefore === GamePhase.RollDice) {
        preDevCardPhase.set(gameId, phaseBefore);
      }
      break;
    }
    case DevelopmentCardType.RoadBuilding: {
      const freeRoads = executeRoadBuilding(state, playerId);
      addLogEntry(state, {
        type: 'play_dev_card',
        message: `Played Road Building (${freeRoads} roads)`,
        playerId,
      });
      // Track free road placements
      freeRoadsRemaining.set(gameId, { playerId, remaining: freeRoads, phaseBefore });
      break;
    }
    case DevelopmentCardType.YearOfPlenty: {
      const resource1 = payload.params?.resource1 as ResourceType;
      const resource2 = payload.params?.resource2 as ResourceType;
      if (!resource1 || !resource2) return sendError(playerId, 'Must specify two resources');
      executeYearOfPlenty(state, playerId, resource1, resource2);
      // Log as distribute so the animation fires (cards from bank to hand)
      const yopResources: Record<string, number> = { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
      yopResources[resource1] = (yopResources[resource1] || 0) + 1;
      yopResources[resource2] = (yopResources[resource2] || 0) + 1;
      addLogEntry(state, {
        type: 'distribute',
        message: `Year of Plenty: received ${resource1}, ${resource2}`,
        playerId,
        data: { resources: yopResources },
      });
      if (phaseBefore === GamePhase.RollDice) {
        state.currentPhase = GamePhase.RollDice;
      }
      break;
    }
    case DevelopmentCardType.Monopoly: {
      const resourceType = payload.params?.resourceType as ResourceType;
      if (!resourceType) return sendError(playerId, 'Must specify a resource type');
      // Capture per-player amounts before monopoly zeroes them
      const perPlayer: Record<string, number> = {};
      for (const other of state.players) {
        if (other.id === playerId) continue;
        const amount = other.resources[resourceType];
        if (amount > 0) perPlayer[other.id] = amount;
      }
      const stolen = executeMonopoly(state, playerId, resourceType);
      addLogEntry(state, {
        type: 'monopoly',
        message: `Played Monopoly on ${resourceType}, took ${stolen}`,
        playerId,
        data: { resourceType, perPlayer, total: stolen },
      });
      if (phaseBefore === GamePhase.RollDice) {
        state.currentPhase = GamePhase.RollDice;
      }
      break;
    }
    default:
      return sendError(playerId, 'Unknown dev card type');
  }

  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
}

export function handleMoveRobber(
  playerId: string,
  gameId: string,
  payload: { hex: HexCoord; victimId?: string },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  if (state.currentPhase !== GamePhase.MoveRobber) return sendError(playerId, 'Cannot move robber now');

  const error = canMoveRobber(state, playerId, payload.hex);
  if (error) return sendError(playerId, error);

  executeRobberMove(state, payload.hex);
  addLogEntry(state, { type: 'move_robber', message: 'Robber moved', playerId });

  // Get steal targets (other players with buildings adjacent to the new robber hex who have cards)
  const targets = getStealTargets(state, payload.hex);
  console.log('[ROBBER] Moved to', payload.hex, 'targets:', targets, 'buildings:', state.board.vertexBuildings.size);

  if (targets.length === 0) {
    // No one to steal from — proceed
    finishRobberPhase(gameId, state);
  } else if (targets.length === 1) {
    // Only one target — auto-steal
    const stolenResource = executeSteal(state, targets[0], playerId);
    if (stolenResource) {
      const victimName = state.players.find(p => p.id === targets[0])?.name || 'Unknown';
      addLogEntry(state, {
        type: 'steal',
        message: `Stole a resource from ${victimName}`,
        playerId,
        data: { victimId: targets[0], resource: stolenResource },
      });
    }
    finishRobberPhase(gameId, state);
  } else {
    // Multiple targets — player must choose
    state.pendingStealTargets = targets;
    broadcastState(gameId, state);
    scheduleBotTurn(gameId);
    return; // Stay in MoveRobber phase until steal_from is received
  }
}

export function handleStealFrom(
  playerId: string,
  gameId: string,
  payload: { victimId: string },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return sendError(playerId, 'Not your turn');
  if (!state.pendingStealTargets || state.pendingStealTargets.length === 0) {
    return sendError(playerId, 'No pending steal');
  }
  if (!state.pendingStealTargets.includes(payload.victimId)) {
    return sendError(playerId, 'Invalid steal target');
  }

  const stolenResource = executeSteal(state, payload.victimId, playerId);
  if (stolenResource) {
    const victimName = state.players.find(p => p.id === payload.victimId)?.name || 'Unknown';
    addLogEntry(state, {
      type: 'steal',
      message: `Stole a resource from ${victimName}`,
      playerId,
      data: { victimId: payload.victimId, resource: stolenResource },
    });
  }
  state.pendingStealTargets = [];
  finishRobberPhase(gameId, state);
}

function finishRobberPhase(gameId: string, state: GameState): void {
  // If a dev card (knight) was played before rolling, return to RollDice
  const savedPhase = preDevCardPhase.get(gameId);
  if (savedPhase === GamePhase.RollDice) {
    preDevCardPhase.delete(gameId);
    transitionPhase(state, GamePhase.RollDice);
  } else {
    transitionPhase(state, GamePhase.TradeAndBuild);
  }
  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

export function handleDiscardCards(
  playerId: string,
  gameId: string,
  payload: { resources: Resources },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  if (state.currentPhase !== GamePhase.Discard) return sendError(playerId, 'Not in discard phase');
  if (!state.pendingDiscards.includes(playerId)) return sendError(playerId, 'You do not need to discard');

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return sendError(playerId, 'Player not found');

  const error = validateDiscard(player, payload.resources);
  if (error) return sendError(playerId, error);

  executeDiscard(player, payload.resources);
  state.pendingDiscards = state.pendingDiscards.filter((id) => id !== playerId);
  addLogEntry(state, { type: 'discard', message: 'Discarded cards', playerId, data: { resources: payload.resources } });

  // If all pending discards are done, transition to robber
  if (state.pendingDiscards.length === 0) {
    transitionPhase(state, GamePhase.MoveRobber);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

export function handleTradeOffer(
  playerId: string,
  gameId: string,
  payload: { offering: Resources; requesting: Resources; openToOffers?: boolean },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const error = canProposeTrade(state, playerId);
  if (error) return sendError(playerId, error);

  const player = state.players.find((p) => p.id === playerId)!;
  if (!hasResources(player.resources, payload.offering)) {
    return sendError(playerId, 'Insufficient resources for trade offer');
  }

  const isOpen = payload.openToOffers ?? false;

  const TRADE_RESPONSE_TTL = 12_000; // 12 seconds for others to respond

  const offer: TradeOffer = {
    id: uuidv4(),
    fromPlayerId: playerId,
    offering: payload.offering,
    requesting: payload.requesting,
    openToOffers: isOpen,
    responses: {},
    counterOffers: {},
    status: 'open',
    expiresAt: Date.now() + TRADE_RESPONSE_TTL,
  };

  state.activeTradeOffers.push(offer);

  // Human-readable log entry
  const fmtRes = (r: Resources) => Object.entries(r).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
  const requestStr = isOpen && Object.values(offer.requesting).every(v => v === 0) ? '(open to offers)' : fmtRes(offer.requesting);
  addLogEntry(state, { type: 'trade_offer', message: `offers ${fmtRes(offer.offering)} for ${requestStr}`, playerId });

  hub.broadcast(gameId, 'trade_proposed', { offer });
  broadcastState(gameId, state);

  // Auto-expire trade after TTL
  scheduleTradeExpiry(gameId, offer.id, TRADE_RESPONSE_TTL);

  // Bot auto-responses (after a delay) — bots only accept non-open trades
  setTimeout(() => {
    const s = games.get(gameId);
    if (!s) return;
    const o = s.activeTradeOffers.find(t => t.id === offer.id);
    if (!o || o.status !== 'open') return;

    for (const bot of s.players.filter(p => p.isBot && p.id !== playerId && p.status !== 'quit' as never)) {
      if (isOpen) {
        // Bots decline open-to-offers trades
        o.responses[bot.id] = 'decline';
        addLogEntry(s, { type: 'trade_decline', message: 'declined the trade', playerId: bot.id });
        continue;
      }
      // Simple bot trade logic: accept if bot has the requested resources and it's a fair-ish trade
      if (hasResources(bot.resources, offer.requesting)) {
        // Greedy: accept if giving fewer or equal total cards than receiving
        const giveTotal = Object.values(offer.requesting).reduce((a, b) => a + b, 0);
        const getTotal = Object.values(offer.offering).reduce((a, b) => a + b, 0);
        if (getTotal >= giveTotal) {
          o.responses[bot.id] = 'accept';
          addLogEntry(s, { type: 'trade_accept', message: 'wants to trade', playerId: bot.id });
          continue;
        }
      }
      // Otherwise decline
      o.responses[bot.id] = 'decline';
      addLogEntry(s, { type: 'trade_decline', message: 'declined the trade', playerId: bot.id });
    }
    broadcastState(gameId, s);

    // Check if all other players have declined — auto-remove after 2s
    const otherPlayers = s.players.filter(p => p.id !== playerId && p.status !== 'quit' as never);
    const allDeclined = otherPlayers.length > 0 && otherPlayers.every(p => o.responses[p.id] === 'decline');
    if (allDeclined) {
      o.expiresAt = Date.now() + 2_000;
      scheduleTradeExpiry(gameId, offer.id, 2_000);
      broadcastState(gameId, s);
    }
  }, 1500);
}

export function handleTradeRespond(
  playerId: string,
  gameId: string,
  payload: { offerId: string; response: 'accept' | 'decline' | 'counter'; counter?: { offering: Resources; requesting: Resources } },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const offer = state.activeTradeOffers.find((o) => o.id === payload.offerId);
  if (!offer || offer.status !== 'open') return sendError(playerId, 'Trade offer not found or closed');
  if (offer.fromPlayerId === playerId) return sendError(playerId, 'Cannot respond to your own offer');

  // Block accept on open-to-offers trades — only counter or decline allowed
  if (payload.response === 'accept' && offer.openToOffers) {
    return sendError(playerId, 'This trade is open to offers. You can only counter-offer or decline.');
  }

  offer.responses[playerId] = payload.response;

  if (payload.response === 'accept') {
    // Validate the accepting player has the required resources
    const toPlayer = state.players.find((p) => p.id === playerId);
    if (!toPlayer) return sendError(playerId, 'Player not found');
    if (!hasResources(toPlayer.resources, offer.requesting)) {
      return sendError(playerId, 'You do not have sufficient resources to accept');
    }

    // Extend TTL to 30s for initiator to confirm
    const TRADE_CONFIRM_TTL = 30_000;
    offer.expiresAt = Date.now() + TRADE_CONFIRM_TTL;
    scheduleTradeExpiry(gameId, offer.id, TRADE_CONFIRM_TTL);

    addLogEntry(state, { type: 'trade_accept', message: 'wants to trade', playerId });
  } else if (payload.response === 'counter' && payload.counter) {
    offer.counterOffers[playerId] = payload.counter;
    addLogEntry(state, { type: 'trade_counter', message: 'made a counter-offer', playerId });
    // Reset the trade timer to 15s on counter-offer
    const COUNTER_TTL = 15_000;
    scheduleTradeExpiry(gameId, offer.id, COUNTER_TTL);
  } else if (payload.response === 'decline') {
    addLogEntry(state, { type: 'trade_decline', message: 'declined the trade', playerId });
  }

  // Check if all other players have declined — auto-remove after 2s
  const otherPlayers = state.players.filter(p => p.id !== offer.fromPlayerId && p.status !== 'quit' as never);
  const allDeclined = otherPlayers.length > 0 && otherPlayers.every(p => offer.responses[p.id] === 'decline');
  if (allDeclined) {
    scheduleTradeExpiry(gameId, offer.id, 2_000);
    offer.expiresAt = Date.now() + 2_000;
  }

  broadcastState(gameId, state);
}

export function handleTradeConfirm(
  playerId: string,
  gameId: string,
  payload: { offerId: string; withPlayerId: string },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const offer = state.activeTradeOffers.find((o) => o.id === payload.offerId);
  if (!offer || offer.status !== 'open') return sendError(playerId, 'Trade offer not found or closed');
  if (offer.fromPlayerId !== playerId) return sendError(playerId, 'Only the trade initiator can confirm');

  const acceptedResponse = offer.responses[payload.withPlayerId];
  const isCounter = acceptedResponse === 'counter' && offer.counterOffers[payload.withPlayerId];
  if (acceptedResponse !== 'accept' && !isCounter) return sendError(playerId, 'That player has not accepted or counter-offered');

  // For counter-offers, use the counter terms (their offering = what initiator receives, their requesting = what initiator gives)
  const tradeOffering = isCounter ? offer.counterOffers[payload.withPlayerId].requesting : offer.offering;
  const tradeRequesting = isCounter ? offer.counterOffers[payload.withPlayerId].offering : offer.requesting;

  // Re-validate both players have resources before executing
  const fromPlayer = state.players.find((p) => p.id === offer.fromPlayerId);
  const toPlayer = state.players.find((p) => p.id === payload.withPlayerId);
  if (!fromPlayer || !toPlayer) return sendError(playerId, 'Player not found');
  if (!hasResources(fromPlayer.resources, tradeOffering))
    return sendError(playerId, 'You no longer have sufficient resources');
  if (!hasResources(toPlayer.resources, tradeRequesting))
    return sendError(playerId, 'That player no longer has sufficient resources');

  const tradeError = executeTrade(state, offer.fromPlayerId, payload.withPlayerId, tradeOffering, tradeRequesting);
  if (tradeError) return sendError(playerId, tradeError);
  offer.status = 'completed';
  const fromName = fromPlayer.name || 'Unknown';
  const toName = toPlayer.name || 'Unknown';
  const fmtR = (r: Resources) => Object.entries(r).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
  addLogEntry(state, {
    type: 'trade_completed',
    message: `${fromName} traded ${fmtR(tradeOffering)} with ${toName} for ${fmtR(tradeRequesting)}`,
    data: {
      fromPlayerId: offer.fromPlayerId,
      toPlayerId: payload.withPlayerId,
      offering: tradeOffering,
      requesting: tradeRequesting,
    },
  });
  hub.broadcast(gameId, 'trade_completed', { offerId: offer.id, acceptedBy: payload.withPlayerId });
  cancelTradeTimer(gameId, offer.id);
  // Remove completed offer from active list
  state.activeTradeOffers = state.activeTradeOffers.filter(o => o.id !== offer.id);
  broadcastState(gameId, state);
}

export function handleTradeCancel(
  playerId: string,
  gameId: string,
  payload: { offerId: string },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const offer = state.activeTradeOffers.find((o) => o.id === payload.offerId);
  if (!offer || offer.status !== 'open') return sendError(playerId, 'Trade offer not found or closed');
  if (offer.fromPlayerId !== playerId) return sendError(playerId, 'Only the trade initiator can cancel');

  offer.status = 'cancelled';
  cancelTradeTimer(gameId, offer.id);
  addLogEntry(state, { type: 'trade_cancel', message: 'cancelled the trade offer', playerId });
  // Remove cancelled offer from active list
  state.activeTradeOffers = state.activeTradeOffers.filter(o => o.id !== offer.id);
  broadcastState(gameId, state);
}

export function handleTradeWithBank(
  playerId: string,
  gameId: string,
  payload: { giving: ResourceType; givingCount: number; receiving: ResourceType },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const error = canTradeWithBank(state, playerId, payload.giving, payload.givingCount, payload.receiving);
  if (error) return sendError(playerId, error);

  executeTradeWithBank(state, playerId, payload.giving, payload.givingCount, payload.receiving);
  addLogEntry(state, {
    type: 'trade_bank',
    message: `Bank trade: ${payload.givingCount} ${payload.giving} → 1 ${payload.receiving}`,
    playerId,
    data: { giving: payload.giving, givingCount: payload.givingCount, receiving: payload.receiving },
  });

  broadcastAndCheckVictory(gameId, state);
}

export function handleEndTurn(playerId: string, gameId: string): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return sendError(playerId, 'Not your turn');
  if (state.currentPhase !== GamePhase.TradeAndBuild) return sendError(playerId, 'Cannot end turn now');

  engineEndTurn(state);
  addLogEntry(state, { type: 'end_turn', message: 'Turn ended', playerId });

  broadcastState(gameId, state);
  scheduleBotTurn(gameId);
}

export function handlePassSpecialBuild(playerId: string, gameId: string): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  if (state.currentPhase !== GamePhase.SpecialBuild) return sendError(playerId, 'Not in special build phase');

  const expectedPlayerId = state.specialBuildOrder[state.specialBuildCurrentIndex];
  if (expectedPlayerId !== playerId) return sendError(playerId, 'Not your turn to special build');

  advanceSpecialBuild(state);
  addLogEntry(state, { type: 'pass_special_build', message: 'Passed special build', playerId });

  broadcastState(gameId, state);
  scheduleBotTurn(gameId);
}

export function handleRequestSpecialBuild(playerId: string, gameId: string): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  if (state.players.length < 5) return sendError(playerId, 'Special build requires 5+ players');

  const current = getCurrentPlayer(state);
  if (current.id === playerId) return sendError(playerId, 'Active player cannot request special build');

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.status === PlayerStatus.Quit) return sendError(playerId, 'Player not found');

  if (state.specialBuildRequests.includes(playerId)) return; // already requested

  state.specialBuildRequests.push(playerId);
  addLogEntry(state, { type: 'request_special_build', message: 'Requested special build', playerId });
  broadcastState(gameId, state);
}

export function handleCancelSpecialBuild(playerId: string, gameId: string): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const idx = state.specialBuildRequests.indexOf(playerId);
  if (idx === -1) return; // not requested

  state.specialBuildRequests.splice(idx, 1);
  broadcastState(gameId, state);
}

// ---------------------------------------------------------------------------
// Dev/debug actions (development only)
// ---------------------------------------------------------------------------

export function handleDevGiveResources(
  playerId: string,
  gameId: string,
  payload: { resources: Partial<Resources>; targetPlayerId?: string },
): void {
  if (process.env.NODE_ENV === 'production') return sendError(playerId, 'Not available');
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  const targetId = payload.targetPlayerId || playerId;
  const player = state.players.find((p) => p.id === targetId);
  if (!player) return sendError(playerId, 'Player not found');

  const toAdd: Resources = {
    brick: Math.max(0, payload.resources.brick ?? 0),
    lumber: Math.max(0, payload.resources.lumber ?? 0),
    ore: Math.max(0, payload.resources.ore ?? 0),
    grain: Math.max(0, payload.resources.grain ?? 0),
    wool: Math.max(0, payload.resources.wool ?? 0),
  };
  player.resources = addResources(player.resources, toAdd);
  // Use distribute log entry to trigger resource animations
  addLogEntry(state, {
    type: 'distribute',
    message: `received ${Object.entries(toAdd).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ')} [DEV]`,
    playerId: targetId,
    data: { resources: toAdd },
  });
  broadcastAndCheckVictory(gameId, state);
}

export function handleDevGiveDevCard(
  playerId: string,
  gameId: string,
  payload: { cardType: string },
): void {
  if (process.env.NODE_ENV === 'production') return sendError(playerId, 'Not available');
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return sendError(playerId, 'Player not found');

  const validTypes = ['knight', 'victory_point', 'road_building', 'year_of_plenty', 'monopoly'];
  if (!validTypes.includes(payload.cardType)) return sendError(playerId, 'Invalid card type');

  player.developmentCards.push({
    type: payload.cardType as DevelopmentCardType,
    turnPurchased: state.turnNumber,
  });
  addLogEntry(state, { type: 'chat', message: `[DEV] Gave self ${payload.cardType}`, playerId });

  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
}

// ---------------------------------------------------------------------------
// Dev: Force a 7 roll
// ---------------------------------------------------------------------------

export function handleDevRollSeven(playerId: string, gameId: string): void {
  if (process.env.NODE_ENV === 'production') return sendError(playerId, 'Not available');
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');
  if (state.currentPhase !== GamePhase.RollDice) return sendError(playerId, 'Cannot roll now');

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return sendError(playerId, 'Not your turn');

  preDevCardPhase.delete(gameId);
  state.dice = [4, 3];
  addLogEntry(state, { type: 'roll_dice', message: 'Rolled 7 [DEV]', playerId, data: { dice: [4, 3] } });

  const mustDiscard = getPlayersWhoMustDiscard(state);
  if (mustDiscard.length > 0) {
    state.pendingDiscards = mustDiscard;
    transitionPhase(state, GamePhase.Discard);
  } else {
    transitionPhase(state, GamePhase.MoveRobber);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

// ---------------------------------------------------------------------------
// Bot auto-play
// ---------------------------------------------------------------------------

const botTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleBotTurn(gameId: string): void {
  // Clear any existing timer
  const existing = botTimers.get(gameId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    botTimers.delete(gameId);
    processBotTurn(gameId);
  }, 1000);
  botTimers.set(gameId, timer);
}

export function processBotTurn(gameId: string): void {
  const state = games.get(gameId);
  if (!state) return;
  if (state.currentPhase === GamePhase.GameOver) return;

  // In discard phase, auto-discard for all bot players that still need to discard
  if (state.currentPhase === GamePhase.Discard) {
    const botDiscards = state.pendingDiscards.filter((pid) => {
      const p = state.players.find((pl) => pl.id === pid);
      return p?.isBot;
    });
    if (botDiscards.length > 0) {
      for (const botId of botDiscards) {
        const bot = state.players.find((p) => p.id === botId);
        if (!bot) continue;
        const discardCount = Math.floor(totalCards(bot.resources) / 2);
        autoDiscardRandom(bot, discardCount);
        state.pendingDiscards = state.pendingDiscards.filter((id) => id !== botId);
        addLogEntry(state, { type: 'discard', message: 'Discarded cards (bot)', playerId: botId });
      }
      if (state.pendingDiscards.length === 0) {
        transitionPhase(state, GamePhase.MoveRobber);
      }
      broadcastAndCheckVictory(gameId, state);
      // Schedule another bot turn in case the current player (robber mover) is a bot
      scheduleBotTurn(gameId);
      return;
    }
    // Remaining discards are human players — wait
    return;
  }

  // In special build phase, check if the current special-build player is a bot
  if (state.currentPhase === GamePhase.SpecialBuild) {
    const sbPlayerId = state.specialBuildOrder[state.specialBuildCurrentIndex];
    if (!sbPlayerId) return;
    const sbPlayer = state.players.find((p) => p.id === sbPlayerId);
    if (!sbPlayer?.isBot) return;

    // Bot just passes special build
    advanceSpecialBuild(state);
    addLogEntry(state, { type: 'pass_special_build', message: 'Passed special build (bot)', playerId: sbPlayerId });
    broadcastState(gameId, state);
    scheduleBotTurn(gameId);
    return;
  }

  const current = getCurrentPlayer(state);
  if (!current.isBot) return;

  switch (state.currentPhase) {
    case GamePhase.SetupForward:
    case GamePhase.SetupReverse:
      botSetupTurn(gameId, state, current);
      break;
    case GamePhase.RollDice:
      botRollDice(gameId, state, current);
      break;
    case GamePhase.MoveRobber:
      botMoveRobber(gameId, state, current);
      break;
    case GamePhase.TradeAndBuild:
      botTradeAndBuild(gameId, state, current);
      break;
    default:
      break;
  }
}

function botSetupTurn(gameId: string, state: GameState, bot: Player): void {
  // Place a settlement at a random valid location
  const validSettlements = getValidSettlementLocations(state, bot.id, true);
  if (validSettlements.length === 0) return;

  const settlement = validSettlements[Math.floor(Math.random() * validSettlements.length)];
  const sError = handleSetupSettlement(state, bot.id, settlement);
  if (sError) return;

  if (state.currentPhase === GamePhase.SetupReverse) {
    distributeInitialResources(state, bot.id, settlement);
  }
  state.setupAction = 'road';
  addLogEntry(state, { type: 'place_settlement', message: 'Settlement placed (setup, bot)', playerId: bot.id });

  // Place a road adjacent to the settlement just placed
  const adjEdges = vertexAdjacentEdges(settlement);
  const validRoads = adjEdges.filter(e => {
    const key = edgeKey(e);
    return !state.board.edgeBuildings.has(key);
  });

  // Shuffle and try each valid road until one succeeds (some may be on water)
  for (let i = validRoads.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validRoads[i], validRoads[j]] = [validRoads[j], validRoads[i]];
  }

  let roadPlaced = false;
  for (const road of validRoads) {
    const rError = handleSetupRoad(state, bot.id, road);
    if (!rError) {
      addLogEntry(state, { type: 'place_road', message: 'Road placed (setup, bot)', playerId: bot.id });
      roadPlaced = true;
      break;
    }
  }

  if (!roadPlaced) {
    // Fallback: no valid road found — still advance to prevent hanging
    addLogEntry(state, { type: 'chat', message: '[BOT] Could not place road during setup', playerId: bot.id });
  }

  advanceSetupPhase(state);

  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

function botRollDice(gameId: string, state: GameState, bot: Player): void {
  const dice = rollDice();
  state.dice = dice;
  const diceSum = dice[0] + dice[1];

  addLogEntry(state, { type: 'roll_dice', message: `Rolled ${diceSum} (bot)`, playerId: bot.id, data: { dice } });

  if (diceSum === 7) {
    const mustDiscard = getPlayersWhoMustDiscard(state);
    if (mustDiscard.length > 0) {
      state.pendingDiscards = mustDiscard;
      transitionPhase(state, GamePhase.Discard);
    } else {
      transitionPhase(state, GamePhase.MoveRobber);
    }
  } else {
    const { distribution, blockedResources } = distributeResources(state, diceSum);
    for (const res of blockedResources) {
      addLogEntry(state, {
        type: 'bank_shortage',
        message: `Bank has no ${res} left — no ${res} distributed`,
        data: { resource: res },
      });
    }
    logDistribution(state, distribution);
    transitionPhase(state, GamePhase.TradeAndBuild);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

function botMoveRobber(gameId: string, state: GameState, bot: Player): void {
  // If there are pending steal targets (from a prior move), pick randomly
  if (state.pendingStealTargets && state.pendingStealTargets.length > 0) {
    const victimId = state.pendingStealTargets[Math.floor(Math.random() * state.pendingStealTargets.length)];
    const stolenResource = executeSteal(state, victimId, bot.id);
    if (stolenResource) {
      addLogEntry(state, { type: 'steal', message: 'Stole a resource (bot)', playerId: bot.id, data: { victimId } });
    }
    state.pendingStealTargets = [];
    finishRobberPhase(gameId, state);
    return;
  }

  // Pick a random hex that isn't the current robber position
  const validHexes = state.board.hexes.filter(
    (h) => !hexEquals(h.coord, state.robberPosition),
  );
  if (validHexes.length === 0) return;

  const targetHex = validHexes[Math.floor(Math.random() * validHexes.length)].coord;
  executeRobberMove(state, targetHex);
  addLogEntry(state, { type: 'move_robber', message: 'Robber moved (bot)', playerId: bot.id });

  // Steal from a random adjacent player
  const targets = getStealTargets(state, targetHex);
  if (targets.length > 0) {
    const victimId = targets[Math.floor(Math.random() * targets.length)];
    const stolenResource = executeSteal(state, victimId, bot.id);
    if (stolenResource) {
      addLogEntry(state, {
        type: 'steal',
        message: 'Stole a resource (bot)',
        playerId: bot.id,
        data: { victimId },
      });
    }
  }

  state.pendingStealTargets = [];
  finishRobberPhase(gameId, state);
}

function botTradeAndBuild(gameId: string, state: GameState, bot: Player): void {
  let built = false;

  // Greedy: city > settlement > road > dev card
  // Try to upgrade a settlement to a city
  if (hasResources(bot.resources, BUILDING_COSTS[BuildingType.City])) {
    for (const [key, building] of state.board.vertexBuildings) {
      if (building.playerId === bot.id && building.type === BuildingType.Settlement) {
        const parts = key.split(',');
        if (parts.length !== 3) continue;
        const vertex: VertexId = {
          hex: { q: parseInt(parts[0], 10), r: parseInt(parts[1], 10) },
          direction: parts[2] as VertexId['direction'],
        };
        const err = canPlaceCity(state, bot.id, vertex);
        if (!err) {
          bot.resources = subtractResources(bot.resources, BUILDING_COSTS[BuildingType.City]);
          state.board.vertexBuildings.set(key, { type: BuildingType.City, playerId: bot.id });
          bot.citiesBuilt += 1;
          bot.settlementsBuilt -= 1;
          addLogEntry(state, { type: 'place_city', message: 'City placed (bot)', playerId: bot.id });
          built = true;
          break;
        }
      }
    }
  }

  // Try to build a settlement
  if (!built && hasResources(bot.resources, BUILDING_COSTS[BuildingType.Settlement])) {
    const validSettlements = getValidSettlementLocations(state, bot.id, false);
    if (validSettlements.length > 0) {
      const vertex = validSettlements[Math.floor(Math.random() * validSettlements.length)];
      bot.resources = subtractResources(bot.resources, BUILDING_COSTS[BuildingType.Settlement]);
      state.board.vertexBuildings.set(vertexKey(vertex), { type: BuildingType.Settlement, playerId: bot.id });
      bot.settlementsBuilt += 1;
      // Check harbors
      for (const harbor of state.board.harbors) {
        const hVerts = harbor.vertices.map((v) => vertexKey(v));
        if (hVerts.includes(vertexKey(vertex)) && !bot.harbors.includes(harbor.type)) {
          bot.harbors.push(harbor.type);
        }
      }
      updateLongestRoadHolder(state);
      addLogEntry(state, { type: 'place_settlement', message: 'Settlement placed (bot)', playerId: bot.id });
      built = true;
    }
  }

  // Try to build a road
  if (!built && hasResources(bot.resources, BUILDING_COSTS[BuildingType.Road])) {
    const validRoads = getValidRoadLocations(state, bot.id, false);
    if (validRoads.length > 0) {
      const edge = validRoads[Math.floor(Math.random() * validRoads.length)];
      bot.resources = subtractResources(bot.resources, BUILDING_COSTS[BuildingType.Road]);
      state.board.edgeBuildings.set(edgeKey(edge), { type: BuildingType.Road, playerId: bot.id });
      bot.roadsBuilt += 1;
      updateLongestRoadHolder(state);
      addLogEntry(state, { type: 'place_road', message: 'Road placed (bot)', playerId: bot.id });
      built = true;
    }
  }

  // Try to buy a dev card
  if (!built && canBuyDevCard(state, bot.id) === null) {
    executeBuyDevCard(state, bot.id);
    addLogEntry(state, { type: 'buy_dev_card', message: 'Bought a development card (bot)', playerId: bot.id });
    built = true;
  }

  // End turn
  for (const p of state.players) {
    p.victoryPoints = calculateVictoryPoints(state, p.id);
  }

  engineEndTurn(state);
  addLogEntry(state, { type: 'end_turn', message: 'Turn ended (bot)', playerId: bot.id });

  broadcastState(gameId, state);
  scheduleBotTurn(gameId);
}
