import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { LOT_DURATION_MS } from "@/lib/auction";

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
    }

    if (action === "pause") {
      await adminDb.ref("auctionState/status").set("paused");
      return NextResponse.json({ success: true });
    }

    if (action === "resume") {
      // Give a fresh timer when resuming
      await adminDb.ref().update({
        "auctionState/status": "live",
        "currentLot/endsAt": Date.now() + LOT_DURATION_MS,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "force-close") {
      // We just expire the lot. The clients will see this and call /api/lot/close
      // Or we can just call the close logic ourselves. Since we are vibecoding,
      // expiring the timer is the easiest way to trigger the existing robust close flow.
      await adminDb.ref("currentLot/endsAt").set(0);
      return NextResponse.json({ success: true });
    }

    if (action === "skip") {
      // Wipe the bidder and expire the lot in a transaction to prevent last-millisecond bids
      await adminDb.ref("currentLot").transaction((current) => {
        if (current && current.status === "open") {
          current.currentBidderTeamId = null;
          current.currentBidderTeamName = null;
          current.endsAt = 0;
        }
        return current;
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Control action error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
