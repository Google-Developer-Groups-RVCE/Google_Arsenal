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

type LeaderboardEntry = {
  teamId: string;
  teamName: string;
  amount: number;
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
  leaderboard: LeaderboardEntry[] | null;
  maxWinners: number;
  endsAt: number;
  status: "open" | "closed";
};

type AuctionState = {
  status: "not_started" | "live" | "paused" | "finished";
  currentLotIndex: number;
};

const SESSION_KEY = "arsenal_session";

// Tier colours
const TIER = {
  S: { bg: "#ff29d4", glow: "rgba(255,41,212,0.5)", label: "S-TIER", text: "#fff" },
  A: { bg: "#7c3bed", glow: "rgba(124,59,237,0.5)", label: "A-TIER", text: "#fff" },
  B: { bg: "#1e3a5f", glow: "rgba(0,229,255,0.25)", label: "B-TIER", text: "#67e8f9" },
};

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

function LoginScreen({ onLogin }: { onLogin: (teamId: string, teamCode: string, teamName: string) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 4) { setError("Team code is 4 digits."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team-lookup?code=${trimmed}`);
      const data = await res.json();
      if (!res.ok || !data.teamId) throw new Error(data.error || "Team not found. Check your code.");
      localStorage.setItem(SESSION_KEY, JSON.stringify({ teamId: data.teamId, teamCode: trimmed, teamName: data.teamName }));
      onLogin(data.teamId, trimmed, data.teamName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auction-theme min-h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 320, height: 320, background: "radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-10%", width: 200, height: 200, background: "radial-gradient(circle, rgba(124,59,237,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div className="relative w-full max-w-sm space-y-8 z-10">
        {/* Logo + title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", boxShadow: "0 0 24px rgba(0,229,255,0.12)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5} style={{ color: "#00e5ff" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-heading font-bold" style={{ color: "#f1f5f9" }}>Google Arsenal</h1>
          <p className="text-sm" style={{ color: "#64748b" }}>Enter your team code to join the auction</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-heading uppercase tracking-widest" style={{ color: "#475569" }}>Team Code</label>
            <input
              id="team-code-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={code}
              onChange={(e) => { setError(null); setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); }}
              placeholder="0000"
              autoComplete="off"
              className="w-full rounded-2xl px-5 py-4 text-center text-4xl font-heading font-bold tracking-[0.4em] outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1.5px solid ${code.length === 4 ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: "#f1f5f9",
                caretColor: "#00e5ff",
                boxShadow: code.length === 4 ? "0 0 20px rgba(0,229,255,0.1)" : "none",
              }}
            />
          </div>

          {error && <p className="text-sm text-center font-body" style={{ color: "#f87171" }}>{error}</p>}

          <button
            id="join-auction-btn"
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full py-4 rounded-2xl font-heading font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: code.length === 4 ? "#00e5ff" : "rgba(0,229,255,0.1)",
              color: code.length === 4 ? "#080812" : "#334155",
              boxShadow: code.length === 4 ? "0 0 28px rgba(0,229,255,0.35), 0 4px 16px rgba(0,0,0,0.4)" : "none",
              border: "none",
            }}
          >
            {loading ? "Joining..." : "Join Auction"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Connection banner -------------------------------------------------------

function ConnectionBanner({ connected }: { connected: boolean | null }) {
  if (connected === true || connected === null) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-xs font-heading font-semibold uppercase tracking-widest"
      style={{ background: "rgba(8,8,18,0.95)", borderBottom: "1px solid rgba(255,41,212,0.4)" }}>
      <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "#ff29d4" }} />
      <span style={{ color: "#ff29d4" }}>Reconnecting...</span>
    </div>
  );
}

// --- Tier pill ---------------------------------------------------------------

function TierPill({ tier }: { tier: "S" | "A" | "B" }) {
  const t = TIER[tier];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-heading font-bold uppercase tracking-wider"
      style={{ background: `${t.bg}22`, color: t.text === "#fff" ? t.bg : t.text, border: `1px solid ${t.bg}55` }}>
      {t.label}
    </span>
  );
}

// --- Owned tools badges ------------------------------------------------------

function OwnedToolsBadges({ ownedTools }: { ownedTools: Record<string, { tier: "S" | "A" | "B"; price: number }> }) {
  const entries = Object.entries(ownedTools);
  if (entries.length === 0) return <p className="text-xs italic" style={{ color: "#334155" }}>No tools yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([toolId, info]) => {
        const t = TIER[info.tier];
        return (
          <span key={toolId} className="text-xs font-heading rounded-full px-2 py-0.5"
            style={{ background: `${t.bg}18`, color: t.bg, border: `1px solid ${t.bg}40` }}>
            {toolId}
          </span>
        );
      })}
    </div>
  );
}

// --- Leaderboard -------------------------------------------------------------

function BidLeaderboard({ leaderboard, maxWinners, myTeamId }: { leaderboard: LeaderboardEntry[]; maxWinners: number; myTeamId: string }) {
  return (
    <div className="space-y-1.5">
      {leaderboard.map((entry, idx) => {
        const isWinning = idx < maxWinners;
        const isMe = entry.teamId === myTeamId;
        return (
          <div key={entry.teamId}
            className="flex items-center justify-between px-3 py-2 rounded-xl transition-all"
            style={{
              background: isMe
                ? isWinning ? "rgba(0,229,255,0.08)" : "rgba(239,68,68,0.07)"
                : isWinning ? "rgba(0,229,255,0.04)" : "rgba(255,255,255,0.02)",
              border: isMe
                ? isWinning ? "1px solid rgba(0,229,255,0.35)" : "1px solid rgba(239,68,68,0.35)"
                : isWinning ? "1px solid rgba(0,229,255,0.15)" : "1px solid rgba(255,255,255,0.05)",
            }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-heading font-bold"
                style={{ background: isWinning ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.06)", color: isWinning ? "#00e5ff" : "#475569" }}>
                {idx + 1}
              </span>
              <span className="text-sm font-heading truncate" style={{ color: isMe ? "#f1f5f9" : "#94a3b8", fontWeight: isMe ? 700 : 500 }}>
                {entry.teamName}{isMe && <span className="ml-1 text-[9px] font-body normal-case" style={{ color: "#475569" }}>(you)</span>}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-sm font-heading font-bold tabular-nums" style={{ color: isWinning ? "#00e5ff" : "#475569" }}>{entry.amount} DC</span>
              {isWinning && <span className="text-[9px] font-heading uppercase tracking-wide" style={{ color: "rgba(0,229,255,0.6)" }}>WIN</span>}
            </div>
          </div>
        );
      })}
      {Array.from({ length: Math.max(0, maxWinners - leaderboard.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-heading" style={{ background: "rgba(255,255,255,0.04)", color: "#334155" }}>{leaderboard.length + i + 1}</span>
          <span className="text-xs font-heading italic" style={{ color: "#334155" }}>Open slot</span>
        </div>
      ))}
    </div>
  );
}

// --- Live bidder view --------------------------------------------------------

function BidView({ teamId, teamName, onSignOut }: { teamId: string; teamName: string; onSignOut: () => void }) {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [lot, setLot] = useState<CurrentLot | null>(null);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [bidding, setBidding] = useState(false);
  const [bidFeedback, setBidFeedback] = useState<string | null>(null);

  const msLeft = useCountdown(lot?.endsAt ?? null);
  const secsLeft = Math.ceil(msLeft / 1000);
  const isUrgent = secsLeft <= 5 && secsLeft > 0;

  useEffect(() => {
    const unsubConn = onValue(ref(db, ".info/connected"), (snap) => setConnected(snap.val() === true));
    const unsubTeam = onValue(ref(db, `teams/${teamId}`), (snap) => { if (snap.exists()) setTeamData(snap.val() as TeamData); });
    const unsubLot = onValue(ref(db, "currentLot"), (snap) => { setLot(snap.exists() ? snap.val() as CurrentLot : null); setBidFeedback(null); });
    const unsubState = onValue(ref(db, "auctionState"), (snap) => setAuctionState(snap.exists() ? snap.val() as AuctionState : null));
    return () => { unsubConn(); unsubTeam(); unsubLot(); unsubState(); };
  }, [teamId]);

  useEffect(() => {
    if (!lot || lot.status !== "open" || !lot.endsAt) return;
    const interval = setInterval(() => {
      if (Date.now() > lot.endsAt) fetch("/api/lot/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(console.error);
    }, 1000);
    return () => clearInterval(interval);
  }, [lot]);

  const handleBid = useCallback(async () => {
    if (bidding) return;
    setBidding(true);
    setBidFeedback(null);
    try {
      const res = await fetch("/api/bid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId }) });
      const data = await res.json();
      if (!res.ok) setBidFeedback(data.error || "Bid failed.");
    } catch { setBidFeedback("Network error — please try again."); }
    finally { setBidding(false); }
  }, [bidding, teamId]);

  useEffect(() => {
    if (!bidFeedback) return;
    const id = setTimeout(() => setBidFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [bidFeedback]);

  const lotOpen = lot?.status === "open" && msLeft > 0;
  const auctionLive = auctionState?.status === "live";
  const purse = teamData?.purse ?? 0;
  const leaderboard: LeaderboardEntry[] = Array.isArray(lot?.leaderboard) ? lot!.leaderboard : [];
  const maxWinners = lot?.maxWinners ?? (lot?.tier === "S" ? 4 : 6);
  const myEntry = leaderboard.find((e) => e.teamId === teamId);
  const myCurrentBid = myEntry?.amount ?? 0;
  const nextBid = myCurrentBid + BID_INCREMENT;
  const myRank = myEntry ? leaderboard.indexOf(myEntry) + 1 : null;
  const iAmWinning = myRank !== null && myRank <= maxWinners;
  const spotsFilled = Math.min(leaderboard.length, maxWinners);
  const spotsLeft = maxWinners - spotsFilled;
  const clearingPrice = leaderboard.length >= maxWinners ? leaderboard[maxWinners - 1].amount : leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].amount : lot?.startingPrice ?? 0;

  let bidDisabledReason: string | null = null;
  if (!connected) bidDisabledReason = "Reconnecting...";
  else if (!auctionLive) bidDisabledReason = "Auction not live";
  else if (!lotOpen) bidDisabledReason = "Lot closed";
  else if (purse < nextBid) bidDisabledReason = "Purse too low";
  const bidDisabled = !!bidDisabledReason || bidding;

  const tierMeta = lot ? TIER[lot.tier] : null;

  return (
    <div className="auction-theme min-h-[100dvh] flex flex-col font-body relative" style={{ background: "#080812" }}>
      <ConnectionBanner connected={connected} />

      {/* Ambient background glow tied to tier */}
      {tierMeta && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${tierMeta.glow} 0%, transparent 70%)`,
          transition: "background 1s ease",
        }} />
      )}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 relative z-10"
        style={{ paddingTop: connected === false ? "3rem" : undefined }}>
        <div className="flex flex-col">
          <span className="text-xs font-heading uppercase tracking-widest" style={{ color: "#475569" }}>BIDDER</span>
          <span className="text-sm font-heading font-bold" style={{ color: "#94a3b8" }}>{teamName}</span>
        </div>
        <div className="flex items-center gap-3">
          {teamData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2} style={{ color: "#00e5ff" }}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 0h5.25A1.5 1.5 0 0 1 14.25 15H9" />
              </svg>
              <span className="text-sm font-heading font-bold tabular-nums" style={{ color: "#00e5ff" }}>{purse}</span>
              <span className="text-xs font-heading" style={{ color: "rgba(0,229,255,0.5)" }}>DC</span>
            </div>
          )}
          <button id="bid-sign-out-btn" onClick={onSignOut}
            className="text-xs font-heading transition-colors px-2 py-1 rounded-lg"
            style={{ color: "#334155" }}>
            Leave
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col px-5 py-3 overflow-y-auto relative z-10 space-y-4 pb-2">

        {!auctionLive ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,229,255,0.05)", border: "1px dashed rgba(0,229,255,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5} style={{ color: "#334155" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
              </svg>
            </div>
            <p className="text-base font-heading" style={{ color: "#475569" }}>
              {auctionState?.status === "not_started" ? "Waiting for auction to start..." :
               auctionState?.status === "paused" ? "Auction paused" :
               auctionState?.status === "finished" ? "Auction finished 🎉" : "Connecting..."}
            </p>
          </div>
        ) : !lot ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
            <p className="font-heading text-sm" style={{ color: "#475569" }}>Next lot loading...</p>
          </div>
        ) : (
          <>
            {/* ── Tool card ── */}
            <div className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: `1px solid ${tierMeta?.bg ?? "#334155"}40`,
                boxShadow: `0 0 30px ${tierMeta?.glow ?? "transparent"}`,
              }}>
              {/* Subtle tier glow bg */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
                background: `radial-gradient(circle at top right, ${tierMeta?.glow ?? "transparent"}, transparent 60%)`,
                opacity: 0.4,
              }} />

              <div className="flex items-center gap-4 relative z-10">
                {/* Logo */}
                <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {lot.logoUrl ? (
                    <img src={lot.logoUrl} alt={lot.toolName} className="w-11 h-11 object-contain" />
                  ) : (
                    <span className="text-lg font-heading font-bold" style={{ color: "#334155" }}>
                      {lot.toolName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-heading font-bold leading-tight" style={{ color: "#f1f5f9" }}>{lot.toolName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <TierPill tier={lot.tier} />
                    <span className="text-xs font-body" style={{ color: "#334155" }}>{spotsFilled}/{maxWinners} spots</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Clearing", value: clearingPrice || lot.startingPrice, unit: "DC", color: "#00e5ff" },
                { label: "Your Bid", value: myCurrentBid > 0 ? myCurrentBid : "—", unit: myCurrentBid > 0 ? "DC" : "", color: myCurrentBid > 0 ? (iAmWinning ? "#00e5ff" : "#f87171") : "#334155" },
                { label: "Time Left", value: lotOpen ? `${secsLeft}s` : "Closed", unit: "", color: isUrgent ? "#ff29d4" : "#00e5ff" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 flex flex-col gap-0.5"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: "#334155" }}>{s.label}</span>
                  <span className="text-2xl font-heading font-bold tabular-nums leading-none" style={{ color: s.color, filter: isUrgent && s.label === "Time Left" ? "drop-shadow(0 0 8px rgba(255,41,212,0.6))" : undefined }}>
                    {s.value}
                    {s.unit && <span className="text-sm ml-0.5" style={{ color: `${s.color}80` }}>{s.unit}</span>}
                  </span>
                  {s.label === "Your Bid" && myCurrentBid > 0 && (
                    <span className="text-[9px] font-body" style={{ color: iAmWinning ? "rgba(0,229,255,0.6)" : "rgba(248,113,113,0.7)" }}>
                      {iAmWinning ? `#${myRank} · winning` : `#${myRank} · not winning`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* ── Live leaderboard ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: "#334155" }}>Live Leaderboard</span>
                {spotsLeft > 0 && (
                  <span className="text-[10px] font-heading uppercase tracking-wide" style={{ color: "#334155" }}>
                    {spotsLeft} open slot{spotsLeft !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-xs font-body italic py-2" style={{ color: "#334155" }}>No bids yet — be first!</p>
              ) : (
                <BidLeaderboard leaderboard={leaderboard} maxWinners={maxWinners} myTeamId={teamId} />
              )}
            </div>

            {/* ── Owned tools ── */}
            {teamData && Object.keys(teamData.ownedTools ?? {}).length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: "#334155" }}>Your Tools</span>
                <OwnedToolsBadges ownedTools={teamData.ownedTools ?? {}} />
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Sticky bid button ── */}
      <div className="sticky bottom-0 z-20 px-5 py-4 relative"
        style={{ background: "rgba(8,8,18,0.95)", borderTop: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
        {lot && auctionLive && lotOpen && !bidDisabledReason && !bidFeedback && (
          <p className="text-center text-xs font-body mb-3" style={{ color: "#475569" }}>
            {myCurrentBid > 0 ? <>Raise to <span className="font-bold" style={{ color: "#94a3b8" }}>{nextBid} DC</span></> : <>First bid at <span className="font-bold" style={{ color: "#94a3b8" }}>{BID_INCREMENT} DC</span></>}
          </p>
        )}

        <button
          id="bid-btn"
          onClick={handleBid}
          disabled={bidDisabled}
          aria-disabled={bidDisabled}
          className="w-full py-5 rounded-2xl font-heading font-bold text-xl transition-all active:scale-[0.97]"
          style={
            bidDisabled
              ? { background: "rgba(255,255,255,0.04)", color: "#334155", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.06)" }
              : iAmWinning
              ? { background: "linear-gradient(135deg, #00e5ff, #00b4cc)", color: "#080812", boxShadow: "0 0 32px rgba(0,229,255,0.45), 0 4px 20px rgba(0,0,0,0.5)", border: "none" }
              : { background: "#00e5ff", color: "#080812", boxShadow: "0 0 32px rgba(0,229,255,0.4), 0 4px 20px rgba(0,0,0,0.5)", border: "none" }
          }
        >
          {bidding ? "Bidding..." : bidDisabledReason ? bidDisabledReason : myCurrentBid > 0 ? `Raise to ${nextBid} DC` : `Bid ${BID_INCREMENT} DC`}
        </button>

        {bidFeedback && (
          <div id="bid-rejection-msg" role="alert"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth={2} style={{ color: "#f87171" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-sm font-body" style={{ color: "#fca5a5" }}>{bidFeedback}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Root page ---------------------------------------------------------------

export default function BidPage() {
  const [session, setSession] = useState<{ teamId: string; teamCode: string; teamName: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.teamId && parsed.teamCode) setSession(parsed);
      }
    } catch { /* malformed */ }
    setHydrated(true);
  }, []);

  const handleLogin = useCallback((teamId: string, teamCode: string, teamName: string) => {
    setSession({ teamId, teamCode, teamName });
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  if (!hydrated) {
    return (
      <div className="auction-theme min-h-screen flex items-center justify-center" style={{ background: "#080812" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#00e5ff", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  return <BidView teamId={session.teamId} teamName={session.teamName} onSignOut={handleSignOut} />;
}
