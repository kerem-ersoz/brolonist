# Brolonist — Component Inventory

Every UI component needed, categorized by feature area. Each component maps to a Storybook story.

---

## Board Components (`components/Board/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `Board` | Main SVG container. Zoom/pan, renders all layers. | Static board (4p/6p/8p), zoom levels, mobile vs desktop | Critical |
| `HexTile` | Single hex with terrain color/texture + number token | All 6 terrain types, all number tokens (2-12), robber-occupied state, hover state | Critical |
| `Vertex` | Settlement/city placement point | Empty, settlement (all 8 colors), city (all 8 colors), valid-placement ghost, hover highlight | Critical |
| `Edge` | Road placement edge | Empty, road (all 8 colors), valid-placement ghost, hover highlight | Critical |
| `Robber` | Robber piece on hex | Static on hex, dragging state, drop-target hex highlight | Critical |
| `Harbor` | Harbor indicator on board edge | All 6 types (generic, brick, lumber, ore, grain, wool), positioned at various angles | High |
| `BoardOverlay` | Hover/selection highlight layer | Build mode overlays, robber move targets | High |
| `NumberToken` | Number circle on hex | All numbers (2-12) with probability dots (1-5), red highlight for 6/8 | Critical |
| `WaterHex` | Water frame hex | Standard water texture | Medium |

## Player Components (`components/Player/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `PlayerPanel` | Own resources, dev cards, building inventory, VP | Full hand, empty hand, various resource combos, building counts | Critical |
| `ResourceCard` | Single resource card | All 5 types, card back, small/large variants | Critical |
| `ResourceHand` | Fan/grid of resource cards | Various counts (0-15+), receiving animation state | Critical |
| `DevCardHand` | Development cards in hand | Various card types, just-purchased highlight, playable/unplayable states | High |
| `DevCard` | Single dev card | All 5 types (face), card back, played state | High |
| `BuildingInventory` | Remaining buildings display | Full inventory, partially used, depleted warnings | Medium |
| `OpponentBar` | Row of opponent summaries | 1-7 opponents, various VP counts, badges | Critical |
| `OpponentCard` | Single opponent summary | Name, color, VP, resource count, dev card count, badges, disconnected state | Critical |
| `PlayerAvatar` | Player icon with color | All 8 colors, active turn indicator, disconnected overlay | High |
| `VPDisplay` | Victory points indicator | Various VP counts, target indicator, approaching-victory highlight | Medium |

## Action Components (`components/Actions/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `ActionBar` | Main action buttons | All phase states: must-roll, can-trade/build, must-end, waiting, setup placement | Critical |
| `DiceDisplay` | Dice result display | All combinations (1-6 × 1-6), rolling animation, resource distribution summary | Critical |
| `BuildMenu` | Build type selector | All options (road/settlement/city/dev card), affordable/unaffordable states, cost tooltips | High |
| `TurnIndicator` | Whose turn + phase | "Your turn!", "Waiting for Alice...", phase labels, timer countdown | High |
| `TurnTimer` | Countdown timer | Full time, warning (<30s), critical (<10s), expired | Medium |

## Trade Components (`components/Trade/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `TradePanel` | Full trade UI container | Offer builder, active offers, bank trade tabs. Mobile bottom sheet + desktop sidebar | Critical |
| `TradeOfferBuilder` | Offer creation form | Resource selectors (give/want), propose button, clear button | Critical |
| `TradeOffer` | Single trade offer card | Outgoing offer, incoming offer, with accept/decline/counter buttons | Critical |
| `TradeInbox` | List of active offers | Multiple offers, empty state, offer from specific player | Critical |
| `TradeCounter` | Counter-offer form | Pre-filled from original, editable resources | High |
| `BankTrade` | Bank/harbor trade form | 4:1 default, 3:1 harbor, 2:1 specific harbor, auto-calculated ratios | High |
| `ResourceSelector` | +/- resource picker | All 5 types, increment/decrement, max cap from hand | High |
| `TradeConfirmation` | Confirm trade modal | Summary of exchange, confirm/cancel | Medium |

## Lobby Components (`components/Lobby/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `GameBrowser` | Game list with filters | Games available, empty state, loading, private games | Critical |
| `GameCard` | Single game in browser | Game name, host, player count, map type, join button | Critical |
| `CreateGame` | Game creation form | All fields: name, players, map type (with preview!), VP target, private toggle, password | Critical |
| `MapPreview` | Miniature board preview | All map types: standard, random, each preset | High |
| `GameLobby` | Pre-game lobby | Player list, ready states, bot slots, start button, settings | Critical |
| `PlayerList` | Player list in lobby | Players with ready status, host badge, kick button, bot indicator | Critical |
| `BotSlot` | Bot configuration | Strategy selector (random/greedy/smart), difficulty label, remove button | High |
| `LobbySettings` | Game settings panel (host) | Map type, VP target, turn timer, player limit | Medium |

## Auth Components (`components/Auth/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `LoginPage` | Full login screen | OAuth buttons, guest form, branding | Critical |
| `OAuthButton` | OAuth provider button | Google, Discord, GitHub variants, loading state | High |
| `GuestForm` | Guest name input | Empty, filled, error state | High |
| `OAuthCallback` | Loading screen during OAuth | Spinner, success redirect, error state | Medium |

## Chat/Log Components (`components/Chat/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `GameLog` | Combined event log + chat | Mixed entries: dice rolls, builds, trades, steals, chat messages | High |
| `LogEntry` | Single log event | All event types with player colors: "Alice rolled 7", "Bob built a settlement", "Trade: Alice ↔ Bob" | High |
| `ChatMessage` | Player chat message | Message with player name/color, timestamp | Medium |
| `ChatInput` | Message input field | Empty, typing, send button | Medium |

## Layout Components (`components/Layout/`)

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `GameLayout` | Responsive game screen | Desktop (board + panels), tablet (collapsible), mobile (stacked) | Critical |
| `Navbar` | Top navigation bar | Logo, user info, language switcher (TR/EN), settings | High |
| `BottomSheet` | Mobile bottom sheet | Collapsed, expanded, various content (actions, trade, resources) | High |
| `LanguageSwitcher` | TR/EN toggle | Turkish selected, English selected | Medium |
| `ConnectionStatus` | WS connection indicator | Connected, reconnecting, disconnected | Medium |

## Notification Components

| Component | Description | Storybook Stories | Priority |
|---|---|---|---|
| `Toast` | Notification toast | Success, error, info, warning variants, auto-dismiss | High |
| `TurnNotification` | "Your turn!" banner | Appear animation, with sound cue | High |
| `VictoryModal` | Game end modal | Winner celebration, final scores, play again/lobby buttons | Medium |
| `DiscardModal` | Discard cards modal | Select cards to discard, countdown timer, confirm button | High |
| `VictimSelector` | Choose robber victim | List of players with card counts, select one | Medium |

---

## Component Count Summary

| Category | Count |
|---|---|
| Board | 9 |
| Player | 10 |
| Actions | 5 |
| Trade | 8 |
| Lobby | 8 |
| Auth | 4 |
| Chat/Log | 4 |
| Layout | 5 |
| Notifications | 5 |
| **Total** | **58** |
