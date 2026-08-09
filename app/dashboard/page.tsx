"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

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

function CountdownRing({ endsAt }: { endsAt: number }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const totalDuration = 15000; // Fake assumption for visual scale
  
  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, endsAt - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [endsAt]);

  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(1, Math.max(0, timeLeft / totalDuration));
  const offset = circumference - percent * circumference;
  const isUrgent = timeLeft < 5000 && timeLeft > 0;

  return (
    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 320 320">
      {/* Dashed outer boundary (the decorative dotted ring) */}
      <circle 
        cx="160" cy="160" r={radius + 12} 
        fill="none" stroke="var(--color-primary)" strokeWidth="2" 
        strokeDasharray="4 6"
        className="opacity-30"
      />
      {/* Progress ring */}
      <circle 
        cx="160" cy="160" r={radius} 
        fill="none" 
        stroke={isUrgent ? "var(--color-accent)" : "var(--color-primary)"} 
        strokeWidth="6" 
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-75"
        style={{ filter: `drop-shadow(0 0 12px ${isUrgent ? "var(--color-accent)" : "var(--color-primary)"})` }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const [lot, setLot] = useState<CurrentLot | null>(null);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);

  useEffect(() => {
    const lotRef = ref(db, "currentLot");
    const unsubLot = onValue(lotRef, (snapshot) => {
      if (snapshot.exists()) {
        setLot(snapshot.val());
      } else {
        setLot(null);
      }
    });

    const stateRef = ref(db, "auctionState");
    const unsubState = onValue(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        setAuctionState(snapshot.val());
      } else {
        setAuctionState(null);
      }
    });

    return () => {
      unsubLot();
      unsubState();
    };
  }, []);

  const getTierColor = (tier: string) => {
    if (tier === "S") return "bg-accent text-white";
    if (tier === "A") return "bg-secondary text-white";
    return "bg-zinc-700 text-zinc-200";
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-body relative overflow-hidden">
      {/* Background glow/grid effect */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{
             background: "radial-gradient(circle at center, rgba(124,59,237,0.15) 0%, rgba(8,8,18,1) 70%)"
           }} 
      />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{
             backgroundImage: "linear-gradient(var(--color-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--color-secondary) 1px, transparent 1px)",
             backgroundSize: "40px 40px"
           }} 
      />

      {/* Top right admin controls */}
      <div className="absolute top-6 right-6 z-10 flex gap-4">
        {(!auctionState || auctionState.status === "not_started") ? (
          <button 
            onClick={async () => await fetch('/api/admin/start', { method: 'POST' })}
            className="px-4 py-2 bg-accent/20 hover:bg-accent/40 border border-accent rounded text-sm text-accent backdrop-blur transition-colors"
          >
            Start Auction
          </button>
        ) : auctionState.status !== "finished" ? (
          <>
            <button 
              onClick={async () => await fetch('/api/admin/control', { method: 'POST', body: JSON.stringify({ action: auctionState.status === "paused" ? "resume" : "pause" }) })}
              className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-zinc-300 backdrop-blur transition-colors"
            >
              {auctionState.status === "paused" ? "Resume" : "Pause"}
            </button>
            <button 
              onClick={async () => await fetch('/api/admin/control', { method: 'POST', body: JSON.stringify({ action: "skip" }) })}
              className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-zinc-300 backdrop-blur transition-colors"
            >
              Skip Lot
            </button>
            <button 
              onClick={async () => await fetch('/api/admin/control', { method: 'POST', body: JSON.stringify({ action: "force-close" }) })}
              className="px-4 py-2 bg-red-900/30 hover:bg-red-900/60 border border-red-800 rounded text-sm text-red-400 backdrop-blur transition-colors"
            >
              Force-Close Lot
            </button>
          </>
        ) : null}
        <button 
          onClick={() => signOut(auth)}
          className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded text-sm text-zinc-400 backdrop-blur transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 w-full max-w-6xl mx-auto">
        {!lot ? (
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-heading text-zinc-500 mb-2">Waiting for next lot...</p>
            <p className="text-zinc-600">Current Status: {auctionState?.status || "Loading..."}</p>
          </div>
        ) : (
          <>
            {/* Main Center Card */}
            <div className="flex flex-col items-center mb-12">
              <div className="relative w-80 h-80 flex items-center justify-center mb-8">
                {/* Logo Frame */}
                <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-background bg-zinc-900 shadow-2xl relative z-10 flex items-center justify-center"
                     style={{ boxShadow: "0 0 40px rgba(0, 229, 255, 0.2)" }}>
                  {lot.logoUrl ? (
                    <img src={lot.logoUrl} alt={lot.toolName} className="w-3/4 h-3/4 object-contain" />
                  ) : (
                    <span className="text-6xl font-heading text-zinc-600 font-bold">{lot.toolName.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                {/* Functional Countdown */}
                <CountdownRing endsAt={lot.endsAt} />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <h1 className="text-6xl font-heading font-semibold tracking-tight uppercase shadow-sm">
                  {lot.toolName}
                </h1>
                <span className={`px-4 py-1.5 rounded-full text-xl font-heading font-bold ${getTierColor(lot.tier)}`}>
                  {lot.tier} TIER
                </span>
              </div>

              {/* Stats Row */}
              <div className="flex border border-primary/40 rounded bg-background/60 backdrop-blur-sm overflow-hidden shadow-lg">
                <div className="flex flex-col items-center justify-center px-8 py-4 border-r border-primary/40 min-w-[160px]">
                  <span className="text-sm text-zinc-400 uppercase font-heading tracking-widest mb-1">Base Price</span>
                  <span className="text-3xl font-heading text-primary font-semibold tabular-nums">{lot.startingPrice}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-4 border-r border-primary/40 min-w-[160px]">
                  <span className="text-sm text-zinc-400 uppercase font-heading tracking-widest mb-1">Tier</span>
                  <span className="text-3xl font-heading font-semibold">{lot.tier}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-4 border-r border-primary/40 min-w-[160px]">
                  <span className="text-sm text-zinc-400 uppercase font-heading tracking-widest mb-1">Copies</span>
                  <span className="text-3xl font-heading font-semibold text-zinc-300">--</span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-4 min-w-[160px]">
                  <span className="text-sm text-zinc-400 uppercase font-heading tracking-widest mb-1">Category</span>
                  <span className="text-xl font-heading font-semibold text-zinc-300 mt-1">Software</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Current Bid Bottom Bar */}
      {lot && (
        <div className="h-32 border-t border-primary/30 bg-zinc-900/80 backdrop-blur-md relative z-10 flex items-center justify-between px-16 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col">
            <span className="text-primary font-heading uppercase tracking-[0.2em] text-sm mb-1 font-semibold">Current Bid</span>
            <div className="flex items-baseline gap-6">
              <span className="text-6xl font-heading font-bold tabular-nums text-white">
                {lot.currentBid || lot.startingPrice}
              </span>
              <span className="text-2xl text-zinc-400 font-body uppercase tracking-wide">Purse Units</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-zinc-500 font-heading uppercase tracking-[0.2em] text-sm mb-1 font-semibold">Leading Team</span>
            {lot.currentBidderTeamName ? (
              <span className="text-5xl font-heading font-bold text-white text-right">
                {lot.currentBidderTeamName}
              </span>
            ) : (
              <span className="text-4xl font-heading font-bold text-zinc-600 italic">No Bids Yet</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
