# Project Brief — Google Arsenal: Bid & Build

## Context
GDG Bangalore induction event for first-year CSE students. 20 teams bid virtual DevCoins on Google/Google AI tools, then pitch a one-line idea using their haul. The bidding itself is a ~15-20 minute live segment, run through this app, projected on a screen.

## Screens

### 1. Registration (`/register`)
- Mobile-friendly, filled once per team by the team captain before the event.
- Fields: team name, list of member names (add/remove rows).
- On submit: creates a team record in RTDB with `purse: 120`, empty `ownedTools`, and generates a short numeric **team code** (4 digits, must be unique).
- Shows the generated code clearly on-screen afterward — this is the team's only credential.

### 2. Bidder Interface (`/bid`)
- **Phone-only. This is not a responsive "also works on mobile" page — design and build for a phone screen first, and don't worry about desktop layout at all.**
- One session per team. Entry: team enters their code once; a session token is stored in `localStorage` so they don't re-enter it.
- Displays: current tool name + logo, current highest bid, countdown timer, team's remaining purse, team's owned tools so far.
- One **Bid** button that bids `currentBid + increment`.
- Button must be disabled (with a short reason shown) whenever the guardrails in `AUCTION_LOGIC.md` would reject the bid — see that doc for the exact rule set.
- Should feel instant: optimistic disable-on-tap, then reconcile with server response.
- **Visually, keep this simple** — see `DESIGN.md`. It needs to be readable at a glance by someone excited and slightly panicked with 5 seconds on the clock, not a showpiece. No decorative elements competing with the bid button.

### 3. Projector Dashboard (`/dashboard`)
- **Desktop-only.** Large, centered layout designed for a projector across a room — don't spend effort on mobile/tablet breakpoints here at all.
- **Login-gated.** `/dashboard` redirects to `/dashboard/login` if there's no authenticated Firebase Auth session. One shared operator account, created manually in the Firebase console — no sign-up flow. This isn't just a hidden URL anymore; it's a real login screen with email + password fields.
- **Live view** (while `auctionState.status === "live"`): current tool name + logo, current bid amount, current leading team, live countdown, "next up" preview of the following lot. Visual style is the IPL-auction-inspired direction in `DESIGN.md` — this screen is meant to look dramatic on a projector, unlike the bidder page.
- Since the dashboard already requires login, fold the operator controls directly into this page rather than hiding them behind a query param: Start Auction, Pause, Skip Lot, Force-Close Current Lot, visible once logged in.
- **Results view** (once `auctionState.status === "finished"`): the same authenticated page automatically swaps to a grid of every team — team name, members, and the tools they won, grouped/badged by tier. This is read directly from `/teams` in RTDB; no new data is needed, just a different render of existing state. This is the "big reveal" screen left up during the pitch phase.

## Non-functional requirements
- Must handle 20-25 concurrent devices (teams + dashboard) without degradation — see `AUCTION_LOGIC.md` for how bid contention is resolved.
- Bidder page must be usable one-handed on a phone in portrait orientation.
- Dashboard must be legible on a projector from across a room — no small text, no low-contrast colors, no responsive collapsing to a mobile layout (it will never be opened on a phone).
- No page should require app installation — everything runs in a mobile browser.
- Keep total dependencies minimal; this favors fast vibecoding and easy debugging during rehearsal over architectural purity.

## Open decisions (confirm before/while building — defaults are usable as-is)
- **Bid increment:** default fixed at +5 DevCoins per bid (see `auction.ts` constant).
- **Lot duration:** default 15 seconds, +5s per valid bid (anti-snipe). Confirm this feels right in a dry run — adjust the constant, not the logic.
- **Bidder visibility:** default shows the current leading team's name on the dashboard for drama. Flip to anonymous if that changes team behavior undesirably in testing.