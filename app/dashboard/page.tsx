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

function ResultsView({ getTierColor }: { getTierColor: (tier: string) => string }) {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const teamsRef = ref(db, "teams");
    const unsub = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const teamsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        teamsArray.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(teamsArray);
      } else {
        setTeams([]);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="w-full h-full pt-4 pb-12 overflow-y-auto">
      <h2 className="text-4xl font-heading font-bold text-center mb-12 uppercase tracking-widest text-primary shadow-sm">Auction Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teams.map(team => (
          <div key={team.id} className="flex flex-col border border-primary/30 rounded bg-zinc-900/60 backdrop-blur-sm p-6 shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                 style={{ background: "radial-gradient(circle at center, rgba(124,59,237,0.4) 0%, transparent 70%)" }} />
            
            <h3 className="text-2xl font-heading font-bold text-white mb-1 z-10">{team.name}</h3>
            <p className="text-sm text-zinc-400 mb-4 z-10 h-10 overflow-hidden line-clamp-2">{team.members?.join(", ")}</p>
            
            <div className="flex-1 z-10 flex flex-col gap-2">
              <span className="text-xs text-zinc-500 uppercase font-heading tracking-widest">Arsenal</span>
              <div className="flex flex-wrap gap-2">
                {team.ownedTools && team.ownedTools.length > 0 ? (
                  team.ownedTools.map((tool, idx) => (
                    <div key={idx} className="flex items-center bg-zinc-800/80 border border-zinc-700 rounded overflow-hidden">
                      <span className={`px-2 py-1 text-xs font-heading font-bold ${getTierColor(tool.tier)}`}>
                        {tool.tier}
                      </span>
                      <span className="px-2 py-1 text-xs text-zinc-300 font-semibold truncate max-w-[120px]" title={tool.toolName}>
                        {tool.toolName}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 text-sm italic">No tools acquired</span>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex justify-between items-center z-10">
              <span className="text-xs text-zinc-500 uppercase font-heading tracking-widest">Remaining Purse</span>
              <span className="text-lg font-heading font-bold text-zinc-300 tabular-nums">{team.purse}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [displayLot, setDisplayLot] = useState<CurrentLot | null>(null);
  const [showSold, setShowSold] = useState(false);
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

  useEffect(() => {
    if (lot && displayLot && lot.lotId !== displayLot.lotId) {
      if (displayLot.currentBidderTeamId) {
        setShowSold(true);
        setTimeout(() => {
          setShowSold(false);
          setDisplayLot(lot);
        }, 2000);
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
  }, [lot]);

  useEffect(() => {
    if (!lot || lot.status !== "open" || !lot.endsAt) return;
    const interval = setInterval(() => {
      if (Date.now() > lot.endsAt) {
        fetch('/api/lot/close', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        }).catch(console.error);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lot]);

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

      <div className={`flex-1 flex flex-col ${auctionState?.status === "finished" ? "items-stretch justify-start" : "items-center justify-center"} p-8 relative z-10 w-full max-w-7xl mx-auto`}>
        {auctionState?.status === "finished" ? (
          <ResultsView getTierColor={getTierColor} />
        ) : !displayLot ? (
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-heading text-zinc-500 mb-2">Waiting for next lot...</p>
            <p className="text-zinc-600">Current Status: {auctionState?.status || "Loading..."}</p>
          </div>
        ) : (
          <>
            {/* Main Center Card */}
            <div className="flex flex-col items-center mb-12">
              <div className="relative w-80 h-80 flex items-center justify-center mb-8">
                {showSold && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-background/50 rounded-full blur-sm" />
                    <span className="text-8xl font-heading font-extrabold text-accent animate-ping absolute opacity-20">SOLD</span>
                    <span className="text-8xl font-heading font-extrabold text-accent drop-shadow-[0_0_30px_var(--color-accent)] z-10 scale-110 transition-transform duration-500">SOLD</span>
                  </div>
                )}
                {/* Logo Frame */}
                <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-background bg-zinc-900 shadow-2xl relative z-10 flex items-center justify-center"
                     style={{ boxShadow: "0 0 40px rgba(0, 229, 255, 0.2)" }}>
                  {displayLot.logoUrl ? (
                    <img src={displayLot.logoUrl} alt={displayLot.toolName} className="w-3/4 h-3/4 object-contain" />
                  ) : (
                    <span className="text-6xl font-heading text-zinc-600 font-bold">{displayLot.toolName.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                {/* Functional Countdown */}
                <CountdownRing endsAt={displayLot.endsAt} />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <h1 className="text-6xl font-heading font-semibold tracking-tight uppercase shadow-sm">
                  {displayLot.toolName}
                </h1>
                <span className={`px-4 py-1.5 rounded-full text-xl font-heading font-bold ${getTierColor(displayLot.tier)}`}>
                  {displayLot.tier} TIER
                </span>
              </div>

              {/* Stats Row */}
              <div className="flex border border-primary/40 rounded bg-background/60 backdrop-blur-sm overflow-hidden shadow-lg">
                <div className="flex flex-col items-center justify-center px-8 py-4 border-r border-primary/40 min-w-[160px]">
                  <span className="text-base text-zinc-300 font-bold uppercase font-heading tracking-widest mb-1">Base Price</span>
                  <span className="text-3xl font-heading text-primary font-semibold tabular-nums">{displayLot.startingPrice}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-4 border-r border-primary/40 min-w-[160px]">
                  <span className="text-base text-zinc-300 font-bold uppercase font-heading tracking-widest mb-1">Tier</span>
                  <span className="text-3xl font-heading font-semibold">{displayLot.tier}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-4 border-r border-primary/40 min-w-[160px]">
                  <span className="text-base text-zinc-300 font-bold uppercase font-heading tracking-widest mb-1">Copies</span>
                  <span className="text-3xl font-heading font-semibold text-zinc-300">--</span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-4 min-w-[160px]">
                  <span className="text-base text-zinc-300 font-bold uppercase font-heading tracking-widest mb-1">Category</span>
                  <span className="text-xl font-heading font-semibold text-zinc-300 mt-1">Software</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {displayLot && (
        <div className="h-32 border-t border-primary/30 bg-zinc-900/80 backdrop-blur-md relative z-10 flex items-center justify-between px-16 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col">
            <span className="text-primary font-heading uppercase tracking-[0.2em] text-lg mb-2 font-semibold">Current Bid</span>
            <div className="flex items-baseline gap-6">
              <span className="text-7xl font-heading font-bold tabular-nums text-white">
                {displayLot.currentBid || displayLot.startingPrice}
              </span>
              <span className="text-2xl text-zinc-400 font-body uppercase tracking-wide">Purse Units</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-zinc-500 font-heading uppercase tracking-[0.2em] text-lg mb-2 font-semibold">Leading Team</span>
            {displayLot.currentBidderTeamName ? (
              <span className="text-6xl font-heading font-bold text-white text-right">
                {displayLot.currentBidderTeamName}
              </span>
            ) : (
              <span className="text-5xl font-heading font-bold text-zinc-600 italic">No Bids Yet</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
