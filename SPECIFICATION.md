# Brolonist Technical Specification

> Developer-focused specification for an online Catan implementation supporting 2–8 players.

**Tech Stack:** Full-stack TypeScript (Fastify + React 19)
**Version:** 0.1.0 (Draft)

---

## Table of Contents

1. [Domain Model](#1-domain-model)
2. [Map Types](#2-map-types)
3. [Game Rules Engine](#3-game-rules-engine)
4. [Architecture](#4-architecture)
5. [WebSocket Protocol](#5-websocket-protocol)
6. [REST API](#6-rest-api)
7. [Multiplayer System](#7-multiplayer-system)
8. [Bot System](#8-bot-system)
9. [Client Requirements](#9-client-requirements)
10. [Data Layer](#10-data-layer)
11. [Error Codes](#11-error-codes)
12. [Configuration](#12-configuration)

---

## 1. Domain Model

### 1.1 Coordinate System

The board uses **axial coordinates** (q, r) for hexagonal tiles (pointy-top orientation).

```
Axial coordinate system:
      _____
     /     \
    /  0,-1 \____
    \       /     \
     \_____/ 1,-1  \
     /     \       /
    / -1,0  \_____/
    \       /     \
     \_____/  1,0  \
     /     \       /
    / -1,1  \_____/
    \       /     \
     \_____/  0,1  \
           \       /
            \_____/
```

**Vertices** are identified by a hex coordinate plus a direction: `N` (north) or `S` (south).
**Edges** are identified by a hex coordinate plus a direction: `NE`, `E`, or `SE`.

### 1.2 Board Configurations

| Player Count | Terrain Hexes | Water Frame Hexes | Harbors |
|:---:|:---:|:---:|:---:|
| 2–4 | 19 | 18 | 9 |
| 5–6 | 30 | 24 | 11 |
| 7–8 | 42 | 30 | 13 |

### 1.3 Terrain Types

| Terrain   | Resource | Base Count (4p) | 6p Extension | 8p Extension |
|-----------|----------|:---:|:---:|:---:|
| Hills     | Brick    | 3 | +2 | +2 |
| Forest    | Lumber   | 4 | +2 | +2 |
| Mountains | Ore      | 3 | +2 | +2 |
| Fields    | Grain    | 4 | +2 | +2 |
| Pasture   | Wool     | 4 | +2 | +2 |
| Desert    | None     | 1 | +1 | +1 |

### 1.4 Number Tokens

Tokens 2–12 (excluding 7). Distribution weighted toward 6 and 8 (most probable).

| Number | Dots | Probability |
|:---:|:---:|:---:|
| 2, 12  | 1 | 1/36 |
| 3, 11  | 2 | 2/36 |
| 4, 10  | 3 | 3/36 |
| 5, 9   | 4 | 4/36 |
| 6, 8   | 5 | 5/36 |

### 1.5 Harbor Types

| Type    | Trade Ratio | Count (4p) |
|---------|:---:|:---:|
| Generic | 3:1 any    | 4 |
| Brick   | 2:1        | 1 |
| Lumber  | 2:1        | 1 |
| Ore     | 2:1        | 1 |
| Grain   | 2:1        | 1 |
| Wool    | 2:1        | 1 |

### 1.6 Building Types

| Building   | Cost | VP | Placement Rules | Limit |
|------------|------|:---:|----------------|:---:|
| Road       | 1 Brick, 1 Lumber | 0 | Adjacent to own road/settlement/city | 15 |
| Settlement | 1 Brick, 1 Lumber, 1 Grain, 1 Wool | 1 | On vertex, ≥2 edges from any building, connected to own road | 5 |
| City       | 2 Grain, 3 Ore | 2 | Replaces own settlement | 4 |

### 1.7 Development Cards (25 total)

| Card           | Count | Effect |
|----------------|:---:|------|
| Knight         | 14 | Move robber, steal 1 card from adjacent player |
| Victory Point  | 5  | +1 VP (revealed only when claiming victory) |
| Road Building  | 2  | Build 2 roads for free |
| Year of Plenty | 2  | Take any 2 resources from bank |
| Monopoly       | 2  | Take all of one resource type from all players |

**Cost:** 1 Ore, 1 Grain, 1 Wool

### 1.8 Player State

```typescript
interface Player {
  id: string;           // UUID
  name: string;
  color: PlayerColor;   // Red, Blue, White, Orange, Green, Brown, Purple, Teal
  status: 'active' | 'disconnected' | 'quit';

  resources: Record<ResourceType, number>;  // Hidden from other players
  developmentCards: DevelopmentCard[];       // Hidden from other players

  victoryPoints: number;   // Public VP only (excludes hidden VP cards)
  knightsPlayed: number;

  hasLongestRoad: boolean;
  hasLargestArmy: boolean;

  harbors: HarborType[];   // Derived from settlement positions
}
```

### 1.9 Game State

```typescript
interface GameState {
  id: string;           // UUID
  status: 'lobby' | 'setup' | 'playing' | 'finished';

  board: Board;
  players: Player[];    // Ordered by turn
  currentPlayerIndex: number;
  currentPhase: GamePhase;

  robberPosition: HexCoord;

  developmentDeck: DevelopmentCard[];  // Shuffled, hidden

  longestRoadHolder: string | null;    // Player ID
  longestRoadLength: number;
  largestArmyHolder: string | null;    // Player ID
  largestArmySize: number;

  dice: [number, number];

  turnNumber: number;
  setupRound: 1 | 2;                  // During setup phase
}
```

---

## 2. Map Types

Selectable during game creation.

### 2.1 Standard
The balanced official Catan layout with fixed terrain positions and randomized number tokens. No two high-probability hexes (6, 8) are adjacent.

### 2.2 Random
Fully randomized terrain placement and number token assignment. No adjacent 6/8 constraint is enforced.

### 2.3 Preset Maps

| Map Name | Description |
|---|---|
| Pangaea | All land hexes clustered in the center, water surrounding |
| Archipelago | Land scattered as small islands across the board |
| Rich Coast | High-value resources concentrated on outer ring |
| Desert Ring | Desert hexes form a ring separating inner and outer land |

### 2.4 Custom Maps (Future)

JSON format for user-created maps. Includes hex positions, terrain assignments, number tokens, harbor positions/types. Map editor UI and community sharing planned for a future phase.

---

## 3. Game Rules Engine

### 3.1 Game Phases

```
┌─────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────┐
│  LOBBY  │────▶│  SETUP_PLACE  │────▶│   PLAYING    │────▶│ FINISHED │
└─────────┘     └───────────────┘     └──────────────┘     └──────────┘
                       │                     │
                       ▼                     ▼
                (2 rounds, snake)      (turn loop until
                                        victory condition)
```

### 3.2 Phase Enum

```typescript
enum GamePhase {
  Lobby = 'lobby',
  SetupForward = 'setup_forward',    // Round 1: clockwise
  SetupReverse = 'setup_reverse',    // Round 2: counter-clockwise
  RollDice = 'roll_dice',
  Discard = 'discard',               // When 7 rolled, waiting for discards
  MoveRobber = 'move_robber',
  TradeAndBuild = 'trade_and_build',
  SpecialBuild = 'special_build',    // 5+ players only
  GameOver = 'game_over',
}
```

### 3.3 Valid Phase Transitions

```
Lobby → SetupForward           (all ready, host starts)
SetupForward → SetupReverse    (all players placed once)
SetupReverse → RollDice        (all players placed twice, initial resources given)
RollDice → Discard             (7 rolled, players have >7 cards)
RollDice → MoveRobber          (7 rolled, no discards needed)
RollDice → TradeAndBuild       (not 7)
Discard → MoveRobber           (all discards received)
MoveRobber → TradeAndBuild     (robber moved, steal resolved)
TradeAndBuild → SpecialBuild   (5+ players, turn ended)
TradeAndBuild → RollDice       (2-4 players, turn ended, no winner)
SpecialBuild → RollDice        (all passed, no winner)
Any → GameOver                 (victory condition met)
```

### 3.4 Setup Phase

1. **Round 1 (clockwise):** Each player places 1 settlement + 1 road
2. **Round 2 (counter-clockwise):** Each player places 1 settlement + 1 road
3. **Initial Resources:** After round 2 placement, each player receives 1 resource for each hex adjacent to their **second** settlement

### 3.5 Turn Flow (Playing Phase)

```
┌────────────────┐
│   ROLL_DICE    │ (mandatory, once per turn)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ DISTRIBUTE or  │ (if 7: robber sequence)
│    ROBBER      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  TRADE/BUILD   │ (any order, multiple times)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   END_TURN     │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ SPECIAL_BUILD  │ (5+ players only)
└────────────────┘
```

### 3.6 Resource Distribution

When dice are rolled (value N, where N ≠ 7):
1. Find all hexes with number token = N
2. Skip hexes with robber
3. For each hex: give 1 resource per adjacent settlement, 2 per adjacent city
4. If bank runs out of a resource, **no one** receives that resource type

### 3.7 Robber Sequence (Roll = 7)

1. **Discard Phase:** All players with >7 cards must discard half (rounded down)
   - All discards happen simultaneously
   - Timeout: 30s → auto-discard randomly selected cards
2. **Move Robber:** Active player must move robber to a different hex
3. **Steal:** Active player steals 1 random card from any player with a settlement/city adjacent to the new robber hex. If multiple victims, player chooses.

### 3.8 Trading

**Bank Trade:**
- Default: 4:1 (any 4 identical resources for 1 of any type)
- Generic harbor: 3:1
- Specific harbor: 2:1 for that resource type

**Player-to-Player Trade (colonist.io style):**
1. Active player broadcasts offer (giving X, wanting Y)
2. Other players respond: Accept, Counter-offer, or Decline
3. Active player confirms with a specific player
4. Server validates both parties have resources, executes atomically

**Rules:**
- Only during active player's TradeAndBuild phase
- Active player initiates or accepts
- Any mutually agreed ratio
- No trades during setup, robber, or special build phases

### 3.9 Building Validation

- **Road:** Must connect to own road, settlement, or city
- **Settlement:** Must be on unoccupied vertex, ≥2 edges from any building, connected to own road (except during setup)
- **City:** Must replace own settlement

Multiple builds per turn allowed, validated sequentially.

### 3.10 Development Cards

- **Purchase:** Anytime during TradeAndBuild phase
- **Play:** Max 1 per turn, cannot play a card purchased this turn
- **Knight:** Triggers robber sequence (move + steal), increments knights played
- **Road Building:** Place 2 roads for free
- **Year of Plenty:** Take any 2 resources from bank
- **Monopoly:** Name a resource type; all other players give you all of that type
- **VP cards:** Never played; revealed only when claiming victory

### 3.11 Longest Road

- Minimum 5 connected road segments
- Must be longer than any other player's longest road
- Worth 2 VP
- Recalculated when:
  - Any player builds a road
  - A settlement breaks a road path (opponent builds on your road)

**Algorithm:** DFS from each road segment, tracking visited, finding max path length.

### 3.12 Largest Army

- Minimum 3 knights played
- Must be more than any other player's army
- Worth 2 VP
- Recalculated when any player plays a knight

### 3.13 Special Building Phase (5+ Players)

After active player ends turn, before next player's turn:
1. All other players may build (settlements, cities, roads) and buy development cards
2. **No trading allowed**
3. Clockwise order starting from player after active player
4. Each player may pass or build
5. Phase ends when all players have passed

### 3.14 Victory Condition

First player to reach **target VP** during their turn wins:
- 2–4 players: 10 VP
- 5–6 players: 12 VP
- 7–8 players: 14 VP

VP includes hidden VP cards when claiming victory.

---

## 4. Architecture

### 4.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                           Clients                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        ┌──────────┐     │
│  │ Browser  │ │ Browser  │ │ Browser  │  ...   │ Browser  │     │
│  │ (React)  │ │ (React)  │ │ (React)  │        │ (React)  │     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘        └────┬─────┘     │
└───────┼────────────┼────────────┼───────────────────┼───────────┘
        │            │            │                   │
        │ WebSocket  │ WebSocket  │ WebSocket         │ WebSocket
        │            │            │                   │
┌───────┼────────────┼────────────┼───────────────────┼───────────┐
│       ▼            ▼            ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Fastify Backend Server                   │    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │    │
│  │  │ REST API │  │ WebSocket│  │   Shared Game      │    │    │
│  │  │ (Auth,   │  │ Hub      │  │   Engine           │    │    │
│  │  │  Lobby)  │  │          │  │ (@brolonist/shared)│    │    │
│  │  └──────────┘  └──────────┘  └────────────────────┘    │    │
│  │                                                         │    │
│  │  ┌──────────┐                                          │    │
│  │  │   Bot    │ (server-side virtual players)            │    │
│  │  │  Manager │                                          │    │
│  │  └──────────┘                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Data Layer                           │    │
│  │  ┌─────────────┐  ┌─────────────┐                      │    │
│  │  │   Redis     │  │  PostgreSQL │                      │    │
│  │  │  (Active    │  │  (Prisma)   │                      │    │
│  │  │   Games)    │  │  (Users,    │                      │    │
│  │  │             │  │   History)  │                      │    │
│  │  └─────────────┘  └─────────────┘                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           Server                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Server-Authoritative Model

Server is the single source of truth. Clients send intents, server validates via `@brolonist/shared` game engine and broadcasts results.

```
Client                          Server
   │                               │
   │  ─────── Action ──────────▶  │
   │  (e.g., PlaceRoad{edge})    │
   │                               │
   │                          Validate action (shared engine)
   │                          Update game state
   │                          Calculate side effects
   │                               │
   │  ◀─────── Event ───────────  │
   │  (state_update to all)       │
   │                               │
```

### 4.3 Command Pattern

All game actions implement a common interface in `@brolonist/shared`:

```typescript
interface Command {
  validate(state: GameState): ValidationError | null;
  execute(state: GameState): { state: GameState; events: GameEvent[] };
}
```

---

## 5. WebSocket Protocol

### 5.1 Message Envelope

```typescript
interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
  seq: number;       // Client sequence number (for optimistic update tracking)
  timestamp: string; // ISO 8601
}
```

### 5.2 Client → Server Messages

| Type | Payload | Phase |
|------|---------|-------|
| `join_game` | `{ gameId, playerName }` | Lobby |
| `leave_game` | `{}` | Any |
| `ready` | `{ ready: boolean }` | Lobby |
| `start_game` | `{}` | Lobby (host) |
| `roll_dice` | `{}` | RollDice |
| `place_settlement` | `{ vertex: VertexId }` | Setup, TradeAndBuild, SpecialBuild |
| `place_road` | `{ edge: EdgeId }` | Setup, TradeAndBuild, SpecialBuild |
| `place_city` | `{ vertex: VertexId }` | TradeAndBuild, SpecialBuild |
| `buy_dev_card` | `{}` | TradeAndBuild, SpecialBuild |
| `play_dev_card` | `{ cardType, ...params }` | TradeAndBuild |
| `move_robber` | `{ hex: HexCoord, victimId?: string }` | MoveRobber |
| `discard_cards` | `{ resources: Record<ResourceType, number> }` | Discard |
| `trade_offer` | `{ offering: Resources, requesting: Resources }` | TradeAndBuild |
| `trade_respond` | `{ offerId: string, response: 'accept' \| 'decline' \| 'counter', counter?: TradeOffer }` | TradeAndBuild |
| `trade_with_bank` | `{ giving: ResourceType, givingCount: number, receiving: ResourceType }` | TradeAndBuild |
| `end_turn` | `{}` | TradeAndBuild |
| `chat` | `{ message: string }` | Any |

### 5.3 Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `game_state` | `{ fullState }` | Full state sync (on join/reconnect) |
| `state_update` | `{ delta }` | Incremental state change |
| `action_result` | `{ success: boolean, error?: string, seq: number }` | Response to client action |
| `player_joined` | `{ player }` | New player joined |
| `player_left` | `{ playerId }` | Player left/disconnected |
| `dice_rolled` | `{ values: [n, n], distribution: Record<PlayerId, Resources> }` | Dice result |
| `robber_moved` | `{ hex: HexCoord, stolen?: { from: PlayerId, resource?: ResourceType } }` | Robber moved |
| `trade_proposed` | `{ offer: TradeOffer }` | Trade offer broadcast |
| `trade_completed` | `{ parties: [PlayerId, PlayerId], exchange: TradeDetails }` | Trade executed |
| `turn_changed` | `{ playerId: string, phase: GamePhase }` | Turn/phase change |
| `game_ended` | `{ winnerId: string, finalScores: PlayerScore[] }` | Game over |
| `chat` | `{ playerId: string, message: string }` | Chat message |
| `error` | `{ code: string, message: string }` | Error notification |

### 5.4 State Filtering

The server filters `game_state` and `state_update` per-player:
- **Hidden from other players:** Resource cards (only count visible), development cards (only count visible), development deck order
- **Visible to all:** Building positions, VP (public only), knights played, harbors, longest road/largest army

---

## 6. REST API

### 6.1 Authentication

```
POST /api/auth/guest
  Body: { name: string }
  Response: { token: string, user: { id, name } }

GET /api/auth/google
  → Redirects to Google OAuth

GET /api/auth/google/callback
  → Exchanges code, creates/updates user, sets JWT cookie
  → Redirects to /

GET /api/auth/discord         (same pattern)
GET /api/auth/discord/callback

GET /api/auth/github          (same pattern)
GET /api/auth/github/callback
```

### 6.2 Lobby

```
GET /api/games
  Query: ?status=lobby
  Response: [{ id, name, host, playerCount, maxPlayers, mapType, private }]

POST /api/games
  Body: { name, maxPlayers, victoryPoints, mapType, private?, password? }
  Response: { id, ... }

GET /api/games/:id
  Response: { id, name, host, players, settings, status }
```

### 6.3 Health

```
GET /health
  Response: { status: "ok" }
```

---

## 7. Multiplayer System

### 7.1 Lobby

- Players can join/leave games
- Players toggle ready status
- Host can kick players, configure settings, add/remove bots
- Host starts game when all players ready (min 2)
- Map type selected during game creation with visual preview

### 7.2 Authentication

**MVP:** Guest mode (display name → JWT session token) + OAuth (Google, Discord, GitHub).

**JWT Session:**
```typescript
{
  sub: "player-uuid",
  name: "display-name",
  exp: "expiration",
  game: "current-game-uuid"  // optional
}
```

Sessions stored in Redis with TTL (7 days).

### 7.3 Reconnection

- **Disconnect Detection:** WebSocket close event + ping/pong timeout (30 seconds)
- **Grace Period:** 60 seconds
- **Player Status:** Marked as `disconnected` (not `quit`)
- **Game Continues:** Other players can still act
- **Reconnect Flow:**
  1. Client opens new WebSocket
  2. Client sends `rejoin` with session token
  3. Server validates token, finds active game
  4. Server sends full `game_state`
  5. Player marked as `active`

### 7.4 Quitter Policy

When a player quits (leaves voluntarily or exceeds grace period):

1. Player marked as `quit`
2. Buildings remain on board (block placement, count for longest road calc)
3. Resource cards returned to bank
4. Development cards removed from game
5. On their turn: server auto-rolls dice, resources distributed (quit player's go to bank), no trade/build, turn immediately ends
6. Cannot win; longest road/largest army can transfer
7. Game ends if <2 active players remain

### 7.5 Turn Timer

Configurable per game:
- Main turn: 90–180 seconds
- Discard phase: 30 seconds (then auto-discard random)
- Special build phase: 30 seconds per player

---

## 8. Bot System

### 8.1 Interface

Bots are server-side virtual players. They receive game state and return commands through the **same command pipeline** as human players.

```typescript
interface Bot {
  id: string;
  name: string;
  strategy: 'random' | 'greedy' | 'smart';
  
  decideAction(state: GameState, validActions: Action[]): Action;
}
```

### 8.2 Strategies

| Strategy | Behavior |
|----------|----------|
| `RandomBot` | Picks a valid random action. Fast for testing. |
| `GreedyBot` | Maximizes immediate VP gain or resource acquisition. |
| `SmartBot` | Heuristic-based: prioritize ore+grain for cities, block leading player with robber, diversify settlements. |

### 8.3 Integration

- Added/removed from game lobby by host
- Participate in all game phases: setup, turns, trading (auto-accept/decline based on strategy), robber, discard
- Server-side only — no WebSocket connection needed
- `make test-game` creates a game pre-populated with bots

---

## 9. Client Requirements

### 9.1 Technology

| Concern | Choice |
|---------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Routing | React Router |
| i18n | react-i18next (Turkish default, English) |
| Board rendering | SVG with user-provided asset support |
| Component dev | Storybook 8 |
| E2E testing | Playwright (visual regression) |

### 9.2 Hexagonal Board Rendering

**SVG-based** with layers (bottom to top):
1. Water/frame hexes
2. Terrain hexes with colors/textures
3. Number tokens
4. Harbors
5. Roads
6. Settlements / Cities
7. Robber
8. Hover/selection highlights

**Coordinate conversion (pointy-top):**
```typescript
function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}
```

### 9.3 Responsive Design

- **Desktop:** Board center, player panel left, opponents/trade/log right
- **Tablet:** Board with collapsible side panels
- **Mobile:** Board top, actions as bottom sheet, swipeable panels

### 9.4 Localization

- **Default:** Turkish (`tr`)
- **Available:** English (`en`)
- All UI strings use `t()` via react-i18next
- Language switcher in navbar, preference in localStorage

### 9.5 State Synchronization

```typescript
// On server message
websocket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'game_state':
      store.setState(msg.payload);
      break;
    case 'state_update':
      store.applyDelta(msg.payload);
      break;
    case 'action_result':
      if (!msg.payload.success) {
        store.rollbackOptimistic(msg.seq);
        showError(msg.payload.error);
      }
      break;
  }
};
```

---

## 10. Data Layer

### 10.1 Redis (Active Games)

| Key Pattern | Content | TTL |
|---|---|---|
| `game:{gameId}` | Full serialized game state | 24h (extended on activity) |
| `session:{token}` | Player ID, current game ID | 7 days |

### 10.2 PostgreSQL (Prisma Schema)

```prisma
model User {
  id          String   @id @default(uuid())
  email       String?  @unique
  displayName String
  avatarUrl   String?
  provider    String?  // 'google', 'discord', 'github', 'guest'
  providerId  String?
  createdAt   DateTime @default(now())
  lastLogin   DateTime?

  games       GamePlayer[]
}

model Game {
  id          String     @id @default(uuid())
  createdAt   DateTime   @default(now())
  endedAt     DateTime?
  status      String     // 'completed', 'abandoned'
  playerCount Int
  winnerId    String?
  config      Json       // { victoryPoints, mapType, turnTimer, ... }

  players     GamePlayer[]
  events      GameEvent[]
}

model GamePlayer {
  gameId      String
  userId      String
  playerIndex Int
  color       String
  finalVp     Int?
  placement   Int?     // 1st, 2nd, etc.
  quit        Boolean  @default(false)

  game        Game     @relation(fields: [gameId], references: [id])
  user        User     @relation(fields: [userId], references: [id])

  @@id([gameId, userId])
}

model GameEvent {
  id          Int      @id @default(autoincrement())
  gameId      String
  seq         Int
  timestamp   DateTime @default(now())
  eventType   String
  playerId    String?
  payload     Json

  game        Game     @relation(fields: [gameId], references: [id])

  @@unique([gameId, seq])
  @@index([gameId, seq])
}
```

### 10.3 Caching Strategy

- **Write:** Update Redis immediately, persist to PostgreSQL on game end + periodic checkpoints
- **Read:** Redis for active games, PostgreSQL for history

---

## 11. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `E001` | Invalid action | Action not allowed in current phase |
| `E002` | Not your turn | Player attempted action out of turn |
| `E003` | Insufficient resources | Not enough resources for action |
| `E004` | Invalid placement | Building placement violates rules |
| `E005` | Game full | Cannot join, max players reached |
| `E006` | Game started | Cannot join, game already in progress |
| `E007` | Not in game | Player not in the specified game |
| `E008` | Invalid trade | Trade validation failed |
| `E009` | Already rolled | Dice already rolled this turn |
| `E010` | Must roll first | Must roll dice before other actions |

---

## 12. Configuration

### 12.1 Environment Variables

```env
# Server
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgresql://brolonist:brolonist@localhost:5432/brolonist
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Client (build-time)
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
```

### 12.2 Game Defaults

```json
{
  "minPlayers": 2,
  "maxPlayers": 8,
  "defaultVictoryPoints": { "2-4": 10, "5-6": 12, "7-8": 14 },
  "turnTimeoutSeconds": 120,
  "discardTimeoutSeconds": 30,
  "reconnectGraceSeconds": 60,
  "defaultMapType": "standard"
}
```

---

## Appendix: Monorepo Structure

```
brolonist/
├── packages/
│   ├── shared/        # Game engine + types + hex math (Zod schemas)
│   ├── server/        # Fastify + WS hub + auth + bots + Redis/Prisma
│   └── client/        # React 19 + Vite + Tailwind + Zustand + Storybook
├── infra/azure/       # Bicep IaC (App Service, Static Web Apps, Redis, PG, Key Vault)
├── .github/workflows/ # CI (lint/test/build), staging deploy, prod deploy
├── docs/              # UX reference, flow diagrams, component inventory
├── docker-compose.yml # Local dev: PostgreSQL 16 + Redis 7
├── Makefile           # make dev / stop / build / test
└── SPECIFICATION.md   # This file
```
