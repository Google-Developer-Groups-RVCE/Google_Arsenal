# Data Model — Firebase Realtime Database

RTDB is a single JSON tree. This is the intended shape. Keep node names exactly as written so the API routes and pages agree on structure.

```
/teams
  /{teamId}                     // push-generated id
    name: string
    members: string[]
    code: string                 // 4-digit join PIN, unique across teams
    purse: number                 // starts at 120, decreases as bids win
    ownedTools: {
      "{toolId}": { tier: "S"|"A"|"B", price: number }
    }
    tierCounts: { S: number, A: number, B: number }  // for fast cap checks
    lastBidAt: number             // ms timestamp, for per-team cooldown

/lotQueue                        // ordered list, built once at auction start
  /{index}: {
    lotId: string
    toolId: string
    toolName: string
    tier: "S" | "A" | "B"
    logoUrl: string
    basePrice: number
  }
  // Flattened: one entry per physical copy. e.g. Antigravity appears 4 times
  // (S-tier, 4 copies), Firebase (RTDB+Auth) appears 6 times (A-tier), etc.
  // B-tier tools are NOT in this queue — they're fixed-price, ungated, and
  // handled by a separate "instant buy" write straight from the bidder page.

/currentLot
  lotId: string
  toolId: string
  toolName: string
  tier: "S" | "A" | "B"
  logoUrl: string
  startingPrice: number
  currentBid: number
  currentBidderTeamId: string | null
  currentBidderTeamName: string | null
  endsAt: number                 // absolute ms timestamp — see AGENTS.md rule 2
  status: "open" | "closed"

/auctionState
  status: "not_started" | "live" | "paused" | "finished"
  currentLotIndex: number         // pointer into /lotQueue

/bidHistory
  /{lotId}
    /{pushId}: { teamId: string, teamName: string, amount: number, timestamp: number }
  // append-only log, useful for dispute resolution and a post-event recap
```

## Notes
- **Dashboard login is not stored here.** The operator account lives entirely in Firebase Authentication, created manually in the console. Don't add a `/admins` node or anything similar to RTDB for this.
- **The post-auction results view needs no new node.** Once `auctionState.status === "finished"`, render the results screen straight from `/teams` — every team's `name`, `members`, and `ownedTools` are already there.
- `ownedTools` and `tierCounts` are denormalized onto the team record on purpose — the `/api/bid` guardrail check needs to read a single team node, not scan the whole queue, to stay fast under concurrent load.
- `bidHistory` is write-only during the event (nobody needs to read it live) — cheap to keep, useful afterward.
- Don't store `currentBid` as a countdown or duration anywhere. Only `endsAt` as an absolute timestamp — re-derive everything else from it client-side.