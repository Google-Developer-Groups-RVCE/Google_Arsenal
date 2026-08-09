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
 * Guardrail sequence per AUCTION_MODEL.md:
 *  Pre-transaction (cheap reads):
 *   1. Cooldown check
 *   2. Already-winning check
 *   3. Tier cap check
 *   4. Purse check
 *  Inside transaction (re-reads fresh data from server):
 *   5. Lot still open + not expired
 *   6. Write new bid, extend endsAt
 *  Post-commit:
 *   7. Update team.lastBidAt
 *   8. Append to /bidHistory
 *
 * NOTE on null-first behaviour:
 *  The Firebase Admin SDK (WebSocket mode) calls the transaction update
 *  function with `null` on the first invocation when the path isn't in its
 *  local cache. Returning `undefined` (bare `return;`) from that call aborts
 *  immediately — we never see the real data. Instead we return `null`, which
 *  tells Firebase "set to null". Firebase then detects a conflict with the
 *  actual server data and retries the function with the real value. We
 *  distinguish a genuine "null committed" outcome via txStatus.
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

  // ── Pre-transaction: cheap reads to reject obvious failures early ─────────
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
    currentBidderTeamId: string | null;
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

  // 2. Already winning
  if (lot.currentBidderTeamId === teamId) {
    return NextResponse.json(
      { error: "You're already the highest bidder." },
      { status: 409 }
    );
  }

  // 3. Tier cap
  const tierCounts = team.tierCounts ?? { S: 0, A: 0, B: 0 };
  if (lot.tier === "S" && tierCounts.S >= S_TIER_CAP) {
    return NextResponse.json({ error: "S-tier limit reached." }, { status: 409 });
  }
  if (lot.tier === "A" && tierCounts.A >= A_TIER_CAP) {
    return NextResponse.json({ error: "A-tier limit reached." }, { status: 409 });
  }

  // 4. Purse
  const nextBid = lot.currentBid + BID_INCREMENT;
  if (team.purse < nextBid) {
    return NextResponse.json({ error: "Not enough DevCoins." }, { status: 409 });
  }

  // ── Firebase transaction on /currentLot ───────────────────────────────────
  // Track what happened inside the update function so we can distinguish
  // "null-first retry" from "genuine abort".
  type TxStatus = "pending" | "no-data" | "not-open" | "expired" | "success";
  let txStatus = "pending" as TxStatus;
  let committedBid = 0;

  const lotRef = adminDb.ref("currentLot");

  try {
    const txResult = await lotRef.transaction((currentData) => {
      // ── Null-first handling ──────────────────────────────────────────────
      // Firebase Admin SDK may call with null when the path isn't cached yet.
      // Returning null (not undefined) causes Firebase to detect a conflict
      // with the real server data and retry with the actual current value.
      if (currentData === null) {
        txStatus = "no-data";
        return null; // triggers retry with real server data
      }

      // 5a. Lot must be open
      if (currentData.status !== "open") {
        txStatus = "not-open";
        return undefined; // abort
      }

      // 5b. Lot must not have expired
      if (Date.now() > currentData.endsAt) {
        txStatus = "expired";
        return undefined; // abort
      }

      // 6. Write new bid + extend timer
      committedBid = currentData.currentBid + BID_INCREMENT;
      txStatus = "success";

      return {
        ...currentData,
        currentBid: committedBid,
        currentBidderTeamId: teamId,
        currentBidderTeamName: team.name,
        endsAt:
          Math.max(currentData.endsAt, Date.now()) + ANTI_SNIPE_EXTENSION_MS,
      };
    });

    // txResult.committed = false means the update function returned undefined
    // txStatus = "no-data" + committed = true means we wrote null (lot gone)
    if (!txResult.committed || txStatus !== "success") {
      const messages: Record<string, string> = {
        "no-data": "No active lot.",
        "not-open": "Lot already closed.",
        "expired": "Lot time has expired.",
        "pending": "Bid failed — please try again.",
      };
      return NextResponse.json(
        { error: messages[txStatus] ?? "Bid failed." },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error("Bid transaction error:", err);
    return NextResponse.json({ error: "Server error during bid." }, { status: 500 });
  }

  // ── Post-commit writes (fire-and-forget) ──────────────────────────────────
  Promise.all([
    // 7. Update team.lastBidAt
    adminDb.ref(`teams/${teamId}/lastBidAt`).set(now),
    // 8. Append to bidHistory
    adminDb.ref(`bidHistory/${lot.lotId}`).push({
      teamId,
      teamName: team.name,
      amount: committedBid,
      timestamp: now,
    }),
  ]).catch((err) => console.error("Post-commit write error:", err));

  return NextResponse.json({ success: true, newBid: committedBid });
}
