import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { MARKETPLACE_TOOLS } from "@/lib/marketplace";

/**
 * POST /api/buy
 * Body: { teamId: string; toolId: string }
 *
 * The Firebase Admin SDK WebSocket-based writes (update/transaction) hang
 * indefinitely in Next.js Turbopack serverless functions. We use a hybrid:
 *  - get()  via Admin SDK (uses HTTP, works fine)
 *  - write  via Firebase REST API with an Admin SDK access token (also HTTP)
 *
 * Returns: { success, newPurse, toolName }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { teamId, toolId } = body ?? {};

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json({ error: "teamId is required." }, { status: 400 });
    }
    if (!toolId || typeof toolId !== "string") {
      return NextResponse.json({ error: "toolId is required." }, { status: 400 });
    }

    const tool = MARKETPLACE_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return NextResponse.json({ error: "Tool not found in marketplace." }, { status: 400 });
    }

    // ── Read current state via Admin SDK get() ────────────────────────────
    const teamRef = adminDb.ref(`teams/${teamId}`);
    const snap = await teamRef.get();

    if (!snap.exists()) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    const teamData = snap.val() as {
      purse: number;
      ownedTools?: Record<string, { tier?: string }>;
      [key: string]: unknown;
    };

    // ── Validate guards ───────────────────────────────────────────────────
    const owned: Record<string, { tier?: string }> = teamData.ownedTools ?? {};

    if (owned[toolId]) {
      return NextResponse.json({ error: "Your team already owns this tool." }, { status: 409 });
    }

    if (tool.tier === "premium") {
      const alreadyHasPremium = Object.values(owned).some((e) => e?.tier === "premium");
      if (alreadyHasPremium) {
        return NextResponse.json(
          { error: "Your team already selected a Premium tool. Only one Premium tool is allowed per team." },
          { status: 409 }
        );
      }
    }

    const currentPurse: number = teamData.purse ?? 0;
    if (currentPurse < tool.price) {
      return NextResponse.json({ error: "Not enough DevCoins." }, { status: 409 });
    }

    // ── Write via Firebase REST API (avoids WebSocket hang) ───────────────
    const newPurse = currentPurse - tool.price;
    const newToolEntry = {
      toolId: tool.id,
      toolName: tool.name,
      tier: tool.tier,
      pricePaid: tool.price,
      acquiredAt: Date.now(),
    };

    // Get a short-lived OAuth2 access token from the Admin SDK credential
    const app = (await import("firebase-admin/app")).getApps()[0];
    const credential = (app as unknown as { options: { credential: { getAccessToken: () => Promise<{ access_token: string }> } } }).options.credential;
    const { access_token: accessToken } = await credential.getAccessToken();

    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!.replace(/\/$/, "");

    // Use PATCH on the team node to update only purse + the new tool entry
    // (PATCH = merge, so other fields like name/members/code are untouched)
    const patchBody = {
      purse: newPurse,
      [`ownedTools/${toolId}`]: newToolEntry,
    };

    const restResp = await fetch(`${dbUrl}/teams/${teamId}.json?access_token=${accessToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });

    if (!restResp.ok) {
      const errText = await restResp.text();
      console.error("RTDB REST write failed:", restResp.status, errText);
      return NextResponse.json({ error: "Failed to write purchase." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newPurse,
      toolName: tool.name,
    });
  } catch (err: unknown) {
    console.error("Buy error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
