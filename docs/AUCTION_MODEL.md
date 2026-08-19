# Auction Logic — Tiers, Rules, and Guardrails

## Tier & Tool Table

| Tier | Tool | Base Price | Copies |
|---|---|---|---|
| S | Google Antigravity | 60 | 4 |
| S | Firebase Studio | 60 | 4 |
| S | Gemini 2.5 Pro | 60 | 4 |
| S | Vertex AI Agent Builder | 60 | 4 |
| A | Firebase (Firestore/RTDB + Auth) | 30 | 6 |
| A | Google AI Studio | 30 | 6 |
| A | Google Colab | 30 | 6 |
| A | Android Studio + Jetpack Compose | 30 | 6 |
| A | Apps Script + Workspace APIs | 30 | 6 |
| B | Maps Platform API | 12 | Unlimited |
| B | Cloud Vision / Speech-to-Text | 12 | Unlimited |
| B | Looker Studio / Sheets API | 12 | Unlimited |
| B | Translate API | 12 | Unlimited |
| B | Forms API + Fonts/Material assets | 12 | Unlimited |

## Auction Model

### S & A Tier — Leaderboard / Clearing-Price Auction

Each S or A tool runs as a **single lot** (not one lot per copy). All teams bid simultaneously during the lot window.

**Closing resolution:**
- S-tier: top 4 bidders all win one copy each. Every winner pays the **4th-highest bid** (the clearing price).
- A-tier: top 6 bidders all win one copy each. Every winner pays the **6th-highest bid**.
- If fewer than N teams bid, all bidders win at the lowest bid placed.

**Example (S-tier, 4 winners):**
- Team A bids 80, Team B bids 75, Team C bids 70, Team D bids 65, Team E bids 60.
- Top 4 winners: A, B, C, D. All four pay **65 DC** (the 4th bid).

### B Tier — Fixed-Price, First-Come-First-Served

B-tier is fixed-price, ungated, unlimited. Any team can buy any B-tier tool at its base price (12 DC) any time by clicking BUY — no auction, just a purse check.

## Constants (in `lib/auction.ts`)

- `STARTING_PURSE = 120`
- `BID_INCREMENT = 5` (each BID click raises your personal stake by 5)
- `LOT_DURATION_MS = 15000`
- `ANTI_SNIPE_EXTENSION_MS = 5000`
- `BID_COOLDOWN_MS = 1000` (per team, prevents accidental double-taps)
- `S_TIER_COPIES = 4` (winners per S-tier lot)
- `A_TIER_COPIES = 6` (winners per A-tier lot)
- `S_TIER_CAP = 1` (max S-tier tools a team can **own** — enforced at bid time)
- `A_TIER_CAP = 2` (max A-tier tools a team can **own** — enforced at bid time)

## Lot lifecycle

1. `/lotQueue` is built at auction start — **one entry per S/A tool** (not per copy). Each entry has `maxWinners` (4 for S, 6 for A). Queue is shuffled.
2. On "Start" or after previous lot closes, the next entry from `/lotQueue` is written to `/currentLot` with `status: "open"`, `leaderboard: []`, and `endsAt = now + LOT_DURATION_MS`.
3. Teams bid during the window. Each team's personal bid is stored at `/bidHistory/{lotId}/{teamId}`. After each bid, `/currentLot.leaderboard` is updated with all bids sorted descending.
4. Lot closes when any client detects `Date.now() > endsAt` and calls `/api/lot/close`. The handler is idempotent — only the first caller transitions state.
5. On close: read all bids from `/bidHistory/{lotId}`, sort descending, take top `maxWinners` as winners. Clearing price = amount of the last winner. Deduct clearing price from each winner's purse and add the tool to their `ownedTools` in one multi-path update.
6. Open next lot, or set `auctionState.status = "finished"` if queue is empty.

## `/api/bid` guardrail sequence

Reject immediately (cheap reads) if:
1. **Cooldown:** `now - team.lastBidAt < BID_COOLDOWN_MS` → "too fast, wait a moment."
2. **Lot not open:** `currentLot.status !== "open"` → "lot already closed."
3. **Lot expired:** `Date.now() > currentLot.endsAt` → "lot time has expired."
4. **Tier cap (ownership):** if `currentLot.tier === "S"` and `team.tierCounts.S >= S_TIER_CAP` → "S-tier limit reached (max 1)." Same check for A tier against `A_TIER_CAP`.
5. **Purse:** `team.purse < (team's current bid on this lot + BID_INCREMENT)` → "not enough DevCoins."

Inside atomic transaction on `/bidHistory/{lotId}/{teamId}`:
5. Increment team's personal bid by `BID_INCREMENT`.

Post-commit:
6. Re-read all bids for the lot, sort, recompute leaderboard + clearing price.
7. Update `/currentLot` with new leaderboard, clearing price, and extended `endsAt`.
8. Update `team.lastBidAt`.

## Key design decisions

- **Purse deducted at close, not at bid time.** A team's purse is only spent when the lot closes. This means the displayed purse does not shrink during bidding — only the winning clearing price is deducted. Teams need purse ≥ their current bid to keep bidding.
- **No tier caps per team.** Any team can bid on any S or A tool. The number of winners is capped by `maxWinners`, not by per-team limits.
- **Clearing price = Nth bid.** All winners pay the same price — the lowest winning bid — making it fair to bid aggressively.