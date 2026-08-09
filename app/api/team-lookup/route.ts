import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/team-lookup?code=XXXX
 *
 * Scans /teams for a team whose `code` field matches the given PIN.
 * Returns { teamId, teamName } on success, or 404 if not found.
 *
 * Used by the /bid login screen to resolve a team code to an RTDB key
 * before storing the session in localStorage.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Provide a 4-digit team code." }, { status: 400 });
  }

  try {
    const snapshot = await adminDb.ref("teams").once("value");
    if (!snapshot.exists()) {
      return NextResponse.json({ error: "No teams registered yet." }, { status: 404 });
    }

    const teams = snapshot.val() as Record<
      string,
      { name: string; code: string }
    >;

    const entry = Object.entries(teams).find(([, team]) => team.code === code);

    if (!entry) {
      return NextResponse.json(
        { error: "Team not found. Double-check your code." },
        { status: 404 }
      );
    }

    const [teamId, team] = entry;
    return NextResponse.json({ teamId, teamName: team.name });
  } catch (err) {
    console.error("team-lookup error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
