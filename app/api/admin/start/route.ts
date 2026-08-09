import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { TOOLS, LOT_DURATION_MS } from "@/lib/auction";

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function POST(req: Request) {
  try {
    // 1. Build flattened queue of S and A tier tools
    let lotQueue: any[] = [];
    let lotIdCounter = 1;

    for (const tool of TOOLS) {
      if (tool.tier === "S" || tool.tier === "A") {
        const copies = typeof tool.copies === "number" ? tool.copies : 1;
        for (let i = 0; i < copies; i++) {
          lotQueue.push({
            lotId: `lot-${lotIdCounter++}`,
            toolId: tool.id,
            toolName: tool.name,
            tier: tool.tier,
            logoUrl: tool.logoUrl || "",
            startingPrice: tool.basePrice,
          });
        }
      }
    }

    // 2. Shuffle queue
    lotQueue = shuffleArray(lotQueue);

    // 3. Take the first lot
    const firstLot = lotQueue[0];

    // 4. Update Firebase atomically using multiple set operations or an update block
    const updates: Record<string, any> = {
      "lotQueue": lotQueue,
      "auctionState": {
        status: "live",
        currentLotIndex: 0,
      },
      "currentLot": {
        ...firstLot,
        currentBid: firstLot.startingPrice,
        currentBidderTeamId: null,
        currentBidderTeamName: null,
        endsAt: Date.now() + LOT_DURATION_MS,
        status: "open",
      }
    };

    await adminDb.ref().update(updates);

    return NextResponse.json({ success: true, lotQueueSize: lotQueue.length });
  } catch (err) {
    console.error("Failed to start auction:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
