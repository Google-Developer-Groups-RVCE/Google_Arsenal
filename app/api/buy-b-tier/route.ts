import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { TOOLS } from "@/lib/auction";

export async function POST(req: Request) {
  try {
    const { teamId, toolId } = await req.json();

    if (!teamId || !toolId) {
      return NextResponse.json({ error: "teamId and toolId are required" }, { status: 400 });
    }

    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool || tool.tier !== "B") {
      return NextResponse.json({ error: "Invalid B-tier tool" }, { status: 400 });
    }

    const teamRef = adminDb.ref(`teams/${teamId}`);

    let txStatus = "success" as "success" | "no-team" | "insufficient-funds";
    const txResult = await teamRef.transaction((teamData) => {
      if (teamData === null) {
        txStatus = "no-team";
        return null; // let it retry
      }

      if (teamData.purse < tool.basePrice) {
        txStatus = "insufficient-funds";
        return undefined; // abort
      }

      // We can proceed
      teamData.purse -= tool.basePrice;

      if (!teamData.ownedTools) {
        teamData.ownedTools = [];
      }
      teamData.ownedTools.push({
        toolId: tool.id,
        toolName: tool.name,
        tier: tool.tier,
        pricePaid: tool.basePrice,
        acquiredAt: Date.now()
      });

      if (!teamData.tierCounts) {
        teamData.tierCounts = { S: 0, A: 0, B: 0 };
      }
      teamData.tierCounts.B = (teamData.tierCounts.B || 0) + 1;

      return teamData;
    });

    if (!txResult.committed) {
      if (txStatus === "no-team") return NextResponse.json({ error: "Team not found" }, { status: 404 });
      if (txStatus === "insufficient-funds") return NextResponse.json({ error: "Not enough DevCoins" }, { status: 409 });
      return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, toolName: tool.name });
  } catch (err) {
    console.error("Buy B-tier error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
