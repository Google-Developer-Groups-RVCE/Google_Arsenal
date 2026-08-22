"use client";

import React, { useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { MARKETPLACE_TOOLS, MarketplaceTool, PREMIUM_IDS } from "@/lib/marketplace";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Session {
  teamId: string;
  teamCode: string;
  teamName: string;
}

interface OwnedEntry {
  toolId: string;
  toolName: string;
  tier: "premium" | "standard";
  pricePaid: number;
  acquiredAt: number;
}

interface TeamData {
  name: string;
  purse: number;
  ownedTools: Record<string, OwnedEntry> | null;
}

type ModalState =
  | { open: false }
  | { open: true; tool: MarketplaceTool; status: "idle" | "buying" | "error"; errorMsg?: string };

const SESSION_KEY = "arsenal_session";

/* ─── Palette ────────────────────────────────────────────────────────── */
const C = {
  blue:    "#4285f4",
  green:   "#34a853",
  yellow:  "#f9ab00",
  red:     "#ea4335",
  hBlue:   "#57caff",
  hGreen:  "#5cdb6d",
  hYellow: "#ffd427",
  bg:      "#1e1e1e",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.09)",
  text:    "#f0f0f0",
  muted:   "rgba(240,240,240,0.42)",
};

/* ─── Tool avatar (logo or letter-placeholder) ───────────────────────── */
function ToolAvatar({ tool }: { tool: MarketplaceTool }) {
  const [imgOk, setImgOk] = useState(!!tool.logoUrl);

  if (tool.logoUrl && imgOk) {
    return (
      <img
        src={tool.logoUrl}
        alt={tool.name}
        onError={() => setImgOk(false)}
        style={{
          width: 40,
          height: 40,
          objectFit: "contain",
          borderRadius: 8,
          background: "rgba(255,255,255,0.06)",
          padding: 4,
          flexShrink: 0,
        }}
      />
    );
  }

  // Letter-avatar placeholder
  const letter = tool.name.charAt(0).toUpperCase();
  const colors: Record<number, string> = {
    0: C.blue, 1: C.green, 2: C.yellow, 3: C.red,
    4: C.hBlue, 5: C.hGreen, 6: C.hYellow, 7: "#a855f7",
  };
  const idx = MARKETPLACE_TOOLS.findIndex((t) => t.id === tool.id);
  const accent = colors[idx % 8] ?? C.blue;

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${accent}22`,
        border: `1.5px solid ${accent}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 16,
        fontWeight: 700,
        color: accent,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {letter}
    </div>
  );
}

/* ─── Coin icon ──────────────────────────────────────────────────────── */
function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#f9ab00" opacity="0.18" stroke="#f9ab00" strokeWidth="1.4" />
      <text x="10" y="14.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffd427" fontFamily="sans-serif">D</text>
    </svg>
  );
}

/* ─── No-session screen ──────────────────────────────────────────────── */
function NoSession() {
  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24, fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ fontSize: 40 }}>🛒</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>No active session</h1>
      <p style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "center" }}>
        Register your team first to access the market.
      </p>
      <Link
        href="/register"
        style={{
          marginTop: 8,
          padding: "12px 28px",
          borderRadius: 8,
          background: `linear-gradient(135deg, ${C.blue}, ${C.green})`,
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Register Team →
      </Link>
    </div>
  );
}

/* ─── Buy confirm modal ──────────────────────────────────────────────── */
function ConfirmModal({
  modal,
  purse,
  onCancel,
  onConfirm,
}: {
  modal: ModalState & { open: true };
  purse: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { tool, status, errorMsg } = modal;
  const cost = tool.price;
  const balanceAfter = purse - cost;
  const priceLabel = `${tool.price} DC`;
  const isPremium = tool.tier === "premium";

  // Trap focus inside modal
  const firstBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { firstBtn.current?.focus(); }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Confirm purchase of ${tool.name}`}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        padding: "0 0 env(safe-area-inset-bottom,0) 0",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#252525",
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${C.border}`,
          borderBottom: "none",
          padding: "28px 24px 32px",
          animation: "slideUp 0.22s cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.16)", margin: "0 auto 22px" }} />

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: isPremium ? 8 : 20 }}>
          Confirm Purchase
        </h2>
        {isPremium && (
          <div style={{ marginBottom: 16, padding: "8px 12px", borderRadius: 8, background: "rgba(249,171,0,0.08)", border: "1px solid rgba(249,171,0,0.28)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ffd427", lineHeight: 1.5 }}>
            ⚡ Premium pick — you can only own one Premium tool. This cannot be undone.
          </div>
        )}

        {/* Tool info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px 16px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
          <ToolAvatar tool={tool} />
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: C.text }}>{tool.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted, marginTop: 2 }}>
              Cost: {priceLabel}
            </div>
          </div>
        </div>

        {/* Balance breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
            <span>Current balance</span>
            <span style={{ color: C.text }}>{purse} DC</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
            <span>Cost</span>
            <span style={{ color: C.red }}>
              −{tool.price} DC
            </span>
          </div>
          <div style={{ height: 1, background: C.border }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span style={{ color: C.muted }}>Balance after</span>
            <span style={{ color: C.hYellow }}>{balanceAfter} DC</span>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(234,67,53,0.1)", border: "1px solid rgba(234,67,53,0.3)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            ref={firstBtn}
            onClick={onCancel}
            disabled={status === "buying"}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.muted,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={status === "buying"}
            style={{
              flex: 2,
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: status === "buying"
                ? "rgba(66,133,244,0.4)"
                : `linear-gradient(135deg, ${C.blue}, ${C.green})`,
              color: "#fff",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: status === "buying" ? "not-allowed" : "pointer",
              transition: "all 0.18s",
              boxShadow: status === "buying" ? "none" : `0 4px 16px rgba(66,133,244,0.35)`,
            }}
          >
            {status === "buying" ? "Buying…" : "Confirm Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function MarketPage() {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const acquiredScrollRef = useRef<HTMLDivElement>(null);

  // Load session
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { setSession(null); return; }
    try {
      const s = JSON.parse(raw) as Session;
      if (!s.teamId) { setSession(null); return; }
      setSession(s);
    } catch {
      setSession(null);
    }
  }, []);

  // Subscribe to team data from RTDB
  useEffect(() => {
    if (!session || session === "loading") return;
    const teamRef = ref(db, `teams/${session.teamId}`);
    const unsub = onValue(teamRef, (snap) => {
      if (!snap.exists()) { setTeamData(null); return; }
      const val = snap.val();
      setTeamData({
        name: val.name ?? session.teamName,
        purse: val.purse ?? 0,
        ownedTools: val.ownedTools ?? null,
      });
    });
    return unsub;
  }, [session]);

  /* Derived */
  const ownedMap: Record<string, OwnedEntry> = teamData?.ownedTools ?? {};
  const ownedList = Object.values(ownedMap);
  const purse = teamData?.purse ?? 0;

  /* Buy handlers */
  const openModal = (tool: MarketplaceTool) => {
    setModal({ open: true, tool, status: "idle" });
  };

  const closeModal = () => setModal({ open: false });

  const confirmBuy = async () => {
    if (!modal.open || !session || session === "loading") return;
    const { tool } = modal;
    setModal({ open: true, tool, status: "buying" });

    try {
      const res = await fetch("/api/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: session.teamId, toolId: tool.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setModal({ open: true, tool, status: "error", errorMsg: data.error ?? "Purchase failed." });
        return;
      }

      // Update purse immediately from server's committed value
      setTeamData((prev) =>
        prev ? { ...prev, purse: data.newPurse } : prev
      );
      // onValue listener will sync ownedTools momentarily
      setModal({ open: false });
    } catch {
      setModal({ open: true, tool, status: "error", errorMsg: "Network error — please try again." });
    }
  };

  /* Loading states */
  if (session === "loading") {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid rgba(66,133,244,0.25)`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }
  if (session === null) return <NoSession />;
  if (!teamData) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid rgba(66,133,244,0.25)`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Space Grotesk', sans-serif", paddingBottom: 48 }}>

      {/* ── Top Bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: "rgba(30,30,30,0.92)",
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
        gap: 10,
      }}>
        {/* Left: team name */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 1 }}>
            Team
          </span>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50vw" }}>
            {teamData.name}
          </span>
        </div>

        {/* Right: balance */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 14px", borderRadius: 999,
          background: "rgba(249,171,0,0.1)",
          border: "1px solid rgba(249,171,0,0.3)",
          flexShrink: 0,
        }}>
          <CoinIcon size={18} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#ffd427" }}>
            {purse}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(249,171,0,0.6)" }}>DC</span>
        </div>
      </header>

      {/* ── Acquired Tools Strip ── */}
      {ownedList.length > 0 && (
        <section style={{ padding: "14px 0 10px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, paddingLeft: 18, marginBottom: 10 }}>
            Acquired Tools
          </p>
          <div
            ref={acquiredScrollRef}
            style={{
              display: "flex", gap: 8, overflowX: "auto", paddingLeft: 18, paddingRight: 18,
              scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
            }}
          >
            {ownedList.map((entry) => {
              const t = MARKETPLACE_TOOLS.find((x) => x.id === entry.toolId);
              return (
                <div
                  key={entry.toolId}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: "rgba(52,168,83,0.1)",
                    border: "1px solid rgba(52,168,83,0.3)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  {t && <ToolAvatar tool={t} />}
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: C.hGreen }}>
                    {entry.toolName}
                  </span>
                  <span style={{ fontSize: 14 }}>✓</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Market header ── */}
      <div style={{ padding: "24px 18px 12px" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.hBlue, marginBottom: 4 }}>
          The Arsenal
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.15 }}>
          Google AI Market
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted, marginTop: 4 }}>
          {8 - ownedList.length} tools available · {ownedList.length} acquired
        </p>
      </div>

      {/* ── Tool list ── */}
      {/* ── Section headers ── */}
      <div style={{ padding: "6px 14px 2px" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ffd427", marginBottom: 6, opacity: 0.7 }}>
          ⚡ Premium · 60 DC · pick any one
        </p>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: "0 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {MARKETPLACE_TOOLS.map((tool, listIdx) => {
          const isPremium = tool.tier === "premium";
          const owned = !!ownedMap[tool.id];
          const price = tool.price;
          const canAfford = purse >= price;

          // Does this team already own a DIFFERENT premium tool?
          const teamOwnsPremium = Object.values(ownedMap).some(
            (e) => e.tier === "premium"
          );
          const premiumLocked = isPremium && !owned && teamOwnsPremium;

          const disabled = owned || premiumLocked || !canAfford;

          // Insert Standard section header before first standard tool
          const prevTool = MARKETPLACE_TOOLS[listIdx - 1];
          const showStandardHeader = isPremium === false && (listIdx === 0 || prevTool?.tier === "premium");

          let buttonLabel = "Buy";
          let buttonStyle: React.CSSProperties = {
            padding: "9px 20px",
            borderRadius: 8,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.18s",
            border: "none",
            flexShrink: 0,
            minWidth: 72,
          };

          if (owned) {
            buttonLabel = "Owned";
            buttonStyle = {
              ...buttonStyle,
              background: "rgba(52,168,83,0.12)",
              color: C.hGreen,
              border: "1px solid rgba(52,168,83,0.35)",
              cursor: "default",
            };
          } else if (premiumLocked) {
            buttonLabel = "Locked";
            buttonStyle = {
              ...buttonStyle,
              background: "rgba(249,171,0,0.06)",
              color: "rgba(249,171,0,0.45)",
              border: "1px solid rgba(249,171,0,0.2)",
              cursor: "not-allowed",
              fontSize: 12,
            };
          } else if (!canAfford) {
            buttonLabel = "Buy";
            buttonStyle = {
              ...buttonStyle,
              background: "rgba(240,240,240,0.04)",
              color: "rgba(240,240,240,0.22)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "not-allowed",
            };
          } else {
            buttonStyle = {
              ...buttonStyle,
              background: isPremium
                ? `linear-gradient(135deg, ${C.yellow}cc, ${C.red}88)`
                : `linear-gradient(135deg, ${C.blue}cc, ${C.green}cc)`,
              color: "#fff",
              boxShadow: isPremium
                ? `0 2px 12px rgba(249,171,0,0.3)`
                : `0 2px 12px rgba(66,133,244,0.3)`,
            };
          }

          return (
            <React.Fragment key={tool.id}>
              {/* Standard section divider before first standard tool */}
              {showStandardHeader && (
                <div style={{ padding: "14px 0 2px" }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.hBlue, marginBottom: 6, opacity: 0.7 }}>
                    ◆ Standard · 30 DC · buy as many as you can afford
                  </p>
                </div>
              )}
              <li
                key={tool.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 14px",
                  borderRadius: 14,
                  background: owned
                    ? "rgba(52,168,83,0.05)"
                    : premiumLocked
                      ? "rgba(249,171,0,0.02)"
                      : C.surface,
                  border: `1px solid ${
                    owned ? "rgba(52,168,83,0.25)"
                    : premiumLocked ? "rgba(249,171,0,0.12)"
                    : C.border
                  }`,
                  transition: "all 0.18s",
                  opacity: premiumLocked ? 0.55 : 1,
                }}
              >
                {/* Logo */}
                <ToolAvatar tool={tool} />

                {/* Name + price + tier badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.text, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100% - 80px)" }}>
                      {tool.name}
                    </span>
                    {isPremium && (
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                        padding: "2px 7px", borderRadius: 999,
                        background: "rgba(249,171,0,0.1)",
                        border: "1px solid rgba(249,171,0,0.3)",
                        color: "#ffd427",
                        flexShrink: 0,
                      }}>
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    {premiumLocked ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(249,171,0,0.45)" }}>
                        🔒 1 premium tool already selected
                      </span>
                    ) : (
                      <>
                        <CoinIcon size={12} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: canAfford ? C.muted : C.red }}>
                          {price} DC
                          {!canAfford && !owned && (
                            <span style={{ color: "rgba(234,67,53,0.7)", marginLeft: 4 }}>· need {price - purse} more</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => !disabled && openModal(tool)}
                  disabled={disabled}
                  style={buttonStyle}
                  title={
                    premiumLocked ? "Your team already owns a Premium tool" :
                    !canAfford && !owned ? `Need ${price - purse} more DC` :
                    undefined
                  }
                >
                  {buttonLabel}
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ul>

      {/* ── Confirm modal ── */}
      {modal.open && (
        <ConfirmModal
          modal={modal}
          purse={purse}
          onCancel={closeModal}
          onConfirm={confirmBuy}
        />
      )}

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        button { font: inherit; }
        ul { padding: 0; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* Hide scrollbar on acquired strip */
        div::-webkit-scrollbar { display: none; }

        /* Hover state for tool rows */
        li:not([style*="rgba(52,168,83"]):hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.14) !important;
        }

        /* Buy button hover */
        button:not(:disabled):hover {
          filter: brightness(1.1);
          transform: scale(1.03);
        }
        button:not(:disabled):active {
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
}
