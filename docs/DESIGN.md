# Design — Tokens, Typography, and Visual Direction

This app has two audiences in two physical contexts: a phone in an excited team member's hand, and a laptop feeding a projector across a room. They should not look like the same design system turned up or down — they're deliberately different. Read the split below before styling anything.

## Design tokens

```
colors: {
  'text': '#f1f5f9',
  'background': '#080812',
  'primary': '#00e5ff',
  'secondary': '#7c3bed',
  'accent': '#ff29d4',
},
```

Add this to `tailwind.config`'s `theme.extend.colors` exactly as above. Use the semantic names throughout components (`text-primary`, `bg-background`, etc.) — never hardcode a hex value inline.

## Typography

- **Headers:** General Sans, Semibold (600)
- **Body:** General Sans, Regular (400)
- Source: [Fontshare](https://www.fontshare.com/fonts/general-sans) — free, self-hostable. Either pull the `.woff2` files into `/public/fonts` or use Fontshare's CDN link; set up as `font-heading` (Semibold) and `font-body` (Regular) in the Tailwind font-family config, not a single `font-sans` override.
- Bid amounts, the timer, and purse numbers should sit slightly heavier than surrounding body text so they're scannable at a glance — the one place mixing weights within body copy is intentional.

## Direction 1 — Bidder page: simple, utilitarian, phone-first

- Single column, generous spacing, nothing decorative. This screen is used by someone excited and slightly panicked with 5 seconds on the clock — if an element doesn't help them bid in the next 2 seconds, it doesn't belong here.
- Background: solid `background`, no gradients, no patterns.
- Top-to-bottom order: tool name + logo (medium size) → current bid (large, bold, `primary`) → countdown (large, bold, shifts to `accent` under ~5 seconds as an urgency cue) → purse remaining (small pill, top corner) → the Bid button, dominating the lower half of the screen.
- **Bid button:** full-width, `primary` fill, dark text for contrast, subtle glow when enabled. When disabled: muted gray fill with the rejection reason ("Purse too low," "S-tier limit reached") shown directly on or under the button — never make them guess why it's greyed out.
- No stat tables, no decorative rings, no background imagery. Optimize for one-handed, half-second glances.

## Direction 2 — Dashboard: IPL-auction-inspired, desktop-first, projector-ready

Take the visual language of a live player-auction broadcast graphic (see reference: TATA IPL Auction player card — dark backdrop, circular player photo with a dotted ring, bold name, bordered stat rows, bottom price bar, decorative circular dial) and reskin it in this palette:

- **Background:** `background` base with a very subtle grid or radial glow in `secondary` at low opacity — echoes the circuit texture behind the player card without being busy.
- **Central card:** the tool's logo inside a circular frame with a dotted/segmented ring border in `primary`, with a soft glow around it — the same treatment the reference gives the player photo.
- **Tool name:** large, bold, `font-heading`, in `text` color — same visual weight as the player's name in the reference.
- **Tier badge:** small pill beside the name, colored per tier (`accent` for S, `secondary` for A, a muted neutral for B) — stands in for the "AGE 31 / BATTER" tag in the reference.
- **Mini stat row:** a thin-bordered table styled after the T20/IPL/T20I rows in the reference, repurposed to show Tier / Base Price / Copies Left / Category. `primary`-tinted borders, tabular numerals for alignment.
- **Countdown ring:** repurpose the reference's decorative circular dial into a *functional* countdown — a ring that visually depletes toward `endsAt`, gradient from `primary` to `accent` as urgency rises. The one spot where decoration and function are the same element.
- **Current bid bar:** full-width bar across the bottom, echoing the reference's "BASE PRICE ₹75L" bar, but reading "CURRENT BID" with the live number in large `font-heading` type and the leading team's name beside it.
- **Lot close:** flash "SOLD" in `accent` with a brief scale/glow animation before transitioning to the next lot — worth spending your animation budget here specifically.
- **Next-up strip:** small, muted/low-opacity thumbnail of the following lot tucked in a corner, brightening as it becomes current.
- **Access:** this entire screen sits behind `/dashboard/login` (Firebase Auth, single operator account). Fold Start/Pause/Skip/Force-Close controls directly into this authenticated view — no need to hide them behind a query param anymore.

### Results view (same dashboard, same login, post-auction)
- Grid of team cards, same dark background and glow-bordered-card language as the live view, but calmer — no countdown ring, no flashing.
- Each card: team name (`font-heading`), member names (small, `text` at reduced opacity), and their won tools as small tier-colored badges (reuse the live view's tier badge style for continuity).
- This is the screen left up during pitches. Legibility from across the room beats density — paginate or let it scroll rather than shrinking text past projector-readable size.

## What not to carry over
Don't let the dashboard's visual richness bleed into the bidder page, and don't let the bidder page's plainness bleed into the dashboard. If a component feels like it belongs equally on both, it's probably wrong for at least one of them.