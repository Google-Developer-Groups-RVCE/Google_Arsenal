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

S and A tiers go through the live bidding flow below. B tier is fixed-price, ungated, unlimited — a team can grab any number of B-tier tools at 12 coins each any time, no auction needed for those (implement as a simple "buy" write with only a purse check).

## Constants (put these in `lib/auction.ts`, not hardcoded inline)
- `STARTING_PURSE = 120`
- `BID_INCREMENT = 5`
- `LOT_DURATION_MS = 15000`
- `ANTI_SNIPE_EXTENSION_MS = 5000`
- `BID_COOLDOWN_MS = 1000` (per team, prevents accidental double-taps)
- `S_TIER_CAP = 1`
- `A_TIER_CAP = 2`

## Lot lifecycle
1. `/lotQueue` is built once, at auction start, as a flattened list — every individual copy of every S/A tool is its own entry (16 S-tier lots + 30 A-tier lots = 46 total). Order can be shuffled or fixed; doesn't affect logic.
2. `/api/lot/close` with no active lot (or on operator "Start") pulls the next entry from `/lotQueue`, writes it to `/currentLot` with `startingPrice` as `currentBid`, `currentBidderTeamId: null`, and `endsAt = now + LOT_DURATION_MS`.
3. Lot stays `open` until any client detects `Date.now() > endsAt` and calls `/api/lot/close`.
4. `/api/lot/close` is idempotent: if `/currentLot/status` is already `"closed"` when the handler runs, do nothing and return success. Only the first caller actually transitions state — this is what makes "any client can trigger it" safe.
5. On close: if there was a winning bidder, update their team's `purse`, `ownedTools`, and `tierCounts` in the same transaction (or immediately after, guarded by the lot's closed status so it only runs once). Push the result into `/auctionState.currentLotIndex + 1` and open the next lot, or set `auctionState.status = "finished"` if the queue is empty.

## `/api/bid` guardrail sequence (run in this order, inside a Firebase transaction on `/currentLot`)
Reject immediately, before touching the transaction, if:
1. **Cooldown:** `now - team.lastBidAt < BID_COOLDOWN_MS` → reject as "too fast, wait a moment."
2. **Already winning:** `team.id === currentLot.currentBidderTeamId` → reject as "you're already the highest bid."
3. **Tier cap:** if `currentLot.tier === "S"` and `team.tierCounts.S >= S_TIER_CAP` → reject as "S-tier limit reached." Same pattern for A tier against `A_TIER_CAP`.
4. **Purse:** if `team.purse < currentLot.currentBid + BID_INCREMENT` → reject as "not enough DevCoins."

Then, inside the transaction:
5. Re-read `/currentLot` fresh (transactions retry automatically on conflict — this is what makes concurrent taps resolve correctly instead of corrupting state).
6. If `status !== "open"` → reject as "lot already closed."
7. Compute `newBid = currentLot.currentBid + BID_INCREMENT`. Set `currentBid = newBid`, `currentBidderTeamId = team.id`, `currentBidderTeamName = team.name`.
8. Extend `endsAt = max(currentLot.endsAt, now) + ANTI_SNIPE_EXTENSION_MS`.
9. Commit. On success, update `team.lastBidAt = now` and append an entry to `/bidHistory/{lotId}`.

## Why the order matters
Checks 1-4 are cheap reads that reject the obviously-invalid cases before paying for a transaction. Checks 5-8 happen inside the transaction because they depend on state that can change between another team's concurrent bid landing — re-reading fresh data inside the transaction (step 5) is what prevents two teams from both "winning" the same lot at once.