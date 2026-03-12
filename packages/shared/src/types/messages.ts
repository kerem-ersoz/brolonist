import { z } from 'zod';

// Reusable sub-schemas
const HexCoordSchema = z.object({ q: z.number(), r: z.number() });
const VertexSchema = z.object({ hex: HexCoordSchema, direction: z.enum(['N', 'S']) });
const EdgeSchema = z.object({ hex: HexCoordSchema, direction: z.enum(['NE', 'E', 'SE']) });
const ResourcesSchema = z.object({
  brick: z.number(),
  lumber: z.number(),
  ore: z.number(),
  grain: z.number(),
  wool: z.number(),
});

// Base message envelope
export const WsMessageSchema = z.object({
  type: z.string(),
  payload: z.record(z.unknown()),
  seq: z.number(),
  timestamp: z.string(),
});

// Client → Server schemas
export const JoinGameSchema = z.object({ gameId: z.string(), playerName: z.string() });
export const ReadySchema = z.object({ ready: z.boolean() });
export const PlaceSettlementSchema = z.object({ vertex: VertexSchema });
export const PlaceRoadSchema = z.object({ edge: EdgeSchema });
export const PlaceCitySchema = z.object({ vertex: VertexSchema });
export const MoveRobberSchema = z.object({
  hex: HexCoordSchema,
  victimId: z.string().optional(),
});
export const DiscardCardsSchema = z.object({ resources: ResourcesSchema });
export const TradeOfferSchema = z.object({
  offering: ResourcesSchema,
  requesting: ResourcesSchema,
  openToOffers: z.boolean().optional(),
});
export const TradeRespondSchema = z.object({
  offerId: z.string(),
  response: z.enum(['accept', 'decline', 'counter']),
  counter: TradeOfferSchema.optional(),
});
export const TradeConfirmSchema = z.object({
  offerId: z.string(),
  withPlayerId: z.string(),
});
export const TradeCancelSchema = z.object({
  offerId: z.string(),
});
export const TradeWithBankSchema = z.object({
  giving: z.enum(['brick', 'lumber', 'ore', 'grain', 'wool']),
  givingCount: z.number(),
  receiving: z.enum(['brick', 'lumber', 'ore', 'grain', 'wool']),
});
export const StealFromSchema = z.object({
  victimId: z.string(),
});
export const PlayDevCardSchema = z.object({
  cardType: z.enum(['knight', 'road_building', 'year_of_plenty', 'monopoly']),
  params: z.record(z.unknown()).optional(),
});
export const ChatSchema = z.object({ message: z.string().min(1).max(500) });

// Union of all client message types
export const CLIENT_MESSAGE_TYPES = [
  'join_game', 'leave_game', 'ready', 'start_game', 'update_config',
  'roll_dice', 'place_settlement', 'place_road', 'place_city',
  'buy_dev_card', 'play_dev_card', 'move_robber', 'discard_cards',
  'trade_offer', 'trade_respond', 'trade_confirm', 'trade_cancel', 'trade_with_bank',
  'steal_from',
  'end_turn', 'chat',
] as const;

export type ClientMessageType = (typeof CLIENT_MESSAGE_TYPES)[number];

// Server → Client message types
export const SERVER_MESSAGE_TYPES = [
  'game_state', 'state_update', 'action_result',
  'player_joined', 'player_left',
  'dice_rolled', 'robber_moved',
  'trade_proposed', 'trade_completed',
  'turn_changed', 'game_ended',
  'chat', 'error',
] as const;

export type ServerMessageType = (typeof SERVER_MESSAGE_TYPES)[number];

// Type-safe message type
export type WsMessage = z.infer<typeof WsMessageSchema>;
