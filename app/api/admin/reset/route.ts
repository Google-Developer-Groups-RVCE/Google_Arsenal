import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/admin/reset
 * Wipes currentLot, lotQueue, and auctionState so the operator can
 * call /api/admin/start again for a fresh run. Teams and their
 * purses/tools are intentionally NOT reset (do that manually in Firebase console
 * if needed). This is only for resetting the auction flow itself.
 */
export async function POST() {
  try {
    await adminDb.ref().update({
      currentLot: null,
      lotQueue: null,
      bidHistory: null, // Clear all bids — lot IDs are reused on restart, stale bids would pollute new leaderboards
      auctionState: {
        status: "not_started",
        currentLotIndex: 0,
      },
    });

    return NextResponse.json({ success: true, message: "Auction state reset. Call /api/admin/start to begin a new run." });
  } catch (err) {
    console.error("Reset error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
