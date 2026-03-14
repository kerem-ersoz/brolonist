import { HexCoord, VertexId, EdgeId } from '../hex/coordinates.js';
import {
  Resources,
  TerrainType,
  DevelopmentCardType,
  HarborType,
  PlayerColor,
  BuildingType,
} from './resources.js';

export type PlayerId = string;
export type GameId = string;

export enum GamePhase {
  Lobby = 'lobby',
  SetupForward = 'setup_forward',
  SetupReverse = 'setup_reverse',
  RollDice = 'roll_dice',
  Discard = 'discard',
  MoveRobber = 'move_robber',
  TradeAndBuild = 'trade_and_build',
  SpecialBuild = 'special_build',
  GameOver = 'game_over',
}

export enum PlayerStatus {
  Active = 'active',
  Disconnected = 'disconnected',
  Quit = 'quit',
}

export enum MapType {
  Standard = 'standard',
  Random = 'random',
  Pangaea = 'pangaea',
  Archipelago = 'archipelago',
  RichCoast = 'rich_coast',
  DesertRing = 'desert_ring',
  Turkey = 'turkey',
  World = 'world',
  Diamond = 'diamond',
  BritishIsles = 'british_isles',
  Gear = 'gear',
  Lakes = 'lakes',
}

export interface HexTile {
  coord: HexCoord;
  terrain: TerrainType;
  numberToken: number | null;
}

export interface Harbor {
  type: HarborType;
  vertices: [VertexId, VertexId];
  position: HexCoord;
  facing: number;
}

export interface Building {
  type: BuildingType;
  playerId: PlayerId;
}

export interface Board {
  hexes: HexTile[];
  waterHexes: HexCoord[];
  harbors: Harbor[];
  vertexBuildings: Map<string, Building>;
  edgeBuildings: Map<string, Building>;
}

export function vertexKey(v: VertexId): string {
  return `${v.hex.q},${v.hex.r},${v.direction}`;
}

export function edgeKey(e: EdgeId): string {
  return `${e.hex.q},${e.hex.r},${e.direction}`;
}

export interface DevelopmentCard {
  type: DevelopmentCardType;
  turnPurchased: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  status: PlayerStatus;
  isBot: boolean;
  botStrategy?: 'random' | 'greedy' | 'smart';

  resources: Resources;
  developmentCards: DevelopmentCard[];

  victoryPoints: number;
  knightsPlayed: number;

  hasLongestRoad: boolean;
  hasLargestArmy: boolean;

  harbors: HarborType[];

  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;

  devCardPlayedThisTurn: boolean;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: PlayerId;
  offering: Resources;
  requesting: Resources;
  openToOffers: boolean;
  responses: Record<PlayerId, 'accept' | 'decline' | 'counter'>;
  counterOffers: Record<PlayerId, { offering: Resources; requesting: Resources }>;
  status: 'open' | 'completed' | 'cancelled';
  expiresAt: number; // Unix ms timestamp
}

export interface GameConfig {
  maxPlayers: number;
  victoryPoints: number;
  mapType: MapType;
  turnTimerSeconds: number;
  discardTimerSeconds: number;
  isPrivate: boolean;
  password?: string;
}

export interface GameState {
  id: GameId;
  name: string;
  hostId: PlayerId;
  config: GameConfig;
  status: 'lobby' | 'setup' | 'playing' | 'finished';

  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  currentPhase: GamePhase;

  robberPosition: HexCoord;

  developmentDeck: DevelopmentCardType[];

  longestRoadHolder: PlayerId | null;
  longestRoadLength: number;
  largestArmyHolder: PlayerId | null;
  largestArmySize: number;

  dice: [number, number];

  turnNumber: number;
  setupRound: 1 | 2;
  setupAction: 'settlement' | 'road';
  lastSetupSettlement: { hex: { q: number; r: number }; direction: string } | null;

  activeTradeOffers: TradeOffer[];

  pendingDiscards: PlayerId[];
  pendingStealTargets: PlayerId[];

  specialBuildOrder: PlayerId[];
  specialBuildCurrentIndex: number;
  specialBuildRequests: PlayerId[];

  log: GameLogEntry[];

  /** ISO timestamp when the current turn expires, or null if no timer. */
  turnDeadline: string | null;
}

export interface GameLogEntry {
  timestamp: string;
  playerId?: PlayerId;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

export function createPlayer(
  id: PlayerId,
  name: string,
  color: PlayerColor,
  isBot = false,
  botStrategy?: 'random' | 'greedy' | 'smart',
): Player {
  return {
    id,
    name,
    color,
    status: PlayerStatus.Active,
    isBot,
    botStrategy,
    resources: { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 },
    developmentCards: [],
    victoryPoints: 0,
    knightsPlayed: 0,
    hasLongestRoad: false,
    hasLargestArmy: false,
    harbors: [],
    roadsBuilt: 0,
    settlementsBuilt: 0,
    citiesBuilt: 0,
    devCardPlayedThisTurn: false,
  };
}

export function getDefaultVictoryPoints(playerCount: number): number {
  if (playerCount <= 4) return 10;
  if (playerCount <= 6) return 12;
  return 14;
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}
