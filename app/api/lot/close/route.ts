import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { LOT_DURATION_MS } from "@/lib/auction";

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
        return undefined; // abort
      }

      if (!force && Date.now() <= currentData.endsAt) {
        txStatus = "not-expired";
        return undefined; // abort
      }

      return {
        ...currentData,
        status: "closed"
      };
    });

    if (!txResult.committed) {
      return NextResponse.json({ success: true, message: txStatus });
    }

    // We are the one who closed it!
    const closedLot = txResult.snapshot.val();
    const updates: Record<string, any> = {};

    // 1. Process the winner if there is one
    if (closedLot.currentBidderTeamId) {
      const teamId = closedLot.currentBidderTeamId;
      const teamSnap = await adminDb.ref(`teams/${teamId}`).get();
      
      if (teamSnap.exists()) {
        const team = teamSnap.val();
        
        // Deduct purse
        const newPurse = team.purse - closedLot.currentBid;
        updates[`teams/${teamId}/purse`] = newPurse;

        // Add to ownedTools
        const ownedTools = team.ownedTools || [];
        ownedTools.push({
          toolId: closedLot.toolId,
          toolName: closedLot.toolName,
          tier: closedLot.tier,
          pricePaid: closedLot.currentBid,
          acquiredAt: Date.now()
        });
        updates[`teams/${teamId}/ownedTools`] = ownedTools;

        // Update tierCounts
        const tierCounts = team.tierCounts || { S: 0, A: 0, B: 0 };
        tierCounts[closedLot.tier] = (tierCounts[closedLot.tier] || 0) + 1;
        updates[`teams/${teamId}/tierCounts`] = tierCounts;
      }
    }

    // 2. Open the next lot
    const stateSnap = await adminDb.ref("auctionState").get();
    const queueSnap = await adminDb.ref("lotQueue").get();

    if (stateSnap.exists() && queueSnap.exists()) {
      const state = stateSnap.val();
      const queue = queueSnap.val();

      const nextIndex = state.currentLotIndex + 1;

      if (nextIndex < queue.length) {
        // Open next lot
        const nextLot = queue[nextIndex];
        updates["auctionState/currentLotIndex"] = nextIndex;
        updates["currentLot"] = {
          ...nextLot,
          currentBid: nextLot.startingPrice,
          currentBidderTeamId: null,
          currentBidderTeamName: null,
          endsAt: Date.now() + LOT_DURATION_MS,
          status: "open"
        };
      } else {
        // Auction finished
        updates["auctionState/status"] = "finished";
        // Optionally remove currentLot or keep it as closed
        updates["currentLot"] = null; 
      }
    }

    // Commit all updates
    if (Object.keys(updates).length > 0) {
      await adminDb.ref().update(updates);
    }

    return NextResponse.json({ success: true, processedLotId: closedLot.lotId });

  } catch (err) {
    console.error("Error closing lot:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
