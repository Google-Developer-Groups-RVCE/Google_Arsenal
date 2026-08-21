"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  startingPrice: number;
  maxWinners: number;
};

type Team = {
  id: string;
  name: string;
  members: string[];
  code: string;
  purse: number;
  ownedTools?: { toolId: string; toolName: string; tier: "S" | "A" | "B"; pricePaid: number }[];
  tierCounts?: { S: number; A: number; B: number };
};

const TIER = {
  S: { bg: "#ff29d4", glow: "rgba(255,41,212,0.5)", text: "#ff29d4", label: "S-TIER" },
  A: { bg: "#7c3bed", glow: "rgba(124,59,237,0.5)", text: "#a78bfa", label: "A-TIER" },
  B: { bg: "#00e5ff", glow: "rgba(0,229,255,0.3)", text: "#67e8f9", label: "B-TIER" },
};

/* ─── API helper ─── */
async function callApi(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { const text = await res.text(); throw new Error(`${res.status}: ${text}`); }
  return res.json();
}

/* ══════════════════════════════════════
   RESULTS VIEW
══════════════════════════════════════ */
function ResultsView() {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const unsub = onValue(ref(db, "teams"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        arr.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(arr);
      } else { setTeams([]); }
    });
    return () => unsub();
  }, []);

  return (
    <div className="w-full h-full pt-4 pb-12 overflow-y-auto">
      <h2 className="text-4xl font-heading font-bold text-center mb-3 uppercase tracking-widest"
        style={{ color: "#00e5ff", textShadow: "0 0 30px rgba(0,229,255,0.4)" }}>
        Auction Results
      </h2>
      <p className="text-center text-sm font-body mb-10" style={{ color: "#334155" }}>Final arsenal for each team</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {teams.map((team) => (
          <div key={team.id}
            className="flex flex-col rounded-2xl relative overflow-hidden transition-all group"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(0,229,255,0.12)",
              boxShadow: "0 0 20px rgba(0,0,0,0.4)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(0,229,255,0.3)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 30px rgba(0,229,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(0,229,255,0.12)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(0,0,0,0.4)"; }}>
            {/* Ambient gradient */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl opacity-30"
              style={{ background: "radial-gradient(circle at top right, rgba(124,59,237,0.3) 0%, transparent 60%)" }} />

            <div className="p-5 flex flex-col flex-1 relative z-10">
              <h3 className="text-xl font-heading font-bold mb-0.5" style={{ color: "#f1f5f9" }}>{team.name}</h3>
              <p className="text-xs font-body mb-4 line-clamp-1" style={{ color: "#475569" }}>{team.members?.join(", ")}</p>

              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[9px] text-zinc-600 uppercase font-heading tracking-[0.2em] font-bold">Arsenal</span>
                <div className="flex flex-wrap gap-1.5">
                  {team.ownedTools && team.ownedTools.length > 0 ? (
                    team.ownedTools.map((tool, idx) => {
                      const t = TIER[tool.tier];
                      return (
                        <div key={idx} className="flex items-center rounded-lg overflow-hidden"
                          style={{ border: `1px solid ${t.bg}30`, background: `${t.bg}10` }}>
                          <span className="px-2 py-1 text-[9px] font-heading font-bold tracking-wider" style={{ background: t.bg, color: "#fff" }}>{tool.tier}</span>
                          <span className="px-2 py-1 text-xs font-heading font-semibold max-w-[110px] truncate" style={{ color: "#94a3b8" }}>{tool.toolName}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs font-body italic" style={{ color: "#1e293b" }}>No tools acquired</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 flex justify-between items-center"
                style={{ borderTop: "1px solid rgba(0,229,255,0.1)" }}>
                <span className="text-[9px] font-heading uppercase tracking-[0.2em]" style={{ color: "#1e293b" }}>Remaining</span>
                <span className="text-2xl font-heading font-bold tabular-nums" style={{ color: "#f1f5f9" }}>{team.purse} <span className="text-sm" style={{ color: "#334155" }}>DC</span></span>
              </div>
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
function CountdownRing({ endsAt, isPaused, tier }: { endsAt: number; isPaused: boolean; tier?: "S" | "A" | "B" }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const totalDuration = LOT_DURATION_MS;

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setTimeLeft(Math.max(0, endsAt - Date.now()));
    tick();
    if (isPaused) return;
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [endsAt, isPaused]);

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(1, Math.max(0, timeLeft / totalDuration));
  const offset = circumference - percent * circumference;
  const isUrgent = timeLeft < 5000 && timeLeft > 0;
  const secs = Math.ceil(timeLeft / 1000);

  const ringColor = isUrgent ? "#ff29d4" : tier ? TIER[tier].bg : "#00e5ff";
  const glowColor = isUrgent ? "rgba(255,41,212,0.7)" : tier ? TIER[tier].glow : "rgba(0,229,255,0.6)";

  // Render into a full-bleed absolute wrapper — no fragment needed
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {/* SVG ring — rotated so progress flows clockwise from top */}
      <svg
        viewBox="0 0 280 280"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}
      >
        {/* Dashed track */}
        <circle cx="140" cy="140" r={radius + 10} fill="none" stroke={ringColor}
          strokeWidth="1" strokeDasharray="3 5" opacity="0.18" />
        {/* Progress arc */}
        <circle cx="140" cy="140" r={radius} fill="none" stroke={ringColor}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.1s linear, stroke 0.4s ease",
            filter: `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 20px ${glowColor})`,
          }}
        />
      </svg>
      {/* Countdown number centred at bottom of the ring */}
      <div style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "baseline",
        gap: 2,
        filter: isUrgent ? `drop-shadow(0 0 8px ${glowColor})` : undefined,
      }}>
        <span style={{ fontSize: 36, fontWeight: 700, fontFamily: "'General Sans', sans-serif", color: ringColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {isPaused ? "—" : secs}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'General Sans', sans-serif", color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>s</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   OPERATOR CONTROL BAR
══════════════════════════════════════ */
function OperatorBar({ auctionState, totalLots, onAction, busy }: {
  auctionState: AuctionState | null;
  totalLots: number;
  onAction: (label: string, fn: () => Promise<void>) => void;
  busy: string | null;
}) {
  const status = auctionState?.status;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
      style={{ background: "rgba(8,8,18,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,229,255,0.12)", boxShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
      {/* Left: logos */}
      <div className="flex items-center gap-3">
        <img src="/gdg-2.svg" alt="GDG" className="h-7 w-auto opacity-60" />
        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.08)" }} />
        <img src="/gdg-1.svg" alt="GDG RVCE" className="h-5 w-auto max-w-[110px] opacity-40" />
        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.08)" }} />
        <span className="text-[10px] font-heading uppercase tracking-[0.2em]" style={{ color: "rgba(0,229,255,0.5)" }}>Operator</span>
      </div>

      {/* Center: status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${status === "live" ? "animate-pulse" : ""}`}
          style={{ background: status === "live" ? "#4ade80" : status === "paused" ? "#fbbf24" : status === "finished" ? "#00e5ff" : "#334155" }} />
        <span className="text-xs font-heading uppercase tracking-[0.2em]" style={{ color: "#64748b" }}>
          {status === "not_started" ? "Not Started" : status === "live" ? "Live" : status === "paused" ? "Paused" : status === "finished" ? "Finished" : "Loading..."}
        </span>
        {auctionState && status !== "not_started" && status !== "finished" && (
          <span className="text-xs font-body" style={{ color: "#334155" }}>
            · Lot #{(auctionState.currentLotIndex ?? 0) + 1}{totalLots > 0 ? ` of ${totalLots}` : ""}
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {(!status || status === "not_started") && (
          <button disabled={!!busy}
            onClick={() => onAction("start", () => callApi("/api/admin/start"))}
            className="px-4 py-1.5 rounded-lg text-sm font-heading transition-all disabled:opacity-50 disabled:cursor-wait"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.4)", color: "#00e5ff" }}>
            {busy === "start" ? "Starting…" : "▶ Start Auction"}
          </button>
        )}

        {status === "finished" && (
          <button disabled={!!busy}
            onClick={() => onAction("start", () => callApi("/api/admin/start"))}
            className="px-4 py-1.5 rounded-lg text-sm font-heading transition-all disabled:opacity-50 disabled:cursor-wait"
            style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}>
            {busy === "start" ? "Restarting…" : "↺ Restart"}
          </button>
        )}

        {status && status !== "not_started" && (
          <button disabled={!!busy}
            onClick={() => { if (!confirm("Reset auction? Team registrations and purses are preserved.")) return; onAction("reset", () => callApi("/api/admin/reset")); }}
            className="px-4 py-1.5 rounded-lg text-sm font-heading transition-all disabled:opacity-50 disabled:cursor-wait"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#475569" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.2)"; }}>
            {busy === "reset" ? "Resetting…" : "⚠ Reset"}
          </button>
        )}

        {(status === "live" || status === "paused") && (
          <>
            <button disabled={!!busy}
              onClick={() => onAction(status === "paused" ? "resume" : "pause", () => callApi("/api/admin/control", { action: status === "paused" ? "resume" : "pause" }))}
              className="px-4 py-1.5 rounded-lg text-sm font-heading transition-all disabled:opacity-50 disabled:cursor-wait"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
              {busy === "pause" || busy === "resume" ? "…" : status === "paused" ? "▶ Resume" : "⏸ Pause"}
            </button>

            <button disabled={!!busy}
              onClick={() => onAction("skip", () => callApi("/api/admin/control", { action: "skip" }))}
              className="px-4 py-1.5 rounded-lg text-sm font-heading transition-all disabled:opacity-50 disabled:cursor-wait"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
              {busy === "skip" ? "Skipping…" : "⏭ Skip"}
            </button>

            <button disabled={!!busy}
              onClick={() => onAction("force-close", () => callApi("/api/lot/close", { force: true }))}
              className="px-4 py-1.5 rounded-lg text-sm font-heading transition-all disabled:opacity-50 disabled:cursor-wait"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              {busy === "force-close" ? "Closing…" : "✕ Force Close"}
            </button>
          </>
        )}

        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.06)" }} />

        <button onClick={() => signOut(auth)}
          className="px-3 py-1.5 rounded-lg text-sm font-heading transition-all"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#334155" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#334155"; }}>
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
      <div className="px-12 py-6 rounded-2xl text-center"
        style={{ background: "rgba(8,8,18,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 0 40px rgba(251,191,36,0.1)" }}>
        <div className="text-5xl mb-2">⏸</div>
        <div className="text-2xl font-heading font-bold uppercase tracking-widest" style={{ color: "#fbbf24" }}>Auction Paused</div>
        <div className="text-sm font-body mt-1" style={{ color: "#475569" }}>Timer is frozen. Resume to continue.</div>
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
      <div className="absolute inset-0 rounded-full blur-md" style={{ background: "rgba(8,8,18,0.6)" }} />
      <span className="text-8xl font-heading font-extrabold animate-ping absolute opacity-15" style={{ color: "#ff29d4" }}>SOLD</span>
      <div className="z-10 flex flex-col items-center gap-2">
        <span className="text-7xl font-heading font-extrabold" style={{ color: "#ff29d4", textShadow: "0 0 40px rgba(255,41,212,0.8)" }}>SOLD</span>
        <span className="text-xl font-heading text-white tracking-widest">
          {winners.length > 1 ? `${winners.length} teams` : winners[0]?.teamName ?? ""}
        </span>
        {clearingPrice > 0 && <span className="text-base font-heading" style={{ color: "rgba(0,229,255,0.8)" }}>@ {clearingPrice} DC each</span>}
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

  // useRef keeps the busy flag fresh inside callbacks without stale closures
  const busyRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleAction = useCallback(async (label: string, fn: () => Promise<void>) => {
    if (busyRef.current) return;      // already busy — ignore
    busyRef.current = label;
    setBusy(label);
    try {
      await fn();
      showToast(`${label} ✓`, "ok");
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "err");
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  }, [showToast]);

  useEffect(() => {
    const unsubLot = onValue(ref(db, "currentLot"), (snap) => setLot(snap.exists() ? snap.val() : null));
    const unsubQueue = onValue(ref(db, "lotQueue"), (snap) => {
      if (snap.exists()) { const q = snap.val(); setTotalLots(Array.isArray(q) ? q.length : Object.keys(q).length); }
      else setTotalLots(0);
    });
    const unsubState = onValue(ref(db, "auctionState"), (snap) => {
      if (snap.exists()) {
        const state = snap.val() as AuctionState;
        setAuctionState(state);
        if (state.currentLotIndex !== undefined && state.status !== "finished") {
          onValue(ref(db, `lotQueue/${state.currentLotIndex + 1}`), (nextSnap) => setNextLot(nextSnap.exists() ? nextSnap.val() : null), { onlyOnce: true });
        } else { setNextLot(null); }
      } else { setAuctionState(null); setNextLot(null); }
    });
    return () => { unsubLot(); unsubQueue(); unsubState(); };
  }, []);

  useEffect(() => {
    if (lot && displayLot && lot.lotId !== displayLot.lotId) {
      const hadBids = Array.isArray(displayLot.leaderboard) && displayLot.leaderboard.length > 0;
      if (hadBids) { setShowSold(true); setTimeout(() => { setShowSold(false); setDisplayLot(lot); }, 2500); }
      else setDisplayLot(lot);
    } else if (!displayLot && lot) { setDisplayLot(lot); }
    else if (!lot && displayLot) { setDisplayLot(null); }
    else if (lot && displayLot && lot.lotId === displayLot.lotId) { setDisplayLot(lot); }
  }, [lot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lot || lot.status !== "open" || !lot.endsAt || auctionState?.status === "paused") return;
    const interval = setInterval(() => { if (Date.now() > lot.endsAt) callApi("/api/lot/close").catch(console.error); }, 1000);
    return () => clearInterval(interval);
  }, [lot, auctionState?.status]);

  const isPaused = auctionState?.status === "paused";
  const tierMeta = displayLot ? TIER[displayLot.tier] : null;

  return (
    <div className="auction-theme min-h-screen flex flex-col font-body relative overflow-hidden" style={{ background: "#080812" }}>

      {/* ── Deep ambient background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {tierMeta && (
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "80vw", height: "60vh",
            background: `radial-gradient(ellipse at top, ${tierMeta.glow} 0%, transparent 70%)`,
            transition: "background 1.5s ease",
          }} />
        )}
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(rgba(0,229,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* ── Operator Bar ── */}
      <OperatorBar auctionState={auctionState} totalLots={totalLots} onAction={handleAction} busy={busy} />

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[60] px-5 py-3 rounded-xl text-sm font-heading tracking-wide shadow-xl transition-all`}
          style={{
            background: toast.type === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: toast.type === "ok" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
            color: toast.type === "ok" ? "#4ade80" : "#f87171",
          }}>
          {toast.msg}
        </div>
      )}

      {/* ── Main area ── */}
      <div className={`flex-1 flex flex-col pt-20 ${auctionState?.status === "finished" ? "items-stretch justify-start" : "items-center justify-center"} p-8 relative z-10 w-full max-w-7xl mx-auto`}>

        {auctionState?.status === "finished" ? (
          <ResultsView />
        ) : !displayLot ? (
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,229,255,0.04)", border: "1px dashed rgba(0,229,255,0.15)" }}>
              <span className="text-3xl">🎯</span>
            </div>
            <p className="text-2xl font-heading" style={{ color: "#334155" }}>
              {auctionState?.status === "paused" ? "Auction Paused" : "Waiting for auction to start…"}
            </p>
            <p className="text-sm font-body" style={{ color: "#1e293b" }}>
              Status: <span style={{ color: "#334155" }}>{auctionState?.status ?? "not connected"}</span>
            </p>
          </div>
        ) : (
          <>
            {isPaused && <PausedOverlay />}

            {/* ── Central lot card ── */}
            <div className="flex flex-col items-center mb-8">
              {/* Ring + logo — ring sits OUTSIDE the logo's overflow:hidden */}
              <div className="relative mb-6" style={{ width: 320, height: 320 }}>
                {showSold && <SoldOverlay lot={displayLot} />}

                {/* Countdown ring — rendered first so it's behind the logo visually but above z-0 */}
                <CountdownRing endsAt={displayLot.endsAt} isPaused={isPaused} tier={displayLot.tier} />

                {/* Logo frame — centred inside the 320×320 container, NO overflow-hidden on the outer ring */}
                <div
                  className="absolute flex items-center justify-center rounded-full"
                  style={{
                    width: 220,
                    height: 220,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "#080812",
                    border: `2px solid ${tierMeta?.bg ?? "#334155"}`,
                    boxShadow: `0 0 60px ${tierMeta?.glow ?? "transparent"}, 0 0 120px ${tierMeta ? tierMeta.glow.replace("0.5)", "0.15)") : "transparent"}`,
                    overflow: "hidden",
                    zIndex: 10,
                  }}
                >
                  {displayLot.logoUrl ? (
                    <img src={displayLot.logoUrl} alt={displayLot.toolName} style={{ width: "68%", height: "68%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: 56, fontFamily: "'General Sans',sans-serif", fontWeight: 700, color: `${tierMeta?.bg ?? "#334155"}60` }}>
                      {displayLot.toolName.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Tool name + tier badge */}
              <div className="flex items-center gap-4 mb-6">
                <h1 className="text-5xl font-heading font-bold tracking-tight uppercase" style={{ color: "#f1f5f9" }}>
                  {displayLot.toolName}
                </h1>
                <span className="px-4 py-1.5 rounded-full text-lg font-heading font-bold"
                  style={{
                    background: `${tierMeta?.bg ?? "#334155"}18`,
                    color: tierMeta?.bg ?? "#334155",
                    border: `1.5px solid ${tierMeta?.bg ?? "#334155"}50`,
                    boxShadow: `0 0 20px ${tierMeta?.glow ?? "transparent"}`,
                  }}>
                  {displayLot.tier}-TIER
                </span>
              </div>

              {/* Stat row */}
              <div className="flex overflow-hidden rounded-xl"
                style={{ border: "1px solid rgba(0,229,255,0.12)", background: "rgba(255,255,255,0.025)" }}>
                {[
                  { label: "Tier", value: displayLot.tier },
                  { label: "Base Price", value: `${displayLot.startingPrice} DC` },
                  { label: "Lot #", value: `${(auctionState?.currentLotIndex ?? 0) + 1}` },
                  { label: "Status", value: isPaused ? "Paused" : "Live" },
                ].map((item, i, arr) => (
                  <div key={item.label}
                    className="flex flex-col items-center justify-center px-8 py-3 min-w-[130px]"
                    style={{ borderRight: i < arr.length - 1 ? "1px solid rgba(0,229,255,0.1)" : "none" }}>
                    <span className="text-[10px] font-bold uppercase font-heading tracking-[0.2em] mb-1" style={{ color: "#1e293b" }}>{item.label}</span>
                    <span className="text-xl font-heading font-semibold tabular-nums"
                      style={{ color: item.label === "Status" ? (isPaused ? "#fbbf24" : "#4ade80") : "#f1f5f9" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bid / Leaderboard bar (bottom) ── */}
      {displayLot && auctionState?.status !== "finished" && (() => {
        const leaderboard = Array.isArray(displayLot.leaderboard) ? displayLot.leaderboard : [];
        const maxWinners = displayLot.maxWinners ?? (displayLot.tier === "S" ? 4 : 6);
        const clearingPrice = leaderboard.length >= maxWinners ? leaderboard[maxWinners - 1].amount : leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].amount : displayLot.startingPrice;
        const spotsFilled = Math.min(leaderboard.length, maxWinners);

        return (
          <div className="relative z-10 px-8 py-5"
            style={{ background: "rgba(8,8,18,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(0,229,255,0.1)", boxShadow: "0 -10px 40px rgba(0,0,0,0.7)" }}>
            {/* Stats row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-heading uppercase tracking-[0.25em] mb-0.5" style={{ color: "rgba(0,229,255,0.5)" }}>Clearing Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-heading font-bold tabular-nums" style={{ color: "#f1f5f9", textShadow: "0 0 20px rgba(0,229,255,0.25)" }}>{clearingPrice}</span>
                  <span className="text-sm font-heading uppercase tracking-widest" style={{ color: "#334155" }}>DC · all winners pay this</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-heading uppercase tracking-[0.25em] block mb-0.5" style={{ color: "#334155" }}>Spots Filled</span>
                <span className="text-3xl font-heading font-bold" style={{ color: "#f1f5f9" }}>
                  {spotsFilled}<span style={{ color: "#334155", fontSize: "1.2rem" }}>/{maxWinners}</span>
                </span>
              </div>
            </div>

            {/* Leaderboard chips */}
            {leaderboard.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {leaderboard.map((entry, idx) => {
                  const isWin = idx < maxWinners;
                  return (
                    <div key={entry.teamId}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-heading"
                      style={{
                        background: isWin ? "rgba(0,229,255,0.07)" : "rgba(255,255,255,0.03)",
                        border: isWin ? "1px solid rgba(0,229,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        color: isWin ? "#00e5ff" : "#334155",
                      }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: isWin ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)", color: isWin ? "#00e5ff" : "#334155" }}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold">{entry.teamName}</span>
                      <span className="tabular-nums font-bold">{entry.amount} DC</span>
                      {isWin && <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(0,229,255,0.5)" }}>WIN</span>}
                    </div>
                  );
                })}
                {Array.from({ length: Math.max(0, maxWinners - leaderboard.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-heading"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "#1e293b" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: "rgba(255,255,255,0.03)" }}>{leaderboard.length + i + 1}</span>
                    <span className="italic text-xs">open</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-heading italic" style={{ color: "#1e293b" }}>No bids yet</p>
            )}
          </div>
        );
      })()}

      {/* ── Next Up strip ── */}
      {nextLot && (auctionState?.status === "live" || auctionState?.status === "paused") && (
        <div className="fixed bottom-32 right-6 z-20 flex items-center gap-4 px-5 py-3 rounded-xl transition-opacity opacity-70 hover:opacity-100"
          style={{ background: "rgba(8,8,18,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(124,59,237,0.25)", boxShadow: "0 0 30px rgba(124,59,237,0.1)" }}>
          <div className="w-10 h-10 rounded-full border flex items-center justify-center p-2 overflow-hidden flex-shrink-0"
            style={{ background: "#080812", borderColor: "rgba(124,59,237,0.3)" }}>
            {nextLot.logoUrl ? <img src={nextLot.logoUrl} alt={nextLot.toolName} className="w-full h-full object-contain opacity-60" /> : <span className="text-[10px] font-heading" style={{ color: "#7c3bed" }}>{nextLot.toolName.substring(0, 2)}</span>}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-heading uppercase tracking-widest font-bold" style={{ color: "#7c3bed" }}>Next Up</span>
            <span className="text-sm font-heading font-semibold" style={{ color: "#94a3b8" }}>{nextLot.toolName}</span>
            <span className="text-[10px] font-heading font-bold" style={{ color: TIER[nextLot.tier].bg }}>{nextLot.tier}-TIER · {nextLot.startingPrice} DC</span>
          </div>
        </div>
      )}
    </div>
  );
}
