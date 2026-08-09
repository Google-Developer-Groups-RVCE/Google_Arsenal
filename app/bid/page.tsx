"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { BID_INCREMENT } from "@/lib/auction";

// --- Types -------------------------------------------------------------------

type TeamData = {
  name: string;
  members: string[];
  code: string;
  purse: number;
  ownedTools: Record<string, { tier: "S" | "A" | "B"; price: number }>;
  tierCounts?: { S: number; A: number; B: number };
};

type CurrentLot = {
  lotId: string;
  toolId: string;
  toolName: string;
  tier: "S" | "A" | "B";
  logoUrl: string;
  startingPrice: number;
  currentBid: number;
  currentBidderTeamId: string | null;
  currentBidderTeamName: string | null;
  endsAt: number;
  status: "open" | "closed";
};

type AuctionState = {
  status: "not_started" | "live" | "paused" | "finished";
  currentLotIndex: number;
};

const SESSION_KEY = "arsenal_session";

// --- Countdown hook ----------------------------------------------------------

function useCountdown(endsAt: number | null) {
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setMsLeft(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  return msLeft;
}

// --- Login screen ------------------------------------------------------------

function LoginScreen({
  onLogin,
}: {
  onLogin: (teamId: string, teamCode: string, teamName: string) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 4) {
      setError("Team code is 4 digits.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/team-lookup?code=${trimmed}`);
      const data = await res.json();
      if (!res.ok || !data.teamId) {
        throw new Error(data.error || "Team not found. Check your code.");
      }
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ teamId: data.teamId, teamCode: trimmed, teamName: data.teamName })
      );
      onLogin(data.teamId, trimmed, data.teamName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: "0 0 24px rgba(0,229,255,0.15)" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-8 h-8 text-primary"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-semibold text-text">
            Google Arsenal
          </h1>
          <p className="text-sm text-zinc-400">Enter your team code to join the auction</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-heading uppercase tracking-widest text-zinc-400">
              Team Code
            </label>
            <input
              id="team-code-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={code}
              onChange={(e) => {
                setError(null);
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
              }}
              placeholder="0000"
              className="w-full bg-zinc-900/80 border border-zinc-700 focus:border-primary rounded-xl px-5 py-4 text-center text-3xl font-heading font-semibold tracking-[0.4em] text-text placeholder-zinc-700 outline-none transition-colors"
              style={{ caretColor: "var(--color-primary)" }}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            id="join-auction-btn"
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full py-4 rounded-xl font-heading font-semibold text-background text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--color-primary)",
              boxShadow: code.length === 4 ? "0 0 20px rgba(0,229,255,0.35)" : "none",
            }}
          >
            {loading ? "Joining..." : "Join Auction"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Connection banner --------------------------------------------------------

function ConnectionBanner({ connected }: { connected: boolean | null }) {
  if (connected === true || connected === null) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-xs font-heading font-semibold uppercase tracking-widest"
      style={{ background: "rgba(8,8,18,0.95)", borderBottom: "1px solid rgba(255,41,212,0.4)" }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse"
        style={{ background: "var(--color-accent)" }}
      />
      <span style={{ color: "var(--color-accent)" }}>Reconnecting...</span>
    </div>
  );
}

// --- Tier pill ----------------------------------------------------------------

function TierPill({ tier }: { tier: "S" | "A" | "B" }) {
  const styles: Record<string, string> = {
    S: "bg-accent/15 text-accent border-accent/30",
    A: "bg-secondary/15 text-secondary border-secondary/40",
    B: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
  };
  return (
    <span
      className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-heading font-semibold uppercase tracking-wider ${styles[tier]}`}
    >
      {tier}-Tier
    </span>
  );
}

// --- Owned tools badges -------------------------------------------------------

function OwnedToolsBadges({
  ownedTools,
}: {
  ownedTools: Record<string, { tier: "S" | "A" | "B"; price: number }>;
}) {
  const entries = Object.entries(ownedTools);
  if (entries.length === 0) {
    return <p className="text-xs text-zinc-600">No tools yet.</p>;
  }
  const tierColor: Record<string, string> = {
    S: "text-accent border-accent/30 bg-accent/10",
    A: "text-secondary border-secondary/30 bg-secondary/10",
    B: "text-zinc-400 border-zinc-600/30 bg-zinc-800/40",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([toolId, info]) => (
        <span
          key={toolId}
          className={`text-xs font-heading border rounded-full px-2.5 py-0.5 ${tierColor[info.tier]}`}
        >
          {toolId}
        </span>
      ))}
    </div>
  );
}

// --- Live bidder view ---------------------------------------------------------

function BidView({
  teamId,
  teamName,
  onSignOut,
}: {
  teamId: string;
  teamName: string;
  onSignOut: () => void;
}) {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [lot, setLot] = useState<CurrentLot | null>(null);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [bidding, setBidding] = useState(false);
  const [bidFeedback, setBidFeedback] = useState<string | null>(null);

  const msLeft = useCountdown(lot?.endsAt ?? null);
  const secsLeft = Math.ceil(msLeft / 1000);
  const isUrgent = secsLeft <= 5 && secsLeft > 0;

  // ── Firebase listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const connRef = ref(db, ".info/connected");
    const unsubConn = onValue(connRef, (snap) => {
      setConnected(snap.val() === true);
    });

    const teamRef = ref(db, `teams/${teamId}`);
    const unsubTeam = onValue(teamRef, (snap) => {
      if (snap.exists()) setTeamData(snap.val() as TeamData);
    });

    const lotRef = ref(db, "currentLot");
    const unsubLot = onValue(lotRef, (snap) => {
      setLot(snap.exists() ? (snap.val() as CurrentLot) : null);
      // Clear bid feedback when lot changes
      setBidFeedback(null);
    });

    const stateRef = ref(db, "auctionState");
    const unsubState = onValue(stateRef, (snap) => {
      setAuctionState(snap.exists() ? (snap.val() as AuctionState) : null);
    });

    return () => {
      unsubConn();
      unsubTeam();
      unsubLot();
      unsubState();
    };
  }, [teamId]);

  // ── Bid handler ──────────────────────────────────────────────────────────
  const handleBid = useCallback(async () => {
    if (bidding) return;
    setBidding(true);
    setBidFeedback(null);

    try {
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setBidFeedback(data.error || "Bid failed.");
      }
      // On success, Firebase listeners update currentBid automatically —
      // no need to manually update state here.
    } catch {
      setBidFeedback("Network error — please try again.");
    } finally {
      setBidding(false);
    }
  }, [bidding, teamId]);

  // Clear feedback after 3 s
  useEffect(() => {
    if (!bidFeedback) return;
    const id = setTimeout(() => setBidFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [bidFeedback]);

  // ── Bid button state ─────────────────────────────────────────────────────
  const lotOpen = lot?.status === "open" && msLeft > 0;
  const auctionLive = auctionState?.status === "live";
  const purse = teamData?.purse ?? 0;
  const nextBid = (lot?.currentBid || lot?.startingPrice || 0) + BID_INCREMENT;

  let bidDisabledReason: string | null = null;
  if (!connected) {
    bidDisabledReason = "Reconnecting...";
  } else if (!auctionLive) {
    bidDisabledReason = "Auction not live";
  } else if (!lotOpen) {
    bidDisabledReason = "Lot closed";
  } else if (purse < nextBid) {
    bidDisabledReason = "Purse too low";
  } else if (lot?.currentBidderTeamId === teamId) {
    bidDisabledReason = "You're leading";
  }
  const bidDisabled = !!bidDisabledReason || bidding;

  const countdownColor = isUrgent ? "var(--color-accent)" : "var(--color-primary)";

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-body">
      <ConnectionBanner connected={connected} />

      <header
        className="flex items-center justify-between px-5 pt-5 pb-3"
        style={{ paddingTop: connected === false ? "3rem" : undefined }}
      >
        <span className="text-xs font-heading uppercase tracking-widest text-zinc-500">
          {teamName}
        </span>
        <div className="flex items-center gap-3">
          {teamData && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
              style={{
                background: "rgba(0,229,255,0.07)",
                borderColor: "rgba(0,229,255,0.25)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-3.5 h-3.5"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: "var(--color-primary)" }}
              >
                <circle cx="12" cy="12" r="10" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 0h5.25A1.5 1.5 0 0 1 14.25 15H9"
                />
              </svg>
              <span
                className="text-sm font-heading font-semibold tabular-nums"
                style={{ color: "var(--color-primary)" }}
              >
                {purse}
              </span>
            </div>
          )}
          <button
            id="bid-sign-out-btn"
            onClick={onSignOut}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-heading"
          >
            Leave
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-5 py-2">
        {!auctionLive ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div
              className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "rgba(0,229,255,0.2)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-zinc-600"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
                />
              </svg>
            </div>
            <p className="text-zinc-500 font-heading text-sm">
              {auctionState?.status === "not_started"
                ? "Waiting for auction to start..."
                : auctionState?.status === "paused"
                ? "Auction paused"
                : auctionState?.status === "finished"
                ? "Auction finished"
                : "Connecting..."}
            </p>
          </div>
        ) : !lot ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-zinc-500 font-heading text-sm">Next lot loading...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-5">
            {/* Tool logo + name */}
            <div className="flex items-center gap-4 pt-1">
              <div className="w-16 h-16 rounded-2xl flex-shrink-0 bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                {lot.logoUrl ? (
                  <img src={lot.logoUrl} alt={lot.toolName} className="w-11 h-11 object-contain" />
                ) : (
                  <span className="text-xl font-heading font-bold text-zinc-500">
                    {lot.toolName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-heading font-semibold text-text leading-tight truncate">
                  {lot.toolName}
                </h2>
                <div className="mt-1">
                  <TierPill tier={lot.tier} />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Current bid */}
            <div className="space-y-0.5">
              <p className="text-xs font-heading uppercase tracking-widest text-zinc-500">
                Current Bid
              </p>
              <p
                className="text-5xl font-heading font-semibold tabular-nums"
                style={{ color: "var(--color-primary)" }}
              >
                {lot.currentBid || lot.startingPrice}
              </p>
              <p className="text-xs text-zinc-500 font-body">
                DevCoins
                {lot.currentBidderTeamName && (
                  <span className="ml-1 text-zinc-400">
                    &mdash; {lot.currentBidderTeamName} leading
                  </span>
                )}
              </p>
            </div>

            {/* Countdown */}
            <div className="space-y-0.5">
              <p className="text-xs font-heading uppercase tracking-widest text-zinc-500">
                Time Left
              </p>
              <p
                className="text-5xl font-heading font-semibold tabular-nums transition-colors duration-300"
                style={{ color: countdownColor }}
              >
                {lotOpen ? `${secsLeft}s` : "Closed"}
              </p>
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Owned tools */}
            <div className="space-y-2">
              <p className="text-xs font-heading uppercase tracking-widest text-zinc-500">
                Your Tools
              </p>
              <OwnedToolsBadges ownedTools={teamData?.ownedTools ?? {}} />
            </div>
          </div>
        )}
      </main>

      {/* Bid button */}
      <div className="sticky bottom-0 px-5 py-5 bg-background border-t border-zinc-900">
        {lot && auctionLive && lotOpen && !bidDisabledReason && !bidFeedback && (
          <p className="text-center text-xs text-zinc-500 font-body mb-3">
            Your bid:{" "}
            <span className="font-semibold text-text">{nextBid} DevCoins</span>
          </p>
        )}

        <button
          id="bid-btn"
          onClick={handleBid}
          disabled={bidDisabled}
          aria-disabled={bidDisabled}
          className="w-full py-5 rounded-2xl font-heading font-semibold text-lg transition-all active:scale-[0.97]"
          style={
            bidDisabled
              ? { background: "#1a1a2e", color: "#52525b", cursor: "not-allowed" }
              : {
                  background: "var(--color-primary)",
                  color: "var(--color-background)",
                  boxShadow: "0 0 28px rgba(0,229,255,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                }
          }
        >
          {bidding
            ? "Bidding..."
            : bidDisabledReason
            ? bidDisabledReason
            : `Bid ${nextBid}`}
        </button>

        {/* Server-side rejection reason — shown UNDER the button */}
        {bidFeedback && (
          <div
            id="bid-rejection-msg"
            role="alert"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.30)",
            }}
          >
            {/* Warning icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 flex-shrink-0"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: "#f87171" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <span className="text-sm font-body" style={{ color: "#fca5a5" }}>
              {bidFeedback}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Root page ----------------------------------------------------------------

export default function BidPage() {
  const [session, setSession] = useState<{
    teamId: string;
    teamCode: string;
    teamName: string;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.teamId && parsed.teamCode) {
          setSession(parsed);
        }
      }
    } catch {
      // malformed -- ignore
    }
    setHydrated(true);
  }, []);

  const handleLogin = useCallback(
    (teamId: string, teamCode: string, teamName: string) => {
      setSession({ teamId, teamCode, teamName });
    },
    []
  );

  const handleSignOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <BidView
      teamId={session.teamId}
      teamName={session.teamName}
      onSignOut={handleSignOut}
    />
  );
}
