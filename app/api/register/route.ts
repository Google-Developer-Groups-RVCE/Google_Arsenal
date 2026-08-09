import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(req: Request) {
  try {
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
    
    // In a high-concurrency production setting, we'd use transactions.
    // For this event's scale, fetching once to find unique codes is perfectly fine.
    const snapshot = await teamsRef.once("value");
    const existingTeams = snapshot.val() || {};
    
    const existingCodes = new Set<string>();
    Object.values(existingTeams).forEach((team: any) => {
      if (team.code) existingCodes.add(team.code);
    });

    let code = generateCode();
    let attempts = 0;
    while (existingCodes.has(code) && attempts < 100) {
      code = generateCode();
      attempts++;
    }

    if (attempts >= 100) {
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
