import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { LOT_DURATION_MS } from "@/lib/auction";

/**
 * POST /api/lot/close
 * Body: { force?: boolean }  (force = skip timer check)
 *
 * Leaderboard / clearing-price resolution:
 *  1. Close the lot atomically (idempotent).
 *  2. Read all bids from /bidHistory/{lotId} (one entry per team).
 *  3. Sort bids descending; take top maxWinners as winners.
 *  4. Clearing price = amount of the maxWinners-th bid.
 *     (If fewer bids than maxWinners, clearing price = lowest bid.)
 *  5. For every winner: deduct clearingPrice from purse, add tool to ownedTools,
 *     increment tierCounts — all in a single multi-path update.
 *  6. Advance to next lot, or set auction finished.
 */
export async function POST(req: Request) {
  try {
    let force = false;
    try {
      const body = await req.json();
      force = !!body.force;
    } catch {
      // ignore, body might be empty
    }

    const lotRef = adminDb.ref("currentLot");
    let txStatus: "no-data" | "already-closed" | "not-expired" | "success" = "success";

    const txResult = await lotRef.transaction((currentData) => {
      if (currentData === null) {
        txStatus = "no-data";
        return null; // retry
      }

      if (currentData.status === "closed") {
        txStatus = "already-closed";
        return undefined; // abort — idempotent
      }

      if (!force && Date.now() <= currentData.endsAt) {
        txStatus = "not-expired";
        return undefined; // abort
      }

      return {
        ...currentData,
        status: "closed",
      };
    });

    if (!txResult.committed) {
      return NextResponse.json({ success: true, message: txStatus });
    }

    // We are the one who closed it — process the results.
    const closedLot = txResult.snapshot.val();
    const updates: Record<string, any> = {};

    // ── 1. Resolve winners from bidHistory ───────────────────────────────
    const allBidsSnap = await adminDb.ref(`bidHistory/${closedLot.lotId}`).get();
    const allBids: { teamId: string; teamName: string; amount: number }[] = [];

    if (allBidsSnap.exists()) {
      allBidsSnap.forEach((child) => {
        const b = child.val();
        if (b && b.teamId && typeof b.amount === "number") {
          allBids.push({ teamId: b.teamId, teamName: b.teamName, amount: b.amount });
        }
      });
    }

    // Sort descending by bid amount
    allBids.sort((a, b) => b.amount - a.amount);

    const maxWinners: number = closedLot.maxWinners ?? (closedLot.tier === "S" ? 4 : 6);
    const winners = allBids.slice(0, maxWinners);

    // Clearing price = amount of the last winner (Nth bid)
    const clearingPrice = winners.length > 0 ? winners[winners.length - 1].amount : 0;

    // ── 2. Award each winner ─────────────────────────────────────────────
    for (const winner of winners) {
      const teamSnap = await adminDb.ref(`teams/${winner.teamId}`).get();
      if (!teamSnap.exists()) continue;

      const teamData = teamSnap.val();
      const newPurse = Math.max(0, (teamData.purse ?? 0) - clearingPrice);

      updates[`teams/${winner.teamId}/purse`] = newPurse;

      // Add to ownedTools (array)
      const ownedTools = Array.isArray(teamData.ownedTools) ? [...teamData.ownedTools] : [];
      ownedTools.push({
        toolId: closedLot.toolId,
        toolName: closedLot.toolName,
        tier: closedLot.tier,
        pricePaid: clearingPrice,
        acquiredAt: Date.now(),
      });
      updates[`teams/${winner.teamId}/ownedTools`] = ownedTools;

      // Increment tierCounts
      const tierCounts = teamData.tierCounts ?? { S: 0, A: 0, B: 0 };
      tierCounts[closedLot.tier] = (tierCounts[closedLot.tier] ?? 0) + 1;
      updates[`teams/${winner.teamId}/tierCounts`] = tierCounts;
    }

    // Store winners + clearing price on the closed lot for post-game reference
    updates[`currentLot/winners`] = winners;
    updates[`currentLot/clearingPrice`] = clearingPrice;

    // ── 3. Advance to next lot ───────────────────────────────────────────
    const stateSnap = await adminDb.ref("auctionState").get();
    const queueSnap = await adminDb.ref("lotQueue").get();

    if (stateSnap.exists() && queueSnap.exists()) {
      const state = stateSnap.val();
      const queue = queueSnap.val();

      const nextIndex = state.currentLotIndex + 1;

      if (nextIndex < queue.length) {
        const nextLot = queue[nextIndex];
        updates["auctionState/currentLotIndex"] = nextIndex;
        updates["currentLot"] = {
          ...nextLot,
          currentBid: nextLot.startingPrice,
          currentBidderTeamId: null,
          currentBidderTeamName: null,
          leaderboard: [],
          endsAt: Date.now() + LOT_DURATION_MS,
          status: "open",
        };
      } else {
        updates["auctionState/status"] = "finished";
        updates["currentLot"] = null;
      }
    }

    // Commit all updates atomically
    if (Object.keys(updates).length > 0) {
      await adminDb.ref().update(updates);
    }

    return NextResponse.json({
      success: true,
      processedLotId: closedLot.lotId,
      winners,
      clearingPrice,
    });
  } catch (err) {
    console.error("Error closing lot:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
