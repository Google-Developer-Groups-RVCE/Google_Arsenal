"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LOT_DURATION_MS } from "@/lib/auction";

/* ─── Types ─── */
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
  leaderboard: { teamId: string; teamName: string; amount: number }[] | null;
  maxWinners: number;
  winners?: { teamId: string; teamName: string; amount: number }[];
  clearingPrice?: number;
  endsAt: number;
  status: "open" | "closed";
};

type AuctionState = {
  status: "not_started" | "live" | "paused" | "finished";
  currentLotIndex: number;
};

type LotQueueItem = {
  lotId: string;
  toolId: string;
  toolName: string;
  tier: "S" | "A" | "B";
  logoUrl: string;
  startingPrice: number; // matches what admin/start writes (not basePrice)
  maxWinners: number;
};

type Team = {
  id: string;
  name: string;
  members: string[];
  code: string;
  purse: number;
  ownedTools?: {
    toolId: string;
    toolName: string;
    tier: "S" | "A" | "B";
    pricePaid: number;
  }[];
  tierCounts?: { S: number; A: number; B: number };
};

/* ─── API helper ─── */
async function callApi(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

/* ─── Tier color utility ─── */
function getTierColor(tier: string) {
  if (tier === "S") return "bg-[#ff29d4] text-white";
  if (tier === "A") return "bg-[#7c3bed] text-white";
  return "bg-zinc-700 text-zinc-200";
}

/* ─── Tier badge glow ─── */
function getTierGlow(tier: string) {
  if (tier === "S") return "rgba(255,41,212,0.6)";
  if (tier === "A") return "rgba(124,59,237,0.6)";
  return "rgba(100,116,139,0.3)";
}

/* ══════════════════════════════════════
   RESULTS VIEW
══════════════════════════════════════ */
function ResultsView() {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const teamsRef = ref(db, "teams");
    const unsub = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        arr.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(arr);
      } else {
        setTeams([]);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="w-full h-full pt-4 pb-12 overflow-y-auto">
      <h2 className="text-4xl font-heading font-bold text-center mb-12 uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]">
        Auction Results
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-col border border-primary/30 rounded-xl bg-background/80 backdrop-blur-md p-6 shadow-[0_0_20px_rgba(0,229,255,0.05)] relative overflow-hidden transition-all hover:border-primary/60 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] group"
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{ background: "radial-gradient(circle at top right, rgba(124,59,237,0.4) 0%, transparent 60%)" }}
            />
            <h3 className="text-2xl font-heading font-bold text-white mb-1 z-10">{team.name}</h3>
            <p className="text-sm font-body text-zinc-400 mb-4 z-10 h-10 overflow-hidden line-clamp-2">
              {team.members?.join(", ")}
            </p>
            <div className="flex-1 z-10 flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 uppercase font-heading tracking-[0.2em] font-bold">Arsenal</span>
              <div className="flex flex-wrap gap-2">
                {team.ownedTools && team.ownedTools.length > 0 ? (
                  team.ownedTools.map((tool, idx) => (
                    <div key={idx} className="flex items-center bg-primary/5 border border-primary/20 rounded overflow-hidden shadow-sm">
                      <span className={`px-2 py-1 text-[10px] font-heading tracking-wider font-bold ${getTierColor(tool.tier)}`}>
                        {tool.tier}
                      </span>
                      <span className="px-2 py-1 text-xs font-heading font-semibold text-zinc-300 truncate max-w-[120px]" title={tool.toolName}>
                        {tool.toolName}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 text-xs font-body italic">No tools acquired</span>
                )}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-primary/20 flex justify-between items-center z-10 group-hover:border-primary/40 transition-colors">
              <span className="text-[10px] text-zinc-500 uppercase font-heading tracking-[0.2em] font-bold">Remaining</span>
              <span className="text-xl font-heading font-bold text-white tabular-nums">{team.purse} DC</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   COUNTDOWN RING
══════════════════════════════════════ */
function CountdownRing({ endsAt, isPaused }: { endsAt: number; isPaused: boolean }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const totalDuration = LOT_DURATION_MS; // sourced from lib/auction.ts, not hardcoded

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const remaining = Math.max(0, endsAt - Date.now());
      setTimeLeft(remaining);
    };
    tick();
    if (isPaused) return;
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [endsAt, isPaused]);

  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(1, Math.max(0, timeLeft / totalDuration));
  const offset = circumference - percent * circumference;
  const isUrgent = timeLeft < 5000 && timeLeft > 0;
  const secs = Math.ceil(timeLeft / 1000);

  return (
    <>
      <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 320 320">
        {/* Dashed track ring */}
        <circle cx="160" cy="160" r={radius + 12} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 6" className="opacity-20" />
        {/* Progress ring */}
        <circle
          cx="160" cy="160" r={radius}
          fill="none"
          stroke={isUrgent ? "var(--color-accent)" : "var(--color-primary)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-75"
          style={{ filter: `drop-shadow(0 0 10px ${isUrgent ? "var(--color-accent)" : "var(--color-primary)"})` }}
        />
      </svg>
      {/* Numeric countdown centred below the logo */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-baseline gap-1"
        style={{ filter: isUrgent ? "drop-shadow(0 0 8px var(--color-accent))" : undefined }}
      >
        <span
          className="text-4xl font-heading font-bold tabular-nums transition-colors"
          style={{ color: isUrgent ? "var(--color-accent)" : "var(--color-primary)" }}
        >
          {isPaused ? "—" : secs}
        </span>
        <span className="text-xs font-heading uppercase tracking-widest text-zinc-500">s</span>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   OPERATOR CONTROL BAR
══════════════════════════════════════ */
function OperatorBar({
  auctionState,
  totalLots,
  onAction,
  busy,
}: {
  auctionState: AuctionState | null;
  totalLots: number;
  onAction: (label: string, fn: () => Promise<void>) => void;
  busy: string | null;
}) {
  const status = auctionState?.status;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-background/90 backdrop-blur-xl border-b border-primary/20 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Left: logos */}
      <div className="flex items-center gap-3">
        <img src="/gdg-2.svg" alt="GDG" className="h-7 w-auto opacity-70" />
        <div className="w-px h-5 bg-white/10" />
        <img src="/gdg-1.svg" alt="GDG RVCE" className="h-5 w-auto max-w-[110px] opacity-50" />
        <div className="w-px h-5 bg-white/10 ml-1" />
        <span className="text-[10px] font-heading uppercase tracking-[0.2em] text-primary/60">
          Operator
        </span>
      </div>

      {/* Center: status pill */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === "live" ? "bg-green-400 animate-pulse" :
            status === "paused" ? "bg-yellow-400" :
            status === "finished" ? "bg-primary" : "bg-zinc-600"
          }`}
        />
        <span className="text-xs font-heading uppercase tracking-[0.2em] text-zinc-400">
          {status === "not_started" ? "Not Started" :
           status === "live" ? "Live" :
           status === "paused" ? "Paused" :
           status === "finished" ? "Finished" : "Loading..."}
        </span>
        {auctionState && status !== "not_started" && status !== "finished" && (
          <span className="text-xs text-zinc-600 font-body">
            · Lot #{(auctionState.currentLotIndex ?? 0) + 1}{totalLots > 0 ? ` of ${totalLots}` : ""}
          </span>
        )}
      </div>

      {/* Right: control buttons */}
      <div className="flex items-center gap-2">
        {(!status || status === "not_started") && (
          <button
            disabled={!!busy}
            onClick={() => onAction("start", () => callApi("/api/admin/start"))}
            className="px-4 py-1.5 rounded bg-accent/20 hover:bg-accent/40 border border-accent/60 text-sm font-heading text-accent transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {busy === "start" ? "Starting…" : "▶ Start Auction"}
          </button>
        )}

        {status === "finished" && (
          <button
            disabled={!!busy}
            onClick={() => onAction("start", () => callApi("/api/admin/start"))}
            className="px-4 py-1.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/40 text-sm font-heading text-primary transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {busy === "start" ? "Restarting…" : "↺ Restart Auction"}
          </button>
        )}

        {/* Reset is always available for non-started states */}
        {status && status !== "not_started" && (
          <button
            disabled={!!busy}
            onClick={() => {
              if (!confirm("Reset auction flow? This clears all lots, bids and auction state. Team registrations and purses are preserved.")) return;
              onAction("reset", () => callApi("/api/admin/reset"));
            }}
            className="px-4 py-1.5 rounded bg-zinc-800/60 hover:bg-red-900/40 border border-zinc-700 hover:border-red-800 text-sm font-heading text-zinc-500 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {busy === "reset" ? "Resetting…" : "⚠ Reset"}
          </button>
        )}

        {(status === "live" || status === "paused") && (
          <>
            <button
              disabled={!!busy}
              onClick={() =>
                onAction(
                  status === "paused" ? "resume" : "pause",
                  () => callApi("/api/admin/control", { action: status === "paused" ? "resume" : "pause" })
                )
              }
              className="px-4 py-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-sm font-heading text-zinc-300 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {busy === "pause" || busy === "resume"
                ? "…"
                : status === "paused" ? "▶ Resume" : "⏸ Pause"}
            </button>

            <button
              disabled={!!busy}
              onClick={() => onAction("skip", () => callApi("/api/admin/control", { action: "skip" }))}
              className="px-4 py-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-sm font-heading text-zinc-300 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {busy === "skip" ? "Skipping…" : "⏭ Skip"}
            </button>

            <button
              disabled={!!busy}
              onClick={() => onAction("force-close", () => callApi("/api/admin/control", { action: "force-close" }))}
              className="px-4 py-1.5 rounded bg-red-900/30 hover:bg-red-900/60 border border-red-800/60 text-sm font-heading text-red-400 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {busy === "force-close" ? "Closing…" : "✕ Force Close"}
            </button>
          </>
        )}

        <div className="w-px h-5 bg-white/10" />

        <button
          onClick={() => signOut(auth)}
          className="px-3 py-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-sm font-heading text-zinc-500 hover:text-zinc-300 transition-all"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PAUSED OVERLAY
══════════════════════════════════════ */
function PausedOverlay() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="px-12 py-6 rounded-2xl border border-yellow-400/40 bg-black/60 backdrop-blur-md text-center">
        <div className="text-5xl mb-2">⏸</div>
        <div className="text-2xl font-heading font-bold text-yellow-300 uppercase tracking-widest">Auction Paused</div>
        <div className="text-sm font-body text-zinc-400 mt-1">Timer is frozen. Resume to continue.</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   SOLD OVERLAY
══════════════════════════════════════ */
function SoldOverlay({ lot }: { lot: CurrentLot }) {
  const winners = lot.winners ?? (lot.currentBidderTeamName ? [{ teamName: lot.currentBidderTeamName, amount: lot.clearingPrice ?? lot.currentBid }] : []);
  const clearingPrice = lot.clearingPrice ?? lot.currentBid;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-background/60 rounded-full blur-md" />
      <span className="text-8xl font-heading font-extrabold text-accent animate-ping absolute opacity-20">SOLD</span>
      <div className="z-10 flex flex-col items-center gap-2">
        <span className="text-7xl font-heading font-extrabold text-accent drop-shadow-[0_0_40px_var(--color-accent)]">SOLD</span>
        <span className="text-xl font-heading text-white tracking-widest">
          {winners.length > 1 ? `${winners.length} teams` : winners[0]?.teamName ?? ""}
        </span>
        {clearingPrice > 0 && (
          <span className="text-base font-heading text-primary/80">@ {clearingPrice} DC each</span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN DASHBOARD PAGE
══════════════════════════════════════ */
export default function DashboardPage() {
  const [lot, setLot] = useState<CurrentLot | null>(null);
  const [displayLot, setDisplayLot] = useState<CurrentLot | null>(null);
  const [nextLot, setNextLot] = useState<LotQueueItem | null>(null);
  const [totalLots, setTotalLots] = useState(0);
  const [showSold, setShowSold] = useState(false);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  /* ── action wrapper: sets busy, shows toast ── */
  const handleAction = useCallback(async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
      showToast(`${label} ✓`, "ok");
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "err");
    } finally {
      setBusy(null);
    }
  }, [busy]);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Firebase listeners ── */
  useEffect(() => {
    const unsubLot = onValue(ref(db, "currentLot"), (snap) => {
      setLot(snap.exists() ? snap.val() : null);
    });

    // Subscribe to lotQueue to know total count (for "Lot N of M" display)
    const unsubQueue = onValue(ref(db, "lotQueue"), (snap) => {
      if (snap.exists()) {
        const q = snap.val();
        setTotalLots(Array.isArray(q) ? q.length : Object.keys(q).length);
      } else {
        setTotalLots(0);
      }
    });

    const unsubState = onValue(ref(db, "auctionState"), (snap) => {
      if (snap.exists()) {
        const state = snap.val() as AuctionState;
        setAuctionState(state);

        if (state.currentLotIndex !== undefined && state.status !== "finished") {
          onValue(
            ref(db, `lotQueue/${state.currentLotIndex + 1}`),
            (nextSnap) => setNextLot(nextSnap.exists() ? nextSnap.val() : null),
            { onlyOnce: true }
          );
        } else {
          setNextLot(null);
        }
      } else {
        setAuctionState(null);
        setNextLot(null);
      }
    });

    return () => { unsubLot(); unsubQueue(); unsubState(); };
  }, []);

  /* ── SOLD animation on lot change ── */
  useEffect(() => {
    if (lot && displayLot && lot.lotId !== displayLot.lotId) {
      // Show SOLD if there were any bids on the closing lot (leaderboard had entries)
      const hadBids = Array.isArray(displayLot.leaderboard) && displayLot.leaderboard.length > 0;
      if (hadBids) {
        setShowSold(true);
        setTimeout(() => { setShowSold(false); setDisplayLot(lot); }, 2500);
      } else {
        setDisplayLot(lot);
      }
    } else if (!displayLot && lot) {
      setDisplayLot(lot);
    } else if (!lot && displayLot) {
      setDisplayLot(null);
    } else if (lot && displayLot && lot.lotId === displayLot.lotId) {
      setDisplayLot(lot);
    }
  }, [lot]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-close expired lots ── */
  useEffect(() => {
    if (!lot || lot.status !== "open" || !lot.endsAt || auctionState?.status === "paused") return;
    const interval = setInterval(() => {
      if (Date.now() > lot.endsAt) {
        callApi("/api/lot/close").catch(console.error);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lot, auctionState?.status]);

  const isPaused = auctionState?.status === "paused";

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-body relative overflow-hidden">
      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(124,59,237,0.12) 0%, rgba(8,8,18,1) 70%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(var(--color-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--color-secondary) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />

      {/* ── Operator Bar (sticky top) ── */}
      <OperatorBar auctionState={auctionState} totalLots={totalLots} onAction={handleAction} busy={busy} />

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[60] px-5 py-3 rounded-xl border text-sm font-heading tracking-wide shadow-xl transition-all
          ${toast.type === "ok"
            ? "bg-green-900/70 border-green-500/40 text-green-300"
            : "bg-red-900/70 border-red-500/40 text-red-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Main content area (offset for operator bar) ── */}
      <div className={`flex-1 flex flex-col pt-20 ${auctionState?.status === "finished" ? "items-stretch justify-start" : "items-center justify-center"} p-8 relative z-10 w-full max-w-7xl mx-auto`}>

        {auctionState?.status === "finished" ? (
          <ResultsView />
        ) : !displayLot ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center mb-2">
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-2xl font-heading text-zinc-400">
              {auctionState?.status === "paused" ? "Auction Paused" : "Waiting for auction to start…"}
            </p>
            <p className="text-zinc-600 font-body text-sm">
              Status: <span className="text-zinc-400">{auctionState?.status ?? "not connected"}</span>
            </p>
          </div>
        ) : (
          <>
            {/* Paused overlay */}
            {isPaused && <PausedOverlay />}

            {/* ── Central lot card ── */}
            <div className="flex flex-col items-center mb-10">
              {/* Ring + logo */}
              <div className="relative w-80 h-80 flex items-center justify-center mb-8">
                {showSold && <SoldOverlay lot={displayLot} />}

                {/* Logo frame */}
                <div
                  className="w-64 h-64 rounded-full overflow-hidden border-2 border-primary bg-background shadow-2xl relative z-10 flex items-center justify-center"
                  style={{ boxShadow: `0 0 50px rgba(0,229,255,0.12), 0 0 100px rgba(0,229,255,0.05)` }}
                >
                  {displayLot.logoUrl ? (
                    <img src={displayLot.logoUrl} alt={displayLot.toolName} className="w-3/4 h-3/4 object-contain" />
                  ) : (
                    <span className="text-6xl font-heading text-primary/40 font-bold select-none">
                      {displayLot.toolName.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Countdown ring + numeric */}
                <CountdownRing endsAt={displayLot.endsAt} isPaused={isPaused} />
              </div>

              {/* Tool name + tier badge */}
              <div className="flex items-center gap-4 mb-6">
                <h1 className="text-5xl font-heading font-semibold tracking-tight uppercase text-text">
                  {displayLot.toolName}
                </h1>
                <span
                  className={`px-4 py-1.5 rounded-full text-lg font-heading font-bold ${getTierColor(displayLot.tier)}`}
                  style={{ boxShadow: `0 0 16px ${getTierGlow(displayLot.tier)}` }}
                >
                  {displayLot.tier}-TIER
                </span>
              </div>

              {/* IPL stat row */}
              <div className="flex border border-primary/25 rounded-lg bg-background/80 backdrop-blur-md overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.04)]">
                {[
                  { label: "Tier", value: displayLot.tier },
                  { label: "Base Price", value: `${displayLot.startingPrice} DC` },
                  { label: "Lot #", value: `${(auctionState?.currentLotIndex ?? 0) + 1}` },
                  { label: "Status", value: isPaused ? "Paused" : "Live" },
                ].map((item, i, arr) => (
                  <div key={item.label} className={`flex flex-col items-center justify-center px-8 py-3 bg-primary/5 min-w-[130px] ${i < arr.length - 1 ? "border-r border-primary/25" : ""}`}>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase font-heading tracking-[0.2em] mb-1">{item.label}</span>
                    <span className={`text-xl font-heading font-semibold tabular-nums ${item.label === "Status" && !isPaused ? "text-green-400" : item.label === "Status" ? "text-yellow-400" : "text-white"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Current Bid / Leaderboard bar ── */}
      {displayLot && auctionState?.status !== "finished" && (() => {
        const leaderboard = Array.isArray(displayLot.leaderboard) ? displayLot.leaderboard : [];
        const maxWinners = displayLot.maxWinners ?? (displayLot.tier === "S" ? 4 : 6);
        const clearingPrice =
          leaderboard.length >= maxWinners
            ? leaderboard[maxWinners - 1].amount
            : leaderboard.length > 0
            ? leaderboard[leaderboard.length - 1].amount
            : displayLot.startingPrice;
        const spotsFilled = Math.min(leaderboard.length, maxWinners);

        return (
          <div className="border-t border-primary/25 bg-background/95 backdrop-blur-xl relative z-10 px-8 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.7)]">
            {/* Stats row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-heading uppercase tracking-[0.25em] text-primary/70 mb-0.5">Clearing Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-heading font-bold tabular-nums text-white drop-shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                    {clearingPrice}
                  </span>
                  <span className="text-base text-zinc-600 font-heading uppercase tracking-widest">DC · all winners pay this</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-heading uppercase tracking-[0.25em] text-zinc-600 mb-0.5 block">Spots Filled</span>
                <span className="text-3xl font-heading font-bold text-white">{spotsFilled}<span className="text-zinc-600 text-xl">/{maxWinners}</span></span>
              </div>
            </div>

            {/* Leaderboard table */}
            {leaderboard.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {leaderboard.map((entry, idx) => {
                  const isWinning = idx < maxWinners;
                  return (
                    <div
                      key={entry.teamId}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-heading transition-all ${
                        isWinning
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-zinc-700/50 bg-zinc-800/30 text-zinc-500"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isWinning ? "bg-primary/20 text-primary" : "bg-zinc-700 text-zinc-500"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold">{entry.teamName}</span>
                      <span className="tabular-nums font-bold">{entry.amount} DC</span>
                      {isWinning && (
                        <span className="text-[9px] text-primary/60 uppercase tracking-wider">WIN</span>
                      )}
                    </div>
                  );
                })}
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, maxWinners - leaderboard.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800/40 bg-zinc-900/20 text-zinc-700 text-sm font-heading">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px]">{leaderboard.length + i + 1}</span>
                    <span className="italic text-xs">open</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 font-heading text-sm italic">No bids yet</p>
            )}
          </div>
        );
      })()}

      {/* ── Next Up strip ── */}
      {nextLot && (auctionState?.status === "live" || auctionState?.status === "paused") && (
        <div className="fixed bottom-32 right-6 z-20 flex items-center gap-4 px-5 py-3 rounded-xl border border-secondary/30 bg-background/85 backdrop-blur-md shadow-[0_0_30px_rgba(124,59,237,0.15)] opacity-75 hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full border border-secondary/40 bg-background flex items-center justify-center p-2 overflow-hidden flex-shrink-0">
            {nextLot.logoUrl ? (
              <img src={nextLot.logoUrl} alt={nextLot.toolName} className="w-full h-full object-contain opacity-60" />
            ) : (
              <span className="text-[10px] font-heading text-secondary">{nextLot.toolName.substring(0, 2)}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-secondary font-heading uppercase tracking-widest font-bold">Next Up</span>
            <span className="text-sm text-zinc-300 font-heading font-semibold">{nextLot.toolName}</span>
            <span className={`text-[10px] font-heading font-bold ${nextLot.tier === "S" ? "text-[#ff29d4]" : "text-[#7c3bed]"}`}>{nextLot.tier}-TIER · {nextLot.startingPrice} DC</span>
          </div>
        </div>
      )}
    </div>
  );
}
