<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Google Arsenal: Bid & Build

## What this is
A live, real-time bidding app for a GDG Bangalore induction event. 20 teams bid virtual "DevCoins" on Google/Google AI tools (tiered S/A/B) through their phones. A password-gated projector dashboard shows the live auction, then flips into a results screen once bidding ends. The bidder experience is phone-only and deliberately simple; the dashboard is desktop-only and visually elaborate.

Read `docs/PROJECT_BRIEF.md` for the full product spec, `docs/DATA_MODEL.md` for the database schema, `docs/AUCTION_LOGIC.md` for the exact bidding rules, and `docs/DESIGN.md` for colors, typography, and the two distinct visual directions before writing any code. These four files are the source of truth — don't invent requirements that contradict them.

## Tech stack (do not substitute)
- **Framework:** Next.js (App Router), single project
- **Styling:** Tailwind CSS only — no component library, no CSS-in-JS
- **Realtime data:** Firebase Realtime Database (RTDB), not Firestore
- **Server logic:** Next.js API routes deployed as Vercel serverless functions (`/api/register`, `/api/bid`, `/api/lot/close`)
- **Auth:** two different mechanisms, don't mix them up. Teams/bidders use a team code (PIN) + `localStorage` token only — no accounts. The dashboard is different: it's a single shared operator login, gated by **Firebase Authentication (email/password)** with one manually-created account in the Firebase console (no self-registration flow, no sign-up page). This is the one exception to "no auth library" — do not add NextAuth or anything else on top of it.
- **Hosting:** Vercel (frontend + API routes), Firebase Spark free tier (database)

## Project structure (target)
```
/app
  /register          → team registration page (phone)
  /bid                → bidder interface (phone-only, simple)
  /dashboard          → login-gated, desktop-only — live auction view, switches to results view when finished
  /dashboard/login     → operator email/password login
  /api/register       → creates team, generates code
  /api/bid            → validates + writes a bid (the guardrail logic lives here)
  /api/lot/close       → closes current lot, advances queue (idempotent)
/lib
  firebase.ts          → client SDK init
  firebaseAdmin.ts      → admin SDK init (server-only)
  auction.ts            → shared constants (tiers, prices, copies, increment, lot duration)
/docs
  PROJECT_BRIEF.md
  DATA_MODEL.md
  AUCTION_LOGIC.md
  DESIGN.md
```

## Non-negotiable architectural rules
1. **RTDB is the single source of truth.** Every page reads live via `onValue` listeners — never poll, never fetch-once for anything that changes during the auction.
2. **Timer is an absolute timestamp (`endsAt`), never a countdown number stored in the DB.** Clients compute their own countdown from `endsAt - Date.now()`. This avoids drift between devices.
3. **All validation (purse, tier cap, cooldown, bid > current) happens server-side in `/api/bid`, inside a Firebase transaction on the current lot node.** Client-side checks (disabling the button) are UX only, never trust them as the real gate.
4. **Lot closing is idempotent and can be triggered by any client** (dashboard or a bidder page notices `endsAt` has passed). The server handler must safely no-op if the lot is already closed.
5. **Keep it minimal.** No state management library (Context/useState is enough), no ORM, no CSS framework beyond Tailwind, no backend beyond Vercel functions + Firebase. This is a weekend build for a one-time event, not a production SaaS.
6. **The bidder page and the dashboard follow deliberately different visual directions** — see `docs/DESIGN.md`. Don't carry decorative dashboard elements (glow rings, stat tables) onto the bidder page, and don't make the dashboard look like a plain form. They're different audiences (a phone in someone's hand vs. a projector across a room).
7. **Every route under `/dashboard` must check Firebase Auth state server-side or on mount and redirect to `/dashboard/login` if unauthenticated.** Don't rely on the route just not being linked anywhere — it must actually be gated.

## Environment variables needed
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```
(Admin credentials are server-only — never prefix with `NEXT_PUBLIC_`, never expose to client bundles.)

## Commands
- `npm run dev` — local dev server
- `vercel --prod` — deploy
- No test suite required for this project; prioritize a working dry run over test coverage.

## Definition of done
A registration page that generates a working team code; a bidder page (phone only) that correctly blocks invalid bids (over-purse, tier-capped, spam-clicked) and shows live state; a dashboard that's unreachable without logging in, shows the current lot, timer, and auto-advances while the auction is live, then automatically switches to a per-team results view (name, members, tools won) once `auctionState.status === "finished"` — verified with at least 3 simultaneous browser sessions bidding against each other before considering any milestone complete.
