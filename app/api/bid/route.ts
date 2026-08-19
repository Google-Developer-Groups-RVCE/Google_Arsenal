import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  BID_INCREMENT,
  BID_COOLDOWN_MS,
  S_TIER_CAP,
  A_TIER_CAP,
  ANTI_SNIPE_EXTENSION_MS,
} from "@/lib/auction";

/**
 * POST /api/bid
 * Body: { teamId: string }
 *
 * Leaderboard auction model (new):
 *  - Each team has ONE personal bid per lot, stored at /bidHistory/{lotId}/{teamId}.
 *  - Each BID tap raises that team's bid by BID_INCREMENT.
 *  - Purse is NOT deducted at bid time — only at lot close (clearing price).
 *  - The team must have enough purse to cover (current personal bid + BID_INCREMENT).
 *  - /currentLot.leaderboard is kept updated (top N sorted by amount desc) for display.
 *  - Tier caps removed — any team can bid on any S or A lot.
 *
 * Guardrail sequence:
 *  Pre-transaction (cheap reads):
 *   1. Cooldown check
 *   2. Lot open + not expired
 *   3. Purse check (must cover new bid amount)
 *  Inside transaction on /bidHistory/{lotId}/{teamId}:
 *   4. Atomically increment team's personal bid
 *  Post-commit:
 *   5. Recompute leaderboard + extend timer on /currentLot
 *   6. Update team.lastBidAt
 */
export async function POST(req: Request) {
  let teamId: string;

  try {
    const body = await req.json();
    teamId = body?.teamId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "teamId is required." }, { status: 400 });
  }

  const now = Date.now();

  // ── Pre-transaction: cheap reads ─────────────────────────────────────────
  const [teamSnap, lotSnap] = await Promise.all([
    adminDb.ref(`teams/${teamId}`).get(),
    adminDb.ref("currentLot").get(),
  ]);

  if (!teamSnap.exists()) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  if (!lotSnap.exists()) {
    return NextResponse.json({ error: "No active lot." }, { status: 409 });
  }

  const team = teamSnap.val() as {
    name: string;
    purse: number;
    lastBidAt: number;
    tierCounts: { S: number; A: number; B: number };
  };

  const lot = lotSnap.val() as {
    lotId: string;
    toolName: string;
    tier: "S" | "A" | "B";
    currentBid: number;
    startingPrice: number;
    maxWinners: number;
    leaderboard: { teamId: string; teamName: string; amount: number }[];
    endsAt: number;
    status: "open" | "closed";
  };

  // 1. Cooldown
  if (team.lastBidAt && now - team.lastBidAt < BID_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Too fast — wait a moment." },
      { status: 429 }
    );
  }

  // 2. Lot must be open and not expired
  if (lot.status !== "open") {
    return NextResponse.json({ error: "Lot already closed." }, { status: 409 });
  }
  if (now > lot.endsAt) {
    return NextResponse.json({ error: "Lot time has expired." }, { status: 409 });
  }

  // 3. Tier cap — team must not already own the max number of this tier
  const tierCounts = team.tierCounts ?? { S: 0, A: 0, B: 0 };
  if (lot.tier === "S" && tierCounts.S >= S_TIER_CAP) {
    return NextResponse.json({ error: "S-tier limit reached (max 1)." }, { status: 409 });
  }
  if (lot.tier === "A" && tierCounts.A >= A_TIER_CAP) {
    return NextResponse.json({ error: "A-tier limit reached (max 2)." }, { status: 409 });
  }

  // 3. Purse check: team must afford (their current bid on this lot) + BID_INCREMENT.
  //    Read their current personal bid from bidHistory first.
  const currentPersonalBidSnap = await adminDb
    .ref(`bidHistory/${lot.lotId}/${teamId}/amount`)
    .get();
  const currentPersonalBid: number = currentPersonalBidSnap.exists()
    ? currentPersonalBidSnap.val()
    : 0;

  const newPersonalBid = currentPersonalBid + BID_INCREMENT;

  if (team.purse < newPersonalBid) {
    return NextResponse.json({ error: "Not enough DevCoins." }, { status: 409 });
  }

  // ── Atomically record team's personal bid in bidHistory ──────────────────
  const bidEntryRef = adminDb.ref(`bidHistory/${lot.lotId}/${teamId}`);

  type TxStatus = string;
  let txStatus: TxStatus = "pending";
  let committedAmount = 0;

  try {
    const txResult = await bidEntryRef.transaction((current) => {
      if (current === null) {
        txStatus = "no-data";
        return null; // retry with real data
      }
      // Increment the team's bid (or create it at BID_INCREMENT if first bid)
      const prev = current?.amount ?? 0;
      committedAmount = prev + BID_INCREMENT;
      txStatus = "success";
      return {
        teamId,
        teamName: team.name,
        amount: committedAmount,
        timestamp: now,
      };
    });

    // Handle first-ever bid for this team on this lot (null → write)
    if (!txResult.committed && txStatus === "no-data") {
      // First bid — the path didn't exist yet, create it directly
      committedAmount = BID_INCREMENT;
      await bidEntryRef.set({
        teamId,
        teamName: team.name,
        amount: committedAmount,
        timestamp: now,
      });
      txStatus = "success";
    } else if (!txResult.committed) {
      return NextResponse.json({ error: "Bid failed — please try again." }, { status: 409 });
    }
  } catch (err) {
    console.error("Bid transaction error:", err);
    return NextResponse.json({ error: "Server error during bid." }, { status: 500 });
  }

  // ── Post-commit: recompute leaderboard + extend timer ────────────────────
  // Read all bids for this lot to build fresh leaderboard
  const allBidsSnap = await adminDb.ref(`bidHistory/${lot.lotId}`).get();
  const allBids: { teamId: string; teamName: string; amount: number }[] = [];
  if (allBidsSnap.exists()) {
    allBidsSnap.forEach((child) => {
      const b = child.val();
      allBids.push({ teamId: b.teamId, teamName: b.teamName, amount: b.amount });
    });
  }

  // Sort descending by amount, keep all for leaderboard display
  allBids.sort((a, b) => b.amount - a.amount);

  // Clearing price = amount of the maxWinners-th bid (0 if fewer bids)
  const maxWinners = lot.maxWinners ?? (lot.tier === "S" ? 4 : 6);
  const clearingPrice =
    allBids.length >= maxWinners
      ? allBids[maxWinners - 1].amount
      : allBids.length > 0
      ? allBids[allBids.length - 1].amount
      : lot.startingPrice;

  // Update currentLot: leaderboard + extend timer + currentBid = clearing price
  const newEndsAt = Math.max(lot.endsAt, now) + ANTI_SNIPE_EXTENSION_MS;
  await adminDb.ref("currentLot").update({
    leaderboard: allBids,
    currentBid: clearingPrice,
    // Keep a convenience field for the current leader (top bidder)
    currentBidderTeamId: allBids[0]?.teamId ?? null,
    currentBidderTeamName: allBids[0]?.teamName ?? null,
    endsAt: newEndsAt,
  });

  // Update team.lastBidAt
  await adminDb.ref(`teams/${teamId}/lastBidAt`).set(now);

  return NextResponse.json({
    success: true,
    newPersonalBid: committedAmount,
    clearingPrice,
    leaderboard: allBids,
  });
}
