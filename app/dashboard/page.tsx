"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { MARKETPLACE_TOOLS } from "@/lib/marketplace";

/* ─── Types ────────────────────────────────────────────────────────────── */
interface OwnedTool {
  toolId: string;
  toolName: string;
  tier: "premium" | "standard";
  pricePaid: number;
  acquiredAt: number;
}

interface Team {
  id: string;
  name: string;
  members: string[];
  code: string;
  purse: number;
  ownedTools?: Record<string, OwnedTool> | OwnedTool[]; // legacy array or new object
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function normaliseOwned(raw: Team["ownedTools"]): OwnedTool[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return Object.values(raw);
}

function toolLogo(toolId: string): string | null {
  return MARKETPLACE_TOOLS.find((t) => t.id === toolId)?.logoUrl ?? null;
}

/* ─── Palette ───────────────────────────────────────────────────────────── */
const C = {
  bg:      "#141414",
  card:    "#1c1c1c",
  border:  "rgba(255,255,255,0.08)",
  text:    "#f0f0f0",
  muted:   "rgba(240,240,240,0.45)",
  blue:    "#4285f4",
  green:   "#34a853",
  yellow:  "#f9ab00",
  hYellow: "#ffd427",
};

/* ─── Tool chip ─────────────────────────────────────────────────────────── */
function ToolChip({ tool }: { tool: OwnedTool }) {
  const isPremium = tool.tier === "premium";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "'Space Grotesk', sans-serif",
      background: isPremium ? "rgba(249,171,0,0.1)" : "rgba(66,133,244,0.1)",
      border: `1px solid ${isPremium ? "rgba(249,171,0,0.35)" : "rgba(66,133,244,0.3)"}`,
      color: isPremium ? "#ffd427" : "#57caff",
      whiteSpace: "nowrap" as const,
    }}>
      {isPremium && <span style={{ fontSize: 10 }}>⚡</span>}
      {tool.toolName}
      <span style={{ opacity: 0.55, fontSize: 11 }}>{tool.pricePaid} DC</span>
    </span>
  );
}

/* ─── Team card ─────────────────────────────────────────────────────────── */
function TeamCard({ team }: { team: Team }) {
  const tools = normaliseOwned(team.ownedTools);
  const spent = 120 - team.purse;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            {team.name}
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            Code: {team.code} · {team.members.length} member{team.members.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Balance */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.hYellow, fontWeight: 700 }}>
            {team.purse} DC left
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.muted }}>
            {spent} DC spent
          </span>
        </div>
      </div>

      {/* Members */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
        {team.members.map((m, i) => (
          <span key={i} style={{
            padding: "3px 9px", borderRadius: 999, fontSize: 11,
            fontFamily: "'Space Grotesk', sans-serif",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.border}`,
            color: C.muted,
          }}>
            {m}
          </span>
        ))}
      </div>

      {/* Tools */}
      <div>
        {tools.length === 0 ? (
          <span style={{ fontSize: 12, color: "rgba(240,240,240,0.22)", fontFamily: "'JetBrains Mono', monospace" }}>
            No tools purchased yet
          </span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {tools.map((t) => <ToolChip key={t.toolId} tool={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main dashboard ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Live team data
  useEffect(() => {
    const teamsRef = ref(db, "teams");
    const unsub = onValue(teamsRef, (snap) => {
      if (!snap.exists()) { setTeams([]); setLoading(false); return; }
      const raw = snap.val() as Record<string, Omit<Team, "id">>;
      const list: Team[] = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
      // Sort by team name
      list.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = search.trim()
    ? teams.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.members.some((m) => m.toLowerCase().includes(search.toLowerCase()))
      )
    : teams;

  const totalTools = teams.reduce((acc, t) => acc + normaliseOwned(t.ownedTools).length, 0);
  const totalSpent = teams.reduce((acc, t) => acc + (120 - t.purse), 0);

  return (
    <div style={{
      minHeight: "100dvh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Space Grotesk', sans-serif",
      padding: "0 0 48px",
    }}>
      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(20,20,20,0.95)",
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(12px)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 1 }}>
            Organiser View
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>
            Google AI Arsenal
          </div>
        </div>

        <button
          onClick={() => signOut(auth)}
          style={{
            padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
        >
          Sign out
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── Summary stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Teams registered", value: teams.length },
            { label: "Tools purchased", value: totalTools },
            { label: "DevCoins spent", value: `${totalSpent} DC` },
          ].map((s) => (
            <div key={s.label} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "16px 18px",
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: C.muted, marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.hYellow }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <input
          type="search"
          placeholder="Search by team name or member…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "11px 16px", marginBottom: 20,
            borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.card, color: C.text,
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
            outline: "none", boxSizing: "border-box" as const,
          }}
        />

        {/* ── Team list ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            Loading teams…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            {search ? "No teams match your search." : "No teams registered yet."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((team) => <TeamCard key={team.id} team={team} />)}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="search"]::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  );
}
