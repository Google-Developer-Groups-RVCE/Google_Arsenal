import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      console.error("Registration failed: Firebase Admin DB is not initialized. Check environment variables on Vercel.");
      return NextResponse.json({ error: "Server configuration error — Firebase not initialized" }, { status: 503 });
    }

    const body = await req.json();
    const { name, members } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: "At least one member is required" }, { status: 400 });
    }

    const validMembers = members.filter((m) => typeof m === "string" && m.trim().length > 0);
    if (validMembers.length === 0) {
      return NextResponse.json({ error: "At least one valid member name is required" }, { status: 400 });
    }

    const teamsRef = adminDb.ref("teams");
    
    let code = "";
    let codeClaimed = false;
    let attempts = 0;
    
    while (!codeClaimed && attempts < 100) {
      code = generateCode();
      const codeRef = adminDb.ref(`teamCodes/${code}`);
      
      const tx = await codeRef.transaction((currentData) => {
        if (currentData === null) {
          return true; // Claim this code
        }
        return undefined; // Code already exists, abort transaction
      });
      
      if (tx.committed) {
        codeClaimed = true;
      }
      
      attempts++;
    }

    if (!codeClaimed) {
      return NextResponse.json({ error: "Failed to generate unique team code" }, { status: 500 });
    }

    const newTeamRef = teamsRef.push();
    
    // Follow the exact RTDB schema from DATA_MODEL.md
    const newTeam = {
      name: name.trim(),
      members: validMembers,
      code,
      purse: 120,
      ownedTools: {},
      tierCounts: { S: 0, A: 0, B: 0 },
      lastBidAt: 0,
    };

    await newTeamRef.set(newTeam);

    return NextResponse.json({ success: true, teamId: newTeamRef.key, code });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
