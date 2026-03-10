# Brolonist — UX Reference Document

> A comprehensive UX reference for building Brolonist, a Catan-style board game for the web.
> Based on common UX patterns found in modern web-based Catan implementations.

---

## Table of Contents

1. [Login / Home Screen](#1-login--home-screen)
2. [Game Lobby](#2-game-lobby)
3. [Game Board](#3-game-board)
4. [Setup Phase](#4-setup-phase)
5. [Main Turn](#5-main-turn)
6. [Build Mode](#6-build-mode)
7. [Trading](#7-trading)
8. [Robber](#8-robber)
9. [Development Cards](#9-development-cards)
10. [Player Panels](#10-player-panels)
11. [Game Log / Chat](#11-game-log--chat)
12. [End Game](#12-end-game)

---

## 1. Login / Home Screen

### Layout & Positioning

- **Full-viewport background** — a stylized map or ocean scene with subtle parallax or slow pan animation.
- **Center card / modal** — contains the primary auth form; typically 400–480 px wide on desktop.
- **Top-left** — app logo/wordmark.
- **Top-right** — language selector, theme toggle (light/dark), volume icon.
- **Below the auth card** — social proof strip: "X players online", "Y games in progress."
- **Footer** — links to Terms, Privacy, Discord/community.

### Auth Options

| Priority | Method | Notes |
|----------|--------|-------|
| 1 | Guest / Play Now | Single click, auto-generates a temporary username (e.g., `Settler_8832`). Lowest friction entry. |
| 2 | Google OAuth | One-tap button with Google branding guidelines. |
| 3 | Discord OAuth | Common in gaming communities. |
| 4 | Email + Password | Traditional form; shown collapsed or behind a "More options" toggle to reduce visual noise. |

- After auth, the user lands on a **Home Dashboard** with:
  - **"Play" CTA** — large, centered, primary color. Opens the lobby or quick-match flow.
  - **Profile avatar + username** — top bar, clickable for settings/stats.
  - **Friends list sidebar** — collapsible, shows online friends with invite buttons.
  - **News / patch notes** — scrollable cards at the bottom or side.
  - **Shop / cosmetics** — if applicable, icon in top bar.

### Interaction Patterns

- Pressing Enter submits the active form.
- Guest flow skips all forms and goes straight to the lobby.
- OAuth flows open a popup window; the parent page listens for a postMessage callback.

### Visual Design Cues

- Warm, earthy color palette (tans, deep greens, ocean blues) to evoke the board game's feel.
- Auth card has a subtle drop shadow and rounded corners (8–12 px).
- Primary CTA uses a saturated warm color (amber/orange) that stands out from the muted background.

### Mobile

- Auth card fills the viewport width with horizontal padding (16 px).
- "Play Now" button is sticky at the bottom of the viewport.
- Social login buttons are full-width and stacked vertically.

### Sound

- Soft ambient ocean/seagull loop plays on the home screen (muted by default due to browser autoplay policies; a speaker icon pulses to invite the user to unmute).

---

## 2. Game Lobby

### Layout & Positioning

- **Two-column layout on desktop:**
  - **Left (≈65%)** — Game list / Create game area.
  - **Right (≈35%)** — Chat, friends online, or a preview panel.
- **Game list** — a scrollable table/card list:
  - Each row shows: host name, player count (`2/4`), map type, expansion toggles (icons), ELO range, join button.
  - Rows are color-coded: green = open slots, yellow = almost full, grey = in progress (spectate only).
- **Create Game button** — prominent, top-right of the game list panel.

### Create Game Form

Presented as a modal or slide-over panel:

| Field | Control | Default |
|-------|---------|---------|
| Game Name | Text input | `"{Username}'s Game"` |
| Max Players | Segmented control: 2 / 3 / 4 | 4 |
| Map | Dropdown or visual picker (Classic, Seafarers, custom) | Classic |
| Victory Points to Win | Stepper: 8–15 | 10 |
| Speed | Segmented: Slow (90s) / Normal (60s) / Fast (30s) / No Timer | Normal |
| Private | Toggle + invite code | Off |
| Bots to Fill | Toggle; if on, select bot difficulty (Easy / Medium / Hard) | Off |
| Expansions | Checkboxes for enabled expansions | None |

- **Start Game** button at the bottom — disabled until at least 2 players or bots are configured.

### Player List (Pre-Game Waiting Room)

- Shows player avatars, usernames, ELO badges, and a **Ready** toggle (green checkmark).
- Host has a crown icon and can kick players, change settings, or start the game.
- Empty slots show a ghost avatar with "Waiting…" or an "Add Bot" button.

### Ready States

- Each player slot transitions: `Empty → Joined → Ready`.
- When all players are ready, the "Start Game" button pulses/glows for the host.
- A countdown (3–2–1) appears center-screen before the board loads.

### Bot Configuration

- Bot slots show a robot icon, a difficulty dropdown, and an X button to remove.
- Host can adjust bot difficulty using a dropdown on the bot slot.
- Bots are always "ready."

### Interaction Patterns

- Double-click a game row to join directly.
- Hovering a game row reveals a tooltip with full settings.
- Pressing Escape closes modals.

### Visual Design Cues

- Joined players slide in with a quick ease-out animation.
- Ready checkmark animates from grey to green with a subtle scale bounce.
- The "Start Game" countdown uses large, centered numerals with a pulsing ring.

### Mobile

- Single-column layout; game list and chat are tabbed.
- Create game is a full-screen modal.
- Player list is a horizontal scroll of avatar circles below the game settings.

### Sound

- Join sound: a short wooden "clack."
- Ready sound: a bright chime.
- Countdown: tick-tick-tick with a deeper tone on "1."

---

## 3. Game Board

### Hex Rendering

- **Flat-top hexagons** arranged in the classic Catan spiral: 3-4-5-4-3 rows (19 hexes).
- Each hex is ≈80–100 px wide on a 1080p display; scales responsively.
- Hexes have a 1–2 px dark stroke and are filled with a **textured color** representing the terrain:

| Terrain | Fill Color | Texture Hint |
|---------|-----------|--------------|
| Forest (Wood) | Dark green `#2D6A2E` | Tree icons or grain pattern |
| Pasture (Wool) | Light green `#8FBC53` | Soft rolling hills |
| Fields (Wheat) | Golden yellow `#E8C840` | Wheat stalks |
| Hills (Brick) | Terracotta `#C45A30` | Clay/brick texture |
| Mountains (Ore) | Slate grey `#6B7B8D` | Rocky crags |
| Desert | Sandy tan `#D4B877` | No number token; robber starts here |

### Number Tokens

- Circular tokens (≈30–36 px diameter) centered on each hex.
- White/cream fill with dark text.
- Numbers **6 and 8** are rendered in **red** and slightly larger or bold to signal high probability.
- Font: a serif or slab-serif face for a classic feel.
- Dots below the number indicate probability (one dot per frequency out of 36): e.g., 6 and 8 get 5 dots.

### Harbors (Ports)

- Located on the coastline edges between two specific vertices.
- Visual: a small dock/pier icon or a colored triangle pointing inward.
- Label shows the trade ratio: "3:1" (generic) or "2:1" with a resource icon.
- Harbor lines extend from the coast to the two adjacent vertex positions.

### Water & Frame

- Water hexes surround the island — rendered as a blue gradient or animated wave pattern.
- The board may sit on a subtle "table" background (wood texture) with a vignette.

### Robber Visual

- A dark pawn/figure icon (~40 px tall) sitting on the desert hex at game start.
- Semi-transparent shadow beneath it.
- When on a terrain hex, it overlays the number token with a slight darkening effect, signaling that hex is blocked.

### Edges, Vertices, and Buildings

- **Roads** — colored rectangles (player color) along hex edges; ≈6 px wide, 40 px long.
- **Settlements** — small house icons at vertices; ≈20×20 px, filled with player color, dark stroke.
- **Cities** — larger building icons (church/tower shape) at vertices; ≈28×28 px, same color scheme.
- All buildings have a 1 px dark outline for legibility against any terrain.

### Interaction Patterns

- Hovering a hex highlights it with a faint glow or border change.
- Clicking a hex is used during robber placement.
- Vertices and edges become interactive only when the player is in build mode (see §6).

### Visual Design Cues

- The board has a slight 3D perspective tilt (5–10°) on desktop for depth; flat on mobile for usability.
- Terrain hexes may have a very subtle inner shadow to create a "pressed into the board" look.
- Player colors are highly saturated and accessible: red `#E74C3C`, blue `#3498DB`, orange `#F39C12`, white `#ECF0F1` (with dark outlines).

### Mobile

- Board fills the viewport and is pannable/zoomable (pinch-to-zoom).
- Double-tap to re-center.
- UI overlays (buttons, panels) are pushed to screen edges or hidden behind a hamburger.

### Sound

- No persistent board sound; ambient ocean or nature sounds are optional (settings toggle).

---

## 4. Setup Phase

### Overview

The setup phase consists of two rounds:

1. **Round 1** — Each player places 1 settlement + 1 road, in turn order (P1 → P2 → P3 → P4).
2. **Round 2** — Reverse order (P4 → P3 → P2 → P1), each places 1 settlement + 1 road. Players receive starting resources from their second settlement's adjacent hexes.

### Turn Indicator

- A banner or toast at the top of the board: **"Place your first settlement"** or **"Waiting for {PlayerName}…"**
- The active player's panel is highlighted (glowing border or a pulsing indicator dot).
- A turn-order strip (horizontal row of player avatars) shows a moving pointer.

### Placement Prompts

- **Step 1: Place Settlement**
  - All **valid vertices** light up as translucent circles or pulsing dots in the player's color.
  - Invalid vertices (too close to existing settlements, i.e., violating the distance rule) remain hidden or greyed out.
  - Hovering a valid vertex shows a **ghost settlement** — a semi-transparent house icon in the player's color at that position.
  - Clicking confirms the placement; the ghost becomes solid with a brief scale-up animation.

- **Step 2: Place Road**
  - After the settlement is placed, all **valid edges** adjacent to that settlement light up.
  - Hovering shows a ghost road segment.
  - Clicking confirms the road.
  - The prompt banner updates: "Road placed! Waiting for next player…"

### Ghost Preview of Buildings

- Ghost buildings are rendered at 40–50% opacity in the player's color.
- They track the cursor/finger position, snapping to the nearest valid vertex or edge.
- On mobile, valid positions are shown as tap targets (slightly enlarged hit area, ≈44×44 px minimum).

### Interaction Patterns

- Only the active player can interact with the board; other players see a "Waiting…" overlay or dimmed controls.
- If the player clicks an invalid position, nothing happens (no error toast — just no response).
- The "Undo" option may be available for the settlement placement before the road is placed (implementation choice).

### Visual Design Cues

- Valid placement indicators use a soft pulsing animation (opacity oscillates 0.4–0.7 over 1.5s).
- Confirmed placements trigger a small particle burst (confetti or sparkle) in the player's color.
- The board may subtly zoom to the area of action for the active player's placement.

### Mobile

- Valid positions are rendered as larger circles (touch-friendly).
- A confirm button appears after tapping a position (to prevent accidental placement), or a long-press flow is used.
- A small "zoom to my turn" button auto-scrolls to the relevant board area.

### Sound

- Settlement placed: a satisfying wooden "thunk."
- Road placed: a lighter "click."
- Turn transition: a short ascending chime.

---

## 5. Main Turn

### Turn Structure

Each turn follows this flow:

```
Roll Dice → Distribute Resources → (If 7: Discard + Robber) → Actions (Build, Trade, Play Dev Card) → End Turn
```

### Dice Roll

- **Roll button** — large, centered or bottom-center; shows two dice icons. Pulses when it's the player's turn to roll.
- **Click to roll:**
  - Two 3D dice animate (tumble/bounce) for ≈1–1.5 seconds before landing.
  - The result appears as large bold numerals next to or above the dice.
  - If the result is **7**, the numerals flash red and a warning icon appears.
- **Auto-roll option** — a settings toggle for faster games; dice roll automatically after a brief delay.

### Dice Roll Animation

- Dice start at random orientations and tumble with a physics-like bounce.
- Final face is revealed with a brief "lock-in" shake.
- The sum is displayed prominently (60–80 px font) for 2–3 seconds, then shrinks into the game log.

### Resource Distribution Popup

- After the roll, a brief overlay or toast (1.5–2.5s) shows which players received which resources.
- Format: a horizontal strip of resource cards fanning out, grouped by player.
  - Example: `🟢 Alice: 🪵×2, 🧱×1  |  🔵 Bob: 🌾×1`
- Resources animate from the board hex (slide + fade) into the player's hand area.
- If the active player receives resources, their resource count updates with a brief "+N" floating number animation.

### Resource Distribution on 7

- **Discard phase** — any player with more than 7 resource cards must discard half (rounded down).
  - A modal appears for those players: shows their hand with checkboxes or tap-to-select.
  - A counter at the top: "Select 4 cards to discard (4/4 selected)" with a confirm button.
  - Other players see: "Waiting for {PlayerName} to discard…"
- After discards resolve, the active player must move the robber (see §8).

### Action Buttons Layout

After rolling, the active player sees a row of action buttons (bottom bar or side panel):

| Button | Icon | Shortcut | Notes |
|--------|------|----------|-------|
| Build | Hammer | `B` | Opens build mode (§6) |
| Trade | Handshake | `T` | Opens trade panel (§7) |
| Buy Dev Card | Card + "?" | `D` | Purchases from the deck if resources permit |
| Play Dev Card | Card + star | `P` | Opens the dev card hand |
| End Turn | Check / Arrow | `E` or `Enter` | Ends the turn; disabled until dice are rolled |

- Buttons are greyed out / disabled when the player cannot afford or perform that action.
- Tooltips on hover show the cost or reason for being disabled.
- **End Turn** button may require a confirmation click if the player hasn't taken any action (to prevent misclicks).

### Timer

- If a turn timer is enabled, a countdown bar appears below the action buttons or around the player's avatar.
- At 10 seconds remaining, the bar turns red and pulses.
- At 0, the turn auto-ends (or the player is prompted to hurry with a toast).

### Interaction Patterns

- Only the active player's action buttons are enabled; other players see them greyed or hidden.
- Keyboard shortcuts are shown as small labels on each button.
- Right-click or long-press on a button shows a tooltip with cost/details.

### Visual Design Cues

- The dice roll result hex on the board briefly highlights (the corresponding terrain hexes glow).
- Resources "fly" from the highlighted hexes to the player panels with a particle trail.
- The active player's panel has a glowing border or animated turn indicator.

### Mobile

- Action buttons are in a fixed bottom bar (safe area aware).
- Dice roll is triggered by tapping a floating dice button or by shaking the device (accelerometer, if implemented).
- Resource distribution popup is a compact toast that auto-dismisses.

### Sound

- Dice rolling: a rattle/tumble sound effect.
- Dice landing: a pair of thuds.
- Resource received: a quick "collect" chime (coin-like).
- 7 rolled: ominous drum hit or warning tone.
- End turn: a soft click.

---

## 6. Build Mode

### Entering Build Mode

- Triggered by clicking the **Build** button or pressing `B`.
- The board enters an overlay mode: all non-interactive elements dim slightly (15–20% darker).

### Valid Placement Highlighting

- **Roads:**
  - All edges where the player can legally build glow in the player's color at 50% opacity.
  - Valid edges must be adjacent to the player's existing roads, settlements, or cities.
  - Hovering an edge shows the ghost road; clicking places it.

- **Settlements:**
  - All vertices where the player can legally build a settlement glow as pulsing circles.
  - Must be connected to the player's road network and obey the distance rule.
  - Hovering shows the ghost house; clicking places it.

- **Cities (upgrades):**
  - Existing settlements that can be upgraded glow with an upward-arrow icon.
  - Clicking upgrades the settlement to a city with a brief "construction" animation.

### Build Menu / Cost Panel

A small floating panel appears (anchored to the build button or bottom bar) showing the buildable items and their costs:

```
┌──────────────────────────────────────┐
│  🛤  Road        🪵 + 🧱           │
│  🏠 Settlement   🪵 + 🧱 + 🌾 + 🐑 │
│  🏰 City         🌾×2 + ⛰×3        │
│  🃏 Dev Card     🌾 + 🐑 + ⛰       │
└──────────────────────────────────────┘
```

- Items the player can afford are highlighted; others are greyed with a "need X more" annotation.
- Clicking a category in the menu filters the board highlights to only that building type.

### Click-to-Build Flow

1. Player clicks **Build** → build menu appears.
2. Player selects a category (e.g., Road) → board shows valid edges.
3. Player hovers → ghost preview snaps to nearest valid edge.
4. Player clicks → road is placed, resources deducted, build menu stays open for continued building.
5. Player clicks **Build** again or presses `Esc` → exits build mode.

### Interaction Patterns

- Pressing `Esc` or clicking outside the build area exits build mode.
- If the player runs out of resources for any item, that item greys out in real-time.
- Multiple buildings can be placed in a single build mode session without re-opening the menu.
- "Undo last build" button may appear for 3 seconds after each placement (implementation choice).

### Visual Design Cues

- Ghost buildings render at 40% opacity with a dashed outline.
- Placement confirmation: the building "pops" into existence with a quick scale animation (0 → 110% → 100%).
- Invalid areas have no visual indicator (they simply aren't interactive — reduces visual noise).
- A brief cost deduction animation plays in the resource panel: numbers decrement with a red flash.

### Mobile

- Build menu is a bottom sheet that slides up.
- Valid placements are shown as enlarged tap targets.
- After tapping a valid position, a confirmation popup appears: "Build road here? ✓ ✗"
- Pinch-to-zoom is active in build mode for precision.

### Sound

- Entering build mode: a subtle "open toolbox" click.
- Road placed: wooden snap.
- Settlement placed: construction hammering (short).
- City upgraded: a heavier stone-setting sound.
- Not enough resources: a dull buzz or muted "denied" tone.

---

## 7. Trading

> **This is the most complex and important UX flow in the game.**

### Trade Flow Overview

```
Open Trade Panel → Select Offer (Give / Want) → Broadcast to Players →
  → Other Players: Accept / Decline / Counter-Offer →
    → Initiator: Accept a counter or finalize original →
      → Trade Executes → Panel Closes or Resets
```

### 7.1 Opening the Trade Panel

- Click the **Trade** button or press `T`.
- A trade panel slides in from the right (desktop) or up from the bottom (mobile).
- The panel has two main sections: **"You Give"** and **"You Get"**, and a row of trade partner options.

### 7.2 Offer Builder

The offer builder is a two-row resource selector:

```
┌─────────────────────────────────────────────────┐
│  YOU GIVE                                       │
│  🪵 [−][0][+]  🧱 [−][0][+]  🐑 [−][0][+]    │
│  🌾 [−][0][+]  ⛰  [−][0][+]                    │
│─────────────────────────────────────────────────│
│  YOU GET                                        │
│  🪵 [−][0][+]  🧱 [−][0][+]  🐑 [−][0][+]    │
│  🌾 [−][0][+]  ⛰  [−][0][+]                    │
│─────────────────────────────────────────────────│
│  [📢 Offer to All]  [🏦 Bank Trade]  [Cancel]  │
└─────────────────────────────────────────────────┘
```

**Interaction details:**

- Each resource has a **stepper** (`−` / `+` buttons) or the player can click the resource icon to increment (click to add 1, shift-click to remove 1).
- The "You Give" section only allows selecting resources the player actually has (capped at current count).
- The "You Get" section is uncapped (you can ask for any amount).
- Resource icons are color-coded and labeled for clarity.
- The offer is only valid (buttons enabled) when **both sides have at least 1 resource selected**.

### 7.3 Trade with Other Players (Broadcasting Offers)

- Clicking **"Offer to All"** broadcasts the trade to all opponents.
- The trade panel transitions to a **"Waiting for responses"** state:
  - Shows the offer summary: "Offering 🪵×2 for 🌾×1"
  - Below: a row of opponent avatars with status indicators:
    - ⏳ Thinking… (default)
    - ✅ Accepted
    - ❌ Declined
    - 🔄 Counter-offered
  - A **Cancel Offer** button is available.

**What other players see:**

- A notification banner slides in (top or side): **"{PlayerName} wants to trade!"**
- Clicking the notification opens a mini trade modal:

```
┌───────────────────────────────────────┐
│  🟢 Alice offers:                     │
│  Gives: 🪵×2                          │
│  Wants: 🌾×1                          │
│                                       │
│  [✅ Accept]  [❌ Decline]  [🔄 Counter] │
└───────────────────────────────────────┘
```

### 7.4 Counter-Offers

- Clicking **Counter** opens a modified offer builder pre-filled with the original trade, but the responder can adjust quantities.
- The counter-offer is sent **only to the original proposer** (not broadcast).
- The initiator sees the counter appear in their waiting panel:
  - `"🔵 Bob counters: Wants 🪵×3 instead of 🪵×2"`
  - Buttons: **[Accept Counter]** **[Decline]**
- Multiple counter-offers from different players can be displayed simultaneously as stacked cards.

### 7.5 Accepting / Declining

- **Accept:** Resources are exchanged instantly. A brief animation shows resources sliding between the two player panels. The trade panel closes.
- **Decline:** The responder's avatar shows ❌. If all players decline, the initiator sees "No one accepted your trade" and the panel resets.
- **Initiator accepts a counter-offer:** same as above — resources exchange, panel closes.
- If the initiator has multiple acceptances (e.g., two players accepted), they choose which player to trade with (click their avatar).

### 7.6 Bank / Port Trade

- Clicking **"Bank Trade"** switches the panel to a bank trade mode.
- Default ratio is **4:1** (four of one resource for one of any other).
- If the player has a relevant harbor, the ratio updates:
  - **3:1 generic harbor** → any resource at 3:1.
  - **2:1 specific harbor** → that resource at 2:1.
- The panel shows the available ratios for each resource:

```
┌─────────────────────────────────────────────┐
│  BANK TRADE                                 │
│                                             │
│  🪵  4:1          🧱  2:1 (harbor!)        │
│  🐑  4:1          🌾  3:1 (harbor)         │
│  ⛰   4:1                                    │
│                                             │
│  Give: [🧱×2]  →  Get: [🪵×1]              │
│                                             │
│  [✅ Trade]  [Cancel]                        │
└─────────────────────────────────────────────┘
```

- Clicking a "Give" resource auto-fills the count based on the ratio.
- Clicking a "Get" resource selects what to receive.
- The trade executes immediately on confirmation (no negotiation).

### 7.7 Trade Restrictions & Edge Cases

- Players **cannot trade on another player's turn** (trade button is disabled).
- Players **cannot trade if they just rolled a 7** and the discard/robber phase hasn't resolved.
- **Domestic trade (player-to-player)** is only available during the active player's turn, but any player can respond.
- The initiator can **cancel** a pending trade at any time.
- If the initiator's resources change (e.g., they build something) while a trade is pending, the offer is automatically cancelled.
- **Embargo / block** — some implementations allow players to ignore or auto-decline trades from specific players (social feature).

### 7.8 Trade Notification Behavior

- Trade offers appear as non-blocking notifications; players can ignore them.
- Notifications auto-dismiss after 30 seconds if no response, or when the initiator cancels.
- A small badge on the trade button indicates pending incoming offers.

### Visual Design Cues

- The "You Give" section has a **red-tinted background** (giving away).
- The "You Get" section has a **green-tinted background** (receiving).
- Resource icons in the trade panel are larger than in the resource bar (≈32–40 px) for easy interaction.
- Accepted trades trigger a brief "handshake" animation between the two player panels.
- Counter-offers are visually distinct: a blue-bordered card vs. the original amber-bordered offer.

### Mobile

- Trade panel is a full-screen bottom sheet.
- Resource steppers are replaced with tap-to-increment (tap resource icon to add to Give; long-press to add to Get — or a toggle switch between the two rows).
- Incoming trade offers appear as a swipeable notification banner at the top.
  - Swipe right = accept, swipe left = decline, tap = view details / counter.
- Bank trade uses a simple "select give → select get" two-step flow with large tap targets.

### Sound

- Offer broadcast: a "calling" bell sound.
- Offer received: a notification chime.
- Trade accepted: a satisfying "cha-ching" or coin sound.
- Trade declined: a soft thud.
- Counter-offer: a questioning tone (rising pitch).

---

## 8. Robber

### Trigger

The robber phase activates when:

1. A player rolls a **7**, or
2. A player plays a **Knight** development card.

### Moving the Robber

- The robber icon on the current hex begins to glow or pulse, indicating it must be moved.
- A prompt banner: **"Move the robber to a new hex."**
- All terrain hexes (except the one the robber is currently on) become interactive.
- **Hover:** a semi-transparent robber ghost appears on the hovered hex; the hex border glows red.
- **Click (desktop) / Tap (mobile):** the robber animates (slides or arcs) to the new hex.
- The hex's number token is visually obscured (darkened overlay) to signal it's blocked.

### Victim Selection

- After placing the robber, if the chosen hex has **settlements/cities belonging to multiple opponents**, a modal or inline prompt appears:
  - **"Steal a card from:"** with a list of eligible players.
  - Each player option shows: avatar, username, card count (number only — cards are hidden).
  - If only one opponent is adjacent, the steal is automatic (no prompt).
  - If no opponents are adjacent, no steal occurs.
- Clicking a player steals 1 random resource card from them.
- The stolen card is revealed to the stealer (brief flash of the resource icon) but hidden from other players.
  - Other players see: "{ActivePlayer} stole a card from {Victim}" in the game log.

### Interaction Patterns

- The player **must** move the robber — they cannot skip this action.
- They **cannot** place the robber on the desert hex (some rulesets allow this; implementation choice).
- Clicking the robber's current hex does nothing.
- On mobile, a long-press on a hex shows a tooltip preview before confirming.

### Visual Design Cues

- The robber darkens its hex by overlaying a 30–40% black fill.
- Moving the robber triggers a dust-cloud particle effect at the departure and arrival hexes.
- The victim selection modal shows player colors prominently.
- The stolen resource animates from the victim's panel to the active player's panel.

### Sound

- Robber movement: a heavy footstep / thud.
- Stealing a card: a sneaky "swipe" or rustling sound.
- Rolling 7 warning: ominous drum or deep bell.

---

## 9. Development Cards

### Card Types

| Card | Count in Deck | Type |
|------|---------------|------|
| Knight | 14 | Instant (play anytime before/after rolling) |
| Victory Point | 5 | Passive (auto-revealed at game end or when winning) |
| Road Building | 2 | Instant (place 2 free roads) |
| Year of Plenty | 2 | Instant (take any 2 resources from bank) |
| Monopoly | 2 | Instant (name a resource; all players give you theirs) |

### Card Display

- Dev cards appear in a **hand area** at the bottom of the screen (desktop) or accessible via a tab/button (mobile).
- Cards are rendered as small card icons (≈60×90 px) showing the card art/icon and name.
- **Unplayable cards** (e.g., bought this turn) are slightly greyed or have a "NEW" badge.
- **Victory Point cards** may be hidden or shown face-down to the owning player with a "VP" label.
- Hovering a card shows a **tooltip** with the full card description and effect.

### Play Flow by Card Type

#### Knight
1. Player clicks the Knight card → it lifts/scales up with a glow.
2. Confirmation prompt: "Play Knight?" → [Play] [Cancel].
3. On confirm, the robber phase triggers (same UX as §8).
4. The Knight card moves to a "played" area. The player's army count increments.
5. If the player now has the largest army (≥3 knights, more than any other), a "Largest Army" badge animates onto their player panel.

#### Road Building
1. Player clicks Road Building → confirmation prompt.
2. On confirm, the board enters build mode for roads only (see §6), but with **2 free placements**.
3. A counter shows: "Roads remaining: 2" → "1" → "Done!"
4. If the player has no valid road placements, remaining roads are forfeited.

#### Year of Plenty
1. Player clicks Year of Plenty → confirmation prompt.
2. A resource picker modal appears: "Choose 2 resources from the bank."
3. Five resource icons are shown; the player clicks two (can be the same type).
4. Selected resources highlight with a checkmark. A counter: "2/2 selected."
5. Confirm → resources added to hand.

#### Monopoly
1. Player clicks Monopoly → confirmation prompt.
2. A resource picker modal: "Name a resource. All players must give you theirs."
3. Player clicks one of the five resource icons.
4. Confirm → all opponents' cards of that type are transferred.
5. Animation: resource cards fly from all opponent panels to the active player.
6. Game log: "{Player} played Monopoly on 🌾 and collected 6 wheat."

#### Victory Point (Passive)
- These are not "played" — they sit in the hand and are auto-counted toward the player's VP total.
- They are hidden from other players until the game ends or the player reaches the winning VP count.
- When revealed, they flip with a card-turn animation.

### Interaction Patterns

- Dev cards **cannot** be played on the turn they are purchased (they have a "NEW" badge and are greyed out).
- Only **one** dev card can be played per turn (except VP cards, which are passive).
- The "Play Dev Card" button in the action bar shows a badge with the count of playable cards.
- Right-clicking a dev card shows its details without playing it.

### Visual Design Cues

- Playing a card triggers a "card slam" animation: the card enlarges to center-screen, glows, then dissolves into its effect.
- The played cards area (visible to all) shows face-up played cards next to each player's panel.
- Largest Army badge: a sword-and-shield icon, animated on acquisition with a brief flash.

### Mobile

- Dev cards are accessed via a "Cards" tab or a swipe-up hand tray at the bottom.
- Tapping a card shows a full-screen preview with Play/Cancel buttons.
- Resource pickers use large, full-width tap targets.

### Sound

- Buying a dev card: a mysterious "unwrap" or card-draw sound.
- Playing Knight: a metallic sword clash.
- Monopoly: a dramatic cash-register or "cha-ching."
- Year of Plenty: a cheerful collection jingle.
- Road Building: construction sounds.

---

## 10. Player Panels

### Layout

Player panels are arranged along the edges of the screen:

- **Desktop:** The active player's panel is at the **bottom**. Opponents are across the **top** or along the **right side**, ordered by turn sequence.
- **Mobile:** The active player's panel is at the bottom. Opponents are in a collapsible strip at the top; tapping expands detail.

### Own Player Panel (Bottom)

```
┌──────────────────────────────────────────────────┐
│  [Avatar] PlayerName ⭐ 4 VP                      │
│                                                    │
│  🪵 3   🧱 2   🐑 1   🌾 4   ⛰ 0                 │
│                                                    │
│  Dev Cards: [🃏][🃏][🃏]    Knights: 2  Roads: 6   │
│  🏆 Longest Road (5)                               │
└──────────────────────────────────────────────────┘
```

- **Resources** are shown as icons with counts, always visible.
- **Dev cards** are shown as card backs with a count; clickable to expand the hand.
- **VP** count includes visible points (settlements, cities, longest road, largest army) and is updated in real-time.
- **Achievement badges**: "Longest Road" and "Largest Army" are shown as small icons/badges when held.

### Opponent Panels

```
┌───────────────────────────────────┐
│  [Avatar] OpponentName ⭐ 3 VP   │
│  Cards: 7  |  Dev: 2  |  ⚔ 1    │
│  🏠×3  🏰×1  🛤×8                │
└───────────────────────────────────┘
```

- **Card count** — total resource cards (number only, not types — hidden information).
- **Dev card count** — number of unplayed dev cards (not types).
- **Knight count** (⚔) — played knights, visible to all.
- **Building counts** — settlements, cities, roads placed.
- **VP** — only publicly visible VP (hidden VP cards are not counted here for opponents).
- Panels are color-coded with a thick left border or background tint matching the player's color.

### Active Turn Indicator

- The active player's panel has:
  - A glowing/pulsing border.
  - A small animated icon (e.g., an hourglass or arrow).
  - Their avatar may have a subtle animation (bounce or glow).
- Inactive panels are slightly dimmed.

### Interaction Patterns

- Clicking an opponent's panel shows a detailed popup: full stats, trade history this game, and a "Propose Trade" shortcut.
- Hovering an opponent's avatar shows a tooltip with their username and ELO.
- Resource counts in the own panel update with brief +/− animations.

### Visual Design Cues

- Resources that just changed (gained or lost) briefly flash: green for gained, red for lost.
- VP changes trigger a star burst animation on the VP counter.
- Achievement badges (Longest Road / Largest Army) have a subtle shimmer animation.
- Player colors are consistent everywhere: panel border, buildings on board, game log entries.

### Mobile

- Own resources are shown as a compact horizontal bar at the bottom.
- Tapping the resource bar expands it into a detailed view.
- Opponent panels are horizontal-scrollable cards at the top of the screen.
- Tapping an opponent card expands it into a detail overlay.

### Sound

- Gaining VP: a level-up chime.
- Losing longest road / largest army: a deflating tone.
- Gaining longest road / largest army: a triumphant brass hit.

---

## 11. Game Log / Chat

### Game Log

- A scrollable panel on the right side (desktop) or accessible via a tab (mobile).
- Typical dimensions: 280–320 px wide, full height.
- Shared with the chat input at the bottom.

### Event Formatting

Each log entry follows a consistent format:

```
[Timestamp] 🟢 Alice rolled 8.
[Timestamp] 🟢 Alice received 🪵×1, 🌾×2.
[Timestamp] 🔵 Bob built a settlement.
[Timestamp] 🟠 Carol played Knight.
[Timestamp] 🟠 Carol moved the robber to (hex).
[Timestamp] 🟠 Carol stole a card from 🔵 Bob.
[Timestamp] 🟢 Alice traded 🪵×2 for 🌾×1 with 🔵 Bob.
[Timestamp] 🔴 Dave bought a development card.
```

- **Player names** are rendered in their player color (bold).
- **Resource icons** are inline with text.
- **Timestamps** are relative: "just now", "1m ago", or HH:MM.
- Critical events (roll 7, longest road change, VP milestones) are highlighted with a colored background stripe.
- The log auto-scrolls to the latest entry unless the player has manually scrolled up.

### Player Colors in Log

- Each player has a color dot (●) or a colored name that persists throughout the log.
- Colors match the player panel and board piece colors exactly.

### Chat

- Below the game log (same panel) or toggled via a tab (Log | Chat).
- Simple text input at the bottom: placeholder "Type a message…", send on Enter.
- Chat messages are formatted:
  ```
  🟢 Alice: gg wp
  🔵 Bob: nice trade!
  ```
- Player names are clickable (for quick trade proposals or mentions).
- **Emoji support** — at minimum, standard Unicode emoji.
- **Predefined quick-chat** — buttons or shortcuts for common phrases: "Good game!", "Nice!", "Hurry up!", "No thanks." (Especially useful on mobile or for language barriers.)
- **Profanity filter** — implementation should include a basic word filter.

### Interaction Patterns

- Clicking a log entry involving a board action (e.g., "built a settlement") could highlight that location on the board briefly.
- Chat messages support basic markdown-like formatting (bold with `**`, but keep it simple).
- Scroll-to-bottom button appears when the user has scrolled up and new messages arrive.

### Visual Design Cues

- The game log has a slightly darker background than the board area for contrast.
- New unread entries (when scrolled up) trigger a "New messages ↓" badge at the bottom of the log.
- Chat messages have a subtle slide-in animation.
- System messages (e.g., "Game started", "Player disconnected") are rendered in italics with a grey color.

### Mobile

- Game log and chat are in a collapsible bottom sheet or a swipe-up overlay.
- Quick-chat buttons are shown above the keyboard when the chat input is focused.
- The log is accessible via a small floating "📜" icon that shows a badge count for unread events.
- The keyboard pushes the chat input up (standard mobile behavior).

### Sound

- Chat message received: a subtle pop or ping.
- Critical game events (longest road change, etc.): a distinct notification chime.
- No sound for routine log entries (to avoid noise fatigue).

---

## 12. End Game

### Trigger

The game ends when a player reaches the required VP total (default: 10) **during their turn**. This includes:

- Settlements (1 VP each)
- Cities (2 VP each)
- Longest Road (2 VP)
- Largest Army (2 VP)
- Victory Point dev cards (1 VP each, now revealed)

### Victory Screen

- A full-screen overlay fades in with a celebratory animation.
- **Winner announcement:**
  - Large text: **"🏆 {PlayerName} Wins!"** in their player color.
  - Confetti / fireworks particle effects.
  - The winner's avatar is centered, enlarged, with a golden border/crown.

### Final Scores

A scoreboard table appears below the winner announcement:

```
┌────────────────────────────────────────────────────────────┐
│  Rank  │  Player      │  VP  │  Breakdown                  │
│────────│──────────────│──────│─────────────────────────────│
│  🥇 1  │  🟢 Alice    │  10  │  🏠×3 🏰×2 🏆LR 🃏×1      │
│  🥈 2  │  🔵 Bob      │   8  │  🏠×2 🏰×2 ⚔LA            │
│  🥉 3  │  🟠 Carol    │   6  │  🏠×4 🏰×1                 │
│     4  │  🔴 Dave     │   4  │  🏠×2 🏰×1                 │
└────────────────────────────────────────────────────────────┘
```

- **VP Breakdown** shows which sources contributed to each player's score.
- Hidden VP cards are **now revealed** for all players with a flip animation.
- Longest Road and Largest Army holders are annotated.

### Post-Game Actions

Below the scoreboard, a row of buttons:

| Button | Action |
|--------|--------|
| 🔁 Play Again | Creates a new game with the same settings and players (invites everyone back). |
| 📊 Stats | Shows detailed game stats: longest road length, most resources collected, total trades, etc. |
| 🏠 Home | Returns to the lobby. |
| 📤 Share | Copies a shareable link or screenshot of the final board state. |

### Interaction Patterns

- Players can still view the final board state behind the overlay (clicking "View Board" or closing the overlay).
- The game log is still accessible for review.
- Chat remains active for post-game conversation.
- After 60 seconds, the overlay auto-minimizes to a small banner so players can review the board.

### Visual Design Cues

- Confetti particles use all four player colors.
- The scoreboard rows slide in sequentially (1st → 2nd → 3rd → 4th) with a 200ms stagger.
- VP reveal animation: hidden VP cards flip one at a time with a dramatic pause.
- The overall tone shifts from competitive to celebratory: warm golden lighting, relaxed background music.

### Mobile

- Victory screen is a full-screen modal with a scrollable scoreboard.
- Confetti is reduced in particle count for performance.
- "Play Again" and "Home" buttons are sticky at the bottom.
- Share button uses the native OS share sheet.

### Sound

- Victory: a triumphant fanfare (brass + strings, 3–4 seconds).
- VP cards revealing: a card-flip sound for each.
- Scoreboard appearance: a drumroll or ascending scale.
- Background music shifts to a relaxed, celebratory loop.

---

## Appendix A: Global Visual Design System

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary Action | Amber | `#F5A623` |
| Positive / Confirm | Green | `#27AE60` |
| Negative / Cancel | Red | `#E74C3C` |
| Info / Neutral | Blue | `#3498DB` |
| Background (Dark) | Charcoal | `#2C3E50` |
| Background (Light) | Ivory | `#FDF6E3` |
| Surface / Card | Off-White | `#F8F4ED` |
| Text (Primary) | Near-Black | `#1A1A2E` |
| Text (Secondary) | Grey | `#7F8C8D` |

### Player Colors

| Slot | Color | Hex | Notes |
|------|-------|-----|-------|
| P1 | Red | `#E74C3C` | High contrast on all terrains |
| P2 | Blue | `#3498DB` | Distinct from water |
| P3 | Orange | `#F39C12` | Distinct from wheat/desert |
| P4 | White | `#ECF0F1` | Dark outline required |

### Typography

| Element | Font | Size (Desktop) | Size (Mobile) |
|---------|------|----------------|---------------|
| H1 (Winner announcement) | Bold serif | 48 px | 32 px |
| H2 (Section headers) | Bold sans-serif | 24 px | 20 px |
| Body (log, chat) | Regular sans-serif | 14 px | 13 px |
| Numbers on hexes | Serif / Slab | 18 px | 14 px |
| Resource counts | Monospace or tabular | 16 px | 14 px |

### Animation Principles

- **Duration:** Micro-interactions 150–300ms, major transitions 400–600ms.
- **Easing:** `ease-out` for entrances, `ease-in` for exits, `spring` for bouncy feedback.
- **Reduce motion:** Respect `prefers-reduced-motion` — disable particle effects, reduce animation durations to 0.

### Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| ≥1280 px | Desktop (full layout with side panels) |
| 768–1279 px | Tablet (collapsible panels, slightly smaller board) |
| <768 px | Mobile (stacked layout, bottom sheets, full-screen modals) |

---

## Appendix B: Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` or `R` | Roll dice |
| `B` | Toggle build mode |
| `T` | Open trade panel |
| `D` | Buy development card |
| `P` | Play development card |
| `E` or `Enter` | End turn |
| `Esc` | Close active modal/panel, exit build mode |
| `Tab` | Cycle through opponent panels |
| `?` | Show keyboard shortcuts overlay |
| `M` | Toggle sound/music |

---

## Appendix C: Accessibility Considerations

- **Color-blind modes:** Offer pattern overlays on player pieces (stripes, dots, crosshatch) in addition to color. Terrain hexes should also have distinct icons in addition to color fills.
- **Screen reader:** Announce turn changes, dice results, trade offers, and game state changes via ARIA live regions.
- **Keyboard navigation:** All interactive elements must be focusable and operable via keyboard (Tab/Enter/Escape).
- **High contrast mode:** Support system-level high contrast preferences.
- **Font scaling:** UI should remain functional at up to 200% browser zoom.
- **Touch targets:** Minimum 44×44 px on mobile (per WCAG 2.5.5).

---

*Document version: 1.0 — Last updated: $(date +%Y-%m-%d)*
*For Brolonist development use. Based on common UX patterns in Catan-style web games.*
