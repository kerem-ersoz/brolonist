# Brolonist — UX Flow Diagrams

State diagrams for all major user flows. These are the target UX flows modeled after colonist.io.

---

## 1. Authentication Flow

```
┌─────────┐     ┌──────────────┐     ┌────────────┐
│  Landing │────▶│  Login Page  │────▶│   Lobby    │
│   Page   │     │              │     │  (Home)    │
└─────────┘     └──────┬───────┘     └────────────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │ Google │ │Discord │ │ GitHub │
         │ OAuth  │ │ OAuth  │ │ OAuth  │
         └───┬────┘ └───┬────┘ └───┬────┘
             │          │          │
             └──────────┼──────────┘
                        ▼
                  ┌───────────┐
                  │ OAuth     │
                  │ Callback  │───▶ Lobby (Home)
                  └───────────┘

         ┌────────────┐
         │ Guest Login│───▶ Enter Name ───▶ Lobby (Home)
         └────────────┘
```

---

## 2. Lobby Flow

```
┌─────────────────────────────────────────────────────┐
│                    LOBBY (HOME)                      │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ Game Browser  │    │ Create Game  │               │
│  │ (list/filter) │    │   Button     │               │
│  └──────┬───────┘    └──────┬───────┘               │
│         │                   │                        │
│         ▼                   ▼                        │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ Join Game    │    │ Create Game  │               │
│  │ (click row)  │    │ Form:        │               │
│  │              │    │  - Name      │               │
│  │              │    │  - Players   │               │
│  │              │    │  - Map Type  │               │
│  │              │    │  - VP Target │               │
│  │              │    │  - Private?  │               │
│  └──────┬───────┘    └──────┬───────┘               │
│         │                   │                        │
│         └───────┬───────────┘                        │
│                 ▼                                     │
│  ┌────────────────────────────────┐                  │
│  │         GAME LOBBY             │                  │
│  │                                │                  │
│  │  Player List:                  │                  │
│  │    [Player 1] ✓ Ready (Host)   │                  │
│  │    [Player 2] ✗ Not Ready      │                  │
│  │    [Bot - Smart] ✓             │                  │
│  │    [+ Add Bot]                 │                  │
│  │                                │                  │
│  │  Host Controls:                │                  │
│  │    [Kick] [Settings] [Start]   │                  │
│  │                                │                  │
│  │  All ready? ──▶ [Start Game]   │                  │
│  └────────────────────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Setup Phase Flow

```
┌─────────────────────────────────────────────────────┐
│                   SETUP PHASE                        │
│                                                      │
│  Round 1 (Clockwise: P1 → P2 → P3 → P4)            │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ "Place your  │───▶│ "Place your  │               │
│  │  settlement" │    │  road"       │               │
│  │              │    │              │               │
│  │ Valid spots  │    │ Valid spots  │               │
│  │ highlighted  │    │ highlighted  │               │
│  │ (green dots) │    │ (green lines)│               │
│  └──────────────┘    └──────┬───────┘               │
│                             │ next player            │
│                             ▼                        │
│  Round 2 (Counter-CW: P4 → P3 → P2 → P1)           │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ "Place your  │───▶│ "Place your  │               │
│  │  settlement" │    │  road"       │               │
│  │              │    │              │               │
│  │ [Same UX     │    │ [Same UX     │               │
│  │  as round 1] │    │  as round 1] │               │
│  └──────────────┘    └──────┬───────┘               │
│                             │                        │
│                             ▼                        │
│  ┌──────────────────────────────────┐                │
│  │ Initial resources distributed   │                │
│  │ (from 2nd settlement hexes)     │                │
│  │                                  │                │
│  │ ───▶ BEGIN PLAYING PHASE         │                │
│  └──────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

## 4. Main Turn Flow

```
┌───────────────────────────────────────────────────────────────┐
│                        TURN START                              │
│                                                                │
│   "Your Turn!" notification + highlight                        │
│                                                                │
│   ┌──────────────┐                                            │
│   │  ROLL DICE   │ (mandatory, button press)                  │
│   └──────┬───────┘                                            │
│          │                                                     │
│          ├──── Roll ≠ 7 ────▶ ┌──────────────────────┐        │
│          │                    │ RESOURCE DISTRIBUTION │        │
│          │                    │ Show who gets what    │        │
│          │                    └──────────┬───────────┘        │
│          │                               │                     │
│          │                               ▼                     │
│          │                    ┌──────────────────────┐        │
│          │                    │   TRADE & BUILD      │        │
│          │                    │                      │        │
│          │                    │   [Build Road]       │        │
│          │                    │   [Build Settlement] │        │
│          │                    │   [Build City]       │        │
│          │                    │   [Buy Dev Card]     │        │
│          │                    │   [Play Dev Card]    │        │
│          │                    │   [Trade]            │        │
│          │                    │   [End Turn]         │◀─┐     │
│          │                    └──────────┬───────────┘  │     │
│          │                               │              │     │
│          │                    (can do multiple actions)──┘     │
│          │                               │                     │
│          │                    ┌──────────▼───────────┐        │
│          │                    │     END TURN         │        │
│          │                    └──────────┬───────────┘        │
│          │                               │                     │
│          └──── Roll = 7 ────▶ [See Robber Flow below]         │
│                                                                │
│   5+ players: SpecialBuild phase after EndTurn                │
│   ┌──────────────────────────────────┐                        │
│   │ SPECIAL BUILD (others can build) │                        │
│   │ No trading allowed               │                        │
│   │ Clockwise from next player       │                        │
│   │ Each player: Build or Pass       │                        │
│   └──────────────────────────────────┘                        │
│                                                                │
│   ──▶ Next player's turn                                      │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Robber Flow (Roll = 7)

```
┌───────────────────────────────────────────────────────┐
│                     ROBBER SEQUENCE                    │
│                                                        │
│   Step 1: DISCARD (if anyone has >7 cards)             │
│   ┌──────────────────────────────────────┐            │
│   │ Players with >7 cards must discard   │            │
│   │ half (rounded down)                  │            │
│   │                                      │            │
│   │ ┌─────────────────────────┐          │            │
│   │ │ Select cards to discard │          │            │
│   │ │ [Brick x2] [Ore x1]... │          │            │
│   │ │ "Discard 4 cards"      │          │            │
│   │ │ [Confirm]              │          │            │
│   │ └─────────────────────────┘          │            │
│   │                                      │            │
│   │ Simultaneous — all affected players  │            │
│   │ Timeout: 30s → auto-discard random   │            │
│   └──────────────────┬───────────────────┘            │
│                      ▼                                 │
│   Step 2: MOVE ROBBER                                  │
│   ┌──────────────────────────────────────┐            │
│   │ "Move the robber to a new hex"       │            │
│   │                                      │            │
│   │ Valid hexes highlighted              │            │
│   │ Click/drag robber to new hex         │            │
│   │ (must be different from current)     │            │
│   └──────────────────┬───────────────────┘            │
│                      ▼                                 │
│   Step 3: STEAL                                        │
│   ┌──────────────────────────────────────┐            │
│   │ If players have buildings adjacent:   │            │
│   │                                      │            │
│   │ 0 players → skip                    │            │
│   │ 1 player → auto-steal 1 random card │            │
│   │ 2+ players → "Choose victim"        │            │
│   │   [Player A (3 cards)]              │            │
│   │   [Player B (5 cards)]              │            │
│   └──────────────────┬───────────────────┘            │
│                      ▼                                 │
│              → TRADE & BUILD phase                     │
└───────────────────────────────────────────────────────┘
```

---

## 6. Trade Flow (Colonist.io Style)

```
┌───────────────────────────────────────────────────────────────┐
│                    TRADE NEGOTIATION                           │
│                                                                │
│   Active Player opens trade panel                              │
│                                                                │
│   Step 1: BUILD OFFER                                         │
│   ┌──────────────────────────────────────────┐                │
│   │  GIVING:     [+Brick] [+Lumber] ...     │                │
│   │              Brick x2                     │                │
│   │                                          │                │
│   │  WANTING:    [+Ore] [+Grain] ...         │                │
│   │              Ore x1                       │                │
│   │                                          │                │
│   │  [Propose Trade]                         │                │
│   └──────────────────────┬───────────────────┘                │
│                          ▼                                     │
│   Step 2: BROADCAST                                           │
│   ┌──────────────────────────────────────────┐                │
│   │  Offer appears for ALL other players:    │                │
│   │                                          │                │
│   │  "Alice offers 2 Brick for 1 Ore"       │                │
│   │                                          │                │
│   │  Each player sees:                       │                │
│   │    [✓ Accept]  [✗ Decline]  [↔ Counter]  │                │
│   └──────────────────────┬───────────────────┘                │
│                          │                                     │
│          ┌───────────────┼───────────────┐                    │
│          ▼               ▼               ▼                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────────┐           │
│   │  Accept  │    │ Decline  │    │   Counter    │           │
│   │          │    │ (grayed  │    │  "I'll give  │           │
│   │          │    │  out)    │    │   1 Ore for  │           │
│   │          │    │          │    │   3 Brick"   │           │
│   └────┬─────┘    └──────────┘    └──────┬───────┘           │
│        │                                 │                    │
│        ▼                                 ▼                    │
│   Step 3: ACTIVE PLAYER CONFIRMS                              │
│   ┌──────────────────────────────────────────┐                │
│   │  Active player sees responses:           │                │
│   │                                          │                │
│   │  Bob: ✓ Accepted                        │                │
│   │  Charlie: ↔ Counter (1 Ore for 3 Brick) │                │
│   │  Diana: ✗ Declined                      │                │
│   │                                          │                │
│   │  [Trade with Bob]                       │                │
│   │  [Accept Charlie's counter]             │                │
│   │  [Cancel trade]                         │                │
│   └──────────────────────┬───────────────────┘                │
│                          ▼                                     │
│   Step 4: EXECUTE                                             │
│   ┌──────────────────────────────────────────┐                │
│   │  Server validates both parties have       │                │
│   │  resources → atomic swap                  │                │
│   │                                          │                │
│   │  "Alice traded 2 Brick for 1 Ore         │                │
│   │   with Bob" (in game log)                │                │
│   └──────────────────────────────────────────┘                │
│                                                                │
│   BANK TRADE (separate flow):                                  │
│   ┌──────────────────────────────────────────┐                │
│   │  Select resource to give (auto-calc ratio)│                │
│   │  4:1 default, 3:1 generic harbor, 2:1    │                │
│   │  specific harbor                          │                │
│   │                                          │                │
│   │  GIVING: Brick x4  →  RECEIVING: Ore x1 │                │
│   │  [Trade with Bank]                       │                │
│   └──────────────────────────────────────────┘                │
└───────────────────────────────────────────────────────────────┘
```

---

## 7. Build Flow

```
┌─────────────────────────────────────────────────┐
│                   BUILD MODE                     │
│                                                  │
│  Player clicks build button (Road/Settlement/City)│
│                                                  │
│  ┌──────────────────────────────────┐           │
│  │ Board enters BUILD MODE:         │           │
│  │                                  │           │
│  │ Valid locations highlighted:      │           │
│  │  - Road: green lines on edges   │           │
│  │  - Settlement: green dots on    │           │
│  │    vertices (distance rule OK)  │           │
│  │  - City: green dots on own      │           │
│  │    settlements                  │           │
│  │                                  │           │
│  │ Invalid locations: dimmed/hidden│           │
│  │                                  │           │
│  │ [Cancel] button available       │           │
│  └──────────────┬───────────────────┘           │
│                 │                                │
│                 ▼                                │
│  Player clicks valid location                    │
│                 │                                │
│                 ▼                                │
│  ┌──────────────────────────────────┐           │
│  │ Client sends placement intent   │           │
│  │ Server validates + executes     │           │
│  │ Resources deducted              │           │
│  │ Building placed on board        │           │
│  │ All players see update          │           │
│  └──────────────────────────────────┘           │
│                                                  │
│  → Returns to TRADE & BUILD phase               │
│    (can build more or do other actions)          │
└─────────────────────────────────────────────────┘
```

---

## 8. Development Card Flow

```
┌─────────────────────────────────────────────────────┐
│               DEVELOPMENT CARD FLOWS                 │
│                                                      │
│  BUY: [Buy Dev Card] → deduct 1 Ore + 1 Grain +    │
│       1 Wool → card added to hand (face down)        │
│       Cannot play this turn.                         │
│                                                      │
│  PLAY (max 1 per turn):                              │
│                                                      │
│  KNIGHT:                                             │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ Play Knight  │───▶│ Move Robber  │───▶ Steal     │
│  │ from hand    │    │ (same as 7   │    sequence   │
│  │              │    │  robber flow) │               │
│  └──────────────┘    └──────────────┘               │
│  → Knights played count +1, check Largest Army       │
│                                                      │
│  ROAD BUILDING:                                      │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ Play Road    │───▶│ Place Road 1 │───▶ Place     │
│  │ Building     │    │ (free)       │    Road 2    │
│  └──────────────┘    └──────────────┘    (free)    │
│  → Check Longest Road                               │
│                                                      │
│  YEAR OF PLENTY:                                     │
│  ┌──────────────┐    ┌────────────────────┐         │
│  │ Play Year    │───▶│ Select 2 resources │         │
│  │ of Plenty    │    │ from bank          │         │
│  └──────────────┘    └────────────────────┘         │
│                                                      │
│  MONOPOLY:                                           │
│  ┌──────────────┐    ┌────────────────────┐         │
│  │ Play         │───▶│ Select 1 resource  │         │
│  │ Monopoly     │    │ type: all players  │         │
│  │              │    │ give you ALL of it │         │
│  └──────────────┘    └────────────────────┘         │
│                                                      │
│  VICTORY POINT:                                      │
│  Never played. Revealed only when claiming victory.  │
└─────────────────────────────────────────────────────┘
```

---

## 9. Game End Flow

```
┌─────────────────────────────────────────────────┐
│                    GAME END                      │
│                                                  │
│  Victory condition met (≥ target VP on turn):    │
│                                                  │
│  ┌──────────────────────────────────┐           │
│  │ Hidden VP cards revealed         │           │
│  │ Final VP calculated              │           │
│  │                                  │           │
│  │ ┌────────────────────────────┐   │           │
│  │ │     🏆 VICTORY SCREEN     │   │           │
│  │ │                            │   │           │
│  │ │  Winner: Alice (12 VP)    │   │           │
│  │ │                            │   │           │
│  │ │  Final Standings:          │   │           │
│  │ │  1. Alice  - 12 VP        │   │           │
│  │ │  2. Bob    -  8 VP        │   │           │
│  │ │  3. Bot    -  6 VP        │   │           │
│  │ │                            │   │           │
│  │ │  [Play Again] [Back to    │   │           │
│  │ │                Lobby]     │   │           │
│  │ └────────────────────────────┘   │           │
│  └──────────────────────────────────┘           │
│                                                  │
│  OR: <2 active players → game ends              │
│  → Last active player wins by default            │
└─────────────────────────────────────────────────┘
```
