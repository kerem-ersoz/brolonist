import { v4 as uuidv4 } from 'uuid';
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
} from '@brolonist/shared';

import { hub } from './hub.js';
import { filterStateForPlayer } from './sync.js';

// ---------------------------------------------------------------------------
// In-memory game state store
// ---------------------------------------------------------------------------

const games = new Map<string, GameState>();

export function getGame(gameId: string): GameState | undefined {
  return games.get(gameId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendError(playerId: string, message: string): void {
  hub.send(playerId, 'error', { code: 'GAME_ERROR', message });
}

function broadcastState(gameId: string, state: GameState): void {
  const members = hub.getRoomMembers(gameId);
  for (const pid of members) {
    hub.send(pid, 'game_state', filterStateForPlayer(state, pid));
  }
}

function broadcastAndCheckVictory(gameId: string, state: GameState): void {
  broadcastState(gameId, state);
  const winnerId = checkVictoryCondition(state);
  if (winnerId) {
    state.currentPhase = GamePhase.GameOver;
    state.status = 'finished';
    const winner = state.players.find((p) => p.id === winnerId);
    hub.broadcast(gameId, 'game_ended', {
      winnerId,
      winnerName: winner?.name ?? 'Unknown',
      victoryPoints: calculateVictoryPoints(state, winnerId),
    });
  }
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
    createPlayer(p.id, p.name, PLAYER_COLORS[i % PLAYER_COLORS.length], p.isBot, p.botStrategy),
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
    activeTradeOffers: [],
    pendingDiscards: [],
    specialBuildOrder: [],
    specialBuildCurrentIndex: 0,
    log: [],
  };

  games.set(gameId, state);
  return state;
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
    const distribution = distributeResources(state, diceSum);
    addLogEntry(state, { type: 'distribute', message: 'Resources distributed', data: { distribution } });
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
    const current = getCurrentPlayer(state);
    if (current.id !== playerId) return sendError(playerId, 'Not your turn');

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
    addLogEntry(state, { type: 'place_settlement', message: 'Settlement placed', playerId });
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
    if (state.currentPhase !== GamePhase.TradeAndBuild && state.currentPhase !== GamePhase.SpecialBuild) {
      return sendError(playerId, 'Cannot build in this phase');
    }
    const current = getCurrentPlayer(state);
    if (current.id !== playerId) return sendError(playerId, 'Not your turn');

    const error = canPlaceRoad(state, playerId, payload.edge, false);
    if (error) return sendError(playerId, error);

    const player = state.players.find((p) => p.id === playerId)!;
    player.resources = subtractResources(player.resources, BUILDING_COSTS[BuildingType.Road]);
    state.board.edgeBuildings.set(edgeKey(payload.edge), {
      type: BuildingType.Road,
      playerId,
    });
    player.roadsBuilt += 1;

    updateLongestRoadHolder(state);
    addLogEntry(state, { type: 'place_road', message: 'Road placed', playerId });
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

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) return sendError(playerId, 'Not your turn');

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

  addLogEntry(state, { type: 'place_city', message: 'City placed', playerId });

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
  addLogEntry(state, { type: 'buy_dev_card', message: 'Bought a development card', playerId });

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

  switch (payload.cardType) {
    case DevelopmentCardType.Knight: {
      executePlayKnight(state, playerId);
      updateLargestArmyHolder(state);
      addLogEntry(state, { type: 'play_dev_card', message: 'Played Knight', playerId });
      break;
    }
    case DevelopmentCardType.RoadBuilding: {
      const freeRoads = executeRoadBuilding(state, playerId);
      addLogEntry(state, {
        type: 'play_dev_card',
        message: `Played Road Building (${freeRoads} roads)`,
        playerId,
      });
      hub.send(playerId, 'action_result', { success: true, type: 'play_dev_card', freeRoads });
      break;
    }
    case DevelopmentCardType.YearOfPlenty: {
      const resource1 = payload.params?.resource1 as ResourceType;
      const resource2 = payload.params?.resource2 as ResourceType;
      if (!resource1 || !resource2) return sendError(playerId, 'Must specify two resources');
      executeYearOfPlenty(state, playerId, resource1, resource2);
      addLogEntry(state, { type: 'play_dev_card', message: 'Played Year of Plenty', playerId });
      break;
    }
    case DevelopmentCardType.Monopoly: {
      const resourceType = payload.params?.resourceType as ResourceType;
      if (!resourceType) return sendError(playerId, 'Must specify a resource type');
      const stolen = executeMonopoly(state, playerId, resourceType);
      addLogEntry(state, {
        type: 'play_dev_card',
        message: `Played Monopoly on ${resourceType}, took ${stolen}`,
        playerId,
      });
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

  // Steal from victim if specified
  if (payload.victimId) {
    const targets = getStealTargets(state, payload.hex);
    if (targets.includes(payload.victimId)) {
      const stolenResource = executeSteal(state, payload.victimId, playerId);
      if (stolenResource) {
        addLogEntry(state, {
          type: 'steal',
          message: `Stole a resource from ${payload.victimId}`,
          playerId,
          data: { victimId: payload.victimId },
        });
      }
    }
  }

  transitionPhase(state, GamePhase.TradeAndBuild);
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
  addLogEntry(state, { type: 'discard', message: 'Discarded cards', playerId });

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
  payload: { offering: Resources; requesting: Resources },
): void {
  const state = games.get(gameId);
  if (!state) return sendError(playerId, 'Game not found');

  const error = canProposeTrade(state, playerId);
  if (error) return sendError(playerId, error);

  const player = state.players.find((p) => p.id === playerId)!;
  if (!hasResources(player.resources, payload.offering)) {
    return sendError(playerId, 'Insufficient resources for trade offer');
  }

  const offer: TradeOffer = {
    id: uuidv4(),
    fromPlayerId: playerId,
    offering: payload.offering,
    requesting: payload.requesting,
    responses: {},
    counterOffers: {},
    status: 'open',
  };

  state.activeTradeOffers.push(offer);
  addLogEntry(state, { type: 'trade_offer', message: 'Trade proposed', playerId });

  hub.broadcast(gameId, 'trade_proposed', { offer });
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

  offer.responses[playerId] = payload.response;

  if (payload.response === 'accept') {
    // Re-validate both players have resources before executing
    const fromPlayer = state.players.find((p) => p.id === offer.fromPlayerId);
    const toPlayer = state.players.find((p) => p.id === playerId);
    if (!fromPlayer || !toPlayer) return sendError(playerId, 'Player not found');
    if (!hasResources(fromPlayer.resources, offer.offering))
      return sendError(playerId, 'Offering player no longer has sufficient resources');
    if (!hasResources(toPlayer.resources, offer.requesting))
      return sendError(playerId, 'You do not have sufficient resources to accept');

    const tradeError = executeTrade(state, offer.fromPlayerId, playerId, offer.offering, offer.requesting);
    if (tradeError) return sendError(playerId, tradeError);
    offer.status = 'completed';
    addLogEntry(state, { type: 'trade_completed', message: 'Trade completed', playerId });
    hub.broadcast(gameId, 'trade_completed', { offerId: offer.id, acceptedBy: playerId });
  } else if (payload.response === 'counter' && payload.counter) {
    offer.counterOffers[playerId] = payload.counter;
  }

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

  // Place a road at a random valid location
  const validRoads = getValidRoadLocations(state, bot.id, true);
  if (validRoads.length === 0) return;

  const road = validRoads[Math.floor(Math.random() * validRoads.length)];
  const rError = handleSetupRoad(state, bot.id, road);
  if (rError) return;

  addLogEntry(state, { type: 'place_road', message: 'Road placed (setup, bot)', playerId: bot.id });
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
    const distribution = distributeResources(state, diceSum);
    addLogEntry(state, { type: 'distribute', message: 'Resources distributed', data: { distribution } });
    transitionPhase(state, GamePhase.TradeAndBuild);
  }

  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
}

function botMoveRobber(gameId: string, state: GameState, bot: Player): void {
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
        message: `Stole a resource (bot)`,
        playerId: bot.id,
        data: { victimId },
      });
    }
  }

  transitionPhase(state, GamePhase.TradeAndBuild);
  broadcastAndCheckVictory(gameId, state);
  scheduleBotTurn(gameId);
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
