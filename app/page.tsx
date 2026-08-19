"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const BounceCanvas = dynamic(() => import("./components/BounceCanvas"), { ssr: false });

/* ─────────────────────────────────────────────────────────
   PALETTE (per brand spec)
───────────────────────────────────────────────────────── */
const C = {
  blue:    "#4285f4",
  green:   "#34a853",
  yellow:  "#f9ab00",
  red:     "#ea4335",
  hBlue:   "#57caff",
  hGreen:  "#5cdb6d",
  hYellow: "#ffd427",
  hRed:    "#ff7daf",
  offWhite:"#f0f0f0",
  black:   "#1e1e1e",
};

/* ─────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────── */
const TOOLS = {
  S: [
    { name: "Google Antigravity",       desc: "Agentic, plans/codes/debugs semi-autonomously",      emoji: "🤖" },
    { name: "Firebase Studio",          desc: "Full app scaffold: DB + Auth + Hosting + AI assist", emoji: "🔥" },
    { name: "Gemini 2.5 Pro",           desc: "Best reasoning, huge context, multimodal",           emoji: "✨" },
    { name: "Vertex AI Agent Builder",  desc: "Production-grade multi-agent orchestration",         emoji: "🧠" },
  ],
  A: [
    { name: "Firebase (Firestore/RTDB + Auth)", desc: "Solid backend, no bundled AI",          emoji: "🗄️" },
    { name: "Google AI Studio",                desc: "Lighter prototyping vs Gemini 2.5 Pro", emoji: "🎨" },
    { name: "Google Colab",                    desc: "Free GPU/TPU compute for ML",           emoji: "⚡" },
    { name: "Android Studio + Jetpack Compose",desc: "Mobile-only, but strong",               emoji: "📱" },
    { name: "Apps Script + Workspace APIs",    desc: "Automation glue",                       emoji: "⚙️" },
    { name: "Nano Banana (Imagen)",            desc: "Image generation",                      emoji: "🍌" },
  ],
  B: [
    { name: "Maps Platform API",             desc: "Location & mapping services",  emoji: "🗺️" },
    { name: "Cloud Vision / Speech-to-Text", desc: "Vision & speech AI APIs",     emoji: "👁️" },
    { name: "Looker Studio / Sheets API",    desc: "Data visualization & sheets", emoji: "📊" },
    { name: "Translate API",                 desc: "Multi-language translation",  emoji: "🌐" },
    { name: "Forms API + Fonts/Material",    desc: "Forms & design assets",       emoji: "📝" },
    { name: "NotebookLM",                    desc: "AI-powered notebook",         emoji: "📓" },
    { name: "Google Stitch",                 desc: "UI/design generation",        emoji: "🪡" },
    { name: "Google Flow",                   desc: "Video generation",            emoji: "🎬" },
  ],
};

const RULES = [
  { num: 1,  title: "Starting Budget",    body: "Every team gets 120 DevCoins to spend across all tiers." },
  { num: 2,  title: "Tier Caps",          body: "Max 1 S-tier tool per team · Max 2 A-tier tools per team · Unlimited B-tier." },
  { num: 3,  title: "Auction Order",      body: "S-tier → A-tier → B-tier. Problem statement revealed only after all bidding closes — bid blind." },
  { num: 4,  title: "Live Bidding",       body: "Each tool has a 15-second countdown. Any new bid resets the timer by 5s." },
  { num: 5,  title: "Leaderboard Pricing",body: "Top 4 teams win an S-tier tool (all pay the 4th-highest bid). Top 6 teams win an A-tier tool (all pay the 6th-highest bid)." },
  { num: 6,  title: "B-Tier Buy",         body: "Fixed price, no bidding — click BUY at any time to grab a B-tier tool at base price (12 DC). Unlimited copies." },
  { num: 7,  title: "Mandatory Use",      body: "Every tool your team wins must be used in your final pitch." },
  { num: 8,  title: "No Overspending",    body: "Your bid cannot exceed your remaining DevCoins. Purse is only deducted when the lot closes." },
  { num: 9,  title: "Scoring",            body: "Innovation · Tool Utilization · Integration · Feasibility & Pitch — 10 pts each." },
  { num: 10, title: "Underdog Bonus",     body: "Teams with only A/B-tier tools (no S-tier) get a +10–15% score bonus." },
];

const TIER_META = {
  S: { label: "S-TIER", coins: 60, copies: 4,   cap: "Top 4 win · Max 1/team",
    gradFrom: "#f59e0b", gradTo: "#fbbf24", border: "rgba(251,191,36,0.35)", glow: "rgba(251,191,36,0.15)",
    badgeBg: "rgba(251,191,36,0.1)", badgeText: "#fde68a", badgeBorder: "rgba(251,191,36,0.3)", dot: "#fbbf24" },
  A: { label: "A-TIER", coins: 30, copies: 6,   cap: "Top 6 win · Max 2/team",
    gradFrom: "#7c3bed", gradTo: "#a855f7", border: "rgba(124,59,237,0.45)", glow: "rgba(124,59,237,0.2)",
    badgeBg: "rgba(124,59,237,0.1)", badgeText: "#c4b5fd", badgeBorder: "rgba(124,59,237,0.4)", dot: "#a855f7" },
  B: { label: "B-TIER", coins: 12, copies: "∞", cap: "Buy anytime · No cap",
    gradFrom: "#00e5ff", gradTo: "#22d3ee", border: "rgba(0,229,255,0.25)", glow: "rgba(0,229,255,0.12)",
    badgeBg: "rgba(0,229,255,0.08)", badgeText: "#67e8f9", badgeBorder: "rgba(0,229,255,0.25)", dot: "#00e5ff" },
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"S" | "A" | "B">("S");

  return (
    <div className="page-root">

      {/* ══════════════════════════════════════════
          HERO — full-viewport, bouncing shapes bg
      ══════════════════════════════════════════ */}
      <section className="hero-section">
        {/* Physics bouncing layer */}
        <BounceCanvas />

        {/* 4-color ambient brand blobs */}
        <div aria-hidden="true" className="hero-blobs">
          <div className="blob blob-blue" />
          <div className="blob blob-green" />
          <div className="blob blob-yellow" />
          <div className="blob blob-red" />
        </div>

        {/* Radial vignette */}
        <div aria-hidden="true" className="hero-vignette" />

        {/* Hero content */}
        <div className="hero-content">
          {/* GDG RVCE logo */}
          <img src="/gdg-1.svg" alt="GDG RVCE" className="hero-logo" />

          {/* Headline */}
          <h1 className="hero-headline">
            THE GOOGLE{" "}
            <span className="headline-gradient">AI ARSENAL</span>
          </h1>

          {/* Tagline */}
          <p className="hero-tagline">Bid Smart. Build Better.</p>

          {/* Primary CTA */}
          <div className="hero-cta-wrap">
            <Link href="/register" className="cta-primary">
              $ join_team --auction
              <span aria-hidden="true" className="cta-underline" />
            </Link>
          </div>

          {/* Secondary pills */}
          <div className="hero-pills">
            <Link href="/bid"       className="hero-pill pill-blue">Enter Bid Room</Link>
            <Link href="/dashboard" className="hero-pill pill-green">Dashboard</Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="scroll-cue">
          <span className="scroll-label">scroll</span>
          <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
            <rect x="1" y="1" width="12" height="18" rx="6" stroke="#f0f0f0" strokeWidth="1.4"/>
            <circle cx="7" cy="6" r="2" fill="#f0f0f0">
              <animate attributeName="cy" values="6;12;6" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STICKY NAV
      ══════════════════════════════════════════ */}
      <nav className="site-nav">
        {/* Left: logos */}
        <div className="nav-logo">
          <img src="/gdg-2.svg" alt="GDG" className="nav-gdg-icon" />
          <div className="nav-divider" />
          <img src="/gdg-1.svg" alt="GDG RVCE" className="nav-rvce-logo" />
        </div>
        {/* Right: links */}
        <div className="nav-links">
          <Link href="/register" className="nav-link">Register</Link>
          <Link href="/bid"      className="nav-link nav-bid">Bid Room</Link>
          <Link href="/dashboard" className="nav-link nav-dashboard">Dashboard →</Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          TOOLS SECTION
      ══════════════════════════════════════════ */}
      <section className="section-pad">
        <div className="section-inner wide">
          <div className="section-header">
            <p className="section-eyebrow" style={{ color: C.hBlue }}>The Arsenal</p>
            <h2 className="section-title">Tools Up for Auction</h2>
          </div>

          {/* Tier tabs */}
          <div className="tier-tabs">
            {(["S", "A", "B"] as const).map(tier => {
              const m = TIER_META[tier];
              const active = activeTab === tier;
              return (
                <button key={tier} onClick={() => setActiveTab(tier)}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    padding: "10px 24px",
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: `1px solid ${active ? "transparent" : m.border}`,
                    background: active ? `linear-gradient(135deg,${m.gradFrom},${m.gradTo})` : "transparent",
                    color: active ? "#000" : "rgba(240,240,240,0.5)",
                    boxShadow: active ? `0 4px 20px ${m.glow}` : "none",
                  }}>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Tier meta banner */}
          {(["S", "A", "B"] as const).map(tier => {
            if (activeTab !== tier) return null;
            const m = TIER_META[tier];
            return (
              <div key={tier} className="tier-banner" style={{ border: `1px solid ${m.border}` }}>
                {[{ label: "Price", val: `${m.coins} DevCoins` }, { label: "Copies", val: String(m.copies) }, { label: "Team limit", val: m.cap }].map(item => (
                  <div key={item.label} className="tier-meta-item">
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                    <span className="tier-meta-label">{item.label}:</span>
                    <span className="tier-meta-val">{item.val}</span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Tool cards */}
          <div className="tools-grid">
            {TOOLS[activeTab].map(tool => {
              const m = TIER_META[activeTab];
              return (
                <div key={tool.name} className="tool-card"
                  style={{ border: `1px solid ${m.border}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.045)"; e.currentTarget.style.boxShadow = `0 8px 32px ${m.glow}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.018)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div className="tool-card-top">
                    <span style={{ fontSize: 22 }}>{tool.emoji}</span>
                    <span className="tier-badge" style={{ background: m.badgeBg, color: m.badgeText, border: `1px solid ${m.badgeBorder}` }}>{m.label}</span>
                  </div>
                  <h3 className="tool-name">{tool.name}</h3>
                  <p className="tool-desc">{tool.desc}</p>
                  <div className="tool-footer">
                    <span className="tool-price-label">base price</span>
                    <span className="tool-price" style={{ background: `linear-gradient(135deg,${m.gradFrom},${m.gradTo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{TIER_META[activeTab].coins} DC</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          RULES SECTION
      ══════════════════════════════════════════ */}
      <section className="section-pad">
        <div className="section-inner mid">
          <div className="section-header">
            <p className="section-eyebrow" style={{ color: C.hYellow }}>How It Works</p>
            <h2 className="section-title">Rules of the Game</h2>
          </div>
          <div className="rules-grid">
            {RULES.map(rule => (
              <div key={rule.num} className="rule-card"
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = `${C.hYellow}33`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                <div className="rule-num" style={{ background: `${C.yellow}18`, border: `1px solid ${C.yellow}44`, color: C.hYellow }}>{rule.num}</div>
                <div>
                  <h3 className="rule-title">{rule.title}</h3>
                  <p className="rule-body">{rule.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SCORING SECTION
      ══════════════════════════════════════════ */}
      <section className="section-pad">
        <div className="section-inner narrow">
          <div className="scoring-card" style={{ border: `1px solid ${C.blue}44`, background: `linear-gradient(135deg, ${C.blue}10, ${C.green}08)` }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${C.blue}0a 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p className="section-eyebrow" style={{ color: C.hBlue }}>Scoring Breakdown</p>
              <h2 className="scoring-title">40 Points Total · Pitch Only</h2>
              <div className="scoring-grid">
                {[
                  { label: "Innovation",         col: C.blue   },
                  { label: "Tool Utilization",   col: C.green  },
                  { label: "Integration",        col: C.yellow },
                  { label: "Feasibility & Pitch",col: C.red    },
                ].map(s => (
                  <div key={s.label} className="score-cell">
                    <div className="score-num" style={{ color: s.col }}>10</div>
                    <div className="score-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="underdog-badge" style={{ border: `1px solid ${C.hRed}44`, background: `${C.red}0d` }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <span className="underdog-text" style={{ color: C.hRed }}>Underdog Bonus: +10–15% for A/B-tier-only teams</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════════ */}
      <section className="section-pad bottom-cta-section">
        <div className="section-inner narrow" style={{ textAlign: "center" }}>
          <h2 className="cta-heading">
            Ready to build something{" "}
            <span style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.green}, ${C.yellow}, ${C.red})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              extraordinary?
            </span>
          </h2>
          <p className="cta-sub">
            Register your team, enter the bid room when the auction goes live, and show the world what you can build.
          </p>
          <div className="cta-buttons">
            <Link href="/register" className="cta-btn-primary"
              style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.green})`, boxShadow: `0 8px 28px ${C.blue}40` }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
              $ join_team --now
            </Link>
            <Link href="/dashboard/login" className="cta-btn-ghost"
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = C.offWhite; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(240,240,240,0.5)"; }}>
              operator login →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="site-footer">
        <div className="footer-logo">
          <img src="/gdg-2.svg" alt="GDG" style={{ height: 28, width: "auto", opacity: 0.5 }} />
          <div style={{ width: 1, height: 18, background: "rgba(240,240,240,0.15)" }} />
          <img src="/gdg-1.svg" alt="GDG RVCE" style={{ height: 18, width: "auto", maxWidth: 110, opacity: 0.4 }} />
        </div>
        <div className="footer-links">
          {[{ href: "/register", label: "Register" }, { href: "/bid", label: "Bid Room" }, { href: "/dashboard", label: "Dashboard" }, { href: "/dashboard/login", label: "Operator" }].map(l => (
            <Link key={l.href} href={l.href} className="footer-link"
              onMouseEnter={e => { e.currentTarget.style.color = C.hBlue; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(240,240,240,0.22)"; }}>
              {l.label}
            </Link>
          ))}
        </div>
      </footer>

      {/* ══════════════════════════════════════════
          RESPONSIVE STYLES
      ══════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        button { font: inherit; }
        img { max-width: 100%; }

        /* ── Root ── */
        .page-root {
          min-height: 100vh;
          background: #1e1e1e;
          color: #f0f0f0;
          overflow-x: hidden;
          font-family: 'Space Grotesk', sans-serif;
        }

        /* ── HERO ── */
        .hero-section {
          position: relative;
          width: 100%;
          height: 100svh;
          min-height: 540px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #1e1e1e;
        }

        .hero-blobs { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); }
        .blob-blue   { top: -8%;   left: -8%;  width: 380px; height: 380px; background: rgba(66,133,244,0.18); }
        .blob-green  { top: 10%;   right:-5%;  width: 320px; height: 320px; background: rgba(52,168,83,0.15); }
        .blob-yellow { bottom:-8%; right: 8%;  width: 300px; height: 300px; background: rgba(249,171,0,0.13); }
        .blob-red    { bottom: 5%; left:  5%;  width: 280px; height: 280px; background: rgba(234,67,53,0.14); }

        .hero-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 65% 65% at 50% 50%, rgba(30,30,30,0.85) 0%, rgba(30,30,30,0) 100%);
          z-index: 5; pointer-events: none;
        }

        .hero-content {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 18px;
          padding: 0 20px; width: 100%; max-width: 780px;
        }

        .hero-logo { height: 36px; width: auto; object-fit: contain; max-width: 240px; }

        .hero-headline {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: clamp(2rem, 8vw, 5rem);
          line-height: 1.0;
          letter-spacing: -0.03em;
          color: #f0f0f0;
        }
        .headline-gradient {
          background: linear-gradient(90deg, #4285f4 0%, #34a853 33%, #f9ab00 66%, #ea4335 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-tagline {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(0.8rem, 2.5vw, 1.05rem);
          color: #ffd427;
          letter-spacing: 0.04em;
        }

        .hero-cta-wrap { margin-top: 4px; width: 100%; max-width: 340px; }
        .cta-primary {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(0.82rem, 2.2vw, 0.95rem);
          color: #f0f0f0;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 6px;
          background: rgba(240,240,240,0.04);
          border: 1px solid rgba(240,240,240,0.12);
          position: relative; overflow: hidden;
          transition: background 0.2s, transform 0.15s;
          text-align: center;
        }
        .cta-primary:hover { background: rgba(240,240,240,0.09); transform: scale(1.03); }
        .cta-underline {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #4285f4 0%, #34a853 33%, #f9ab00 66%, #ea4335 100%);
          border-radius: 0 0 6px 6px;
        }

        .hero-pills { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .hero-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 999px;
          transition: all 0.2s;
          letter-spacing: 0.04em;
        }
        .pill-blue  { color: #57caff; border: 1px solid rgba(87,202,255,0.35); background: rgba(87,202,255,0.08); }
        .pill-blue:hover  { background: rgba(87,202,255,0.16); }
        .pill-green { color: #5cdb6d; border: 1px solid rgba(92,219,109,0.35); background: rgba(92,219,109,0.08); }
        .pill-green:hover { background: rgba(92,219,109,0.16); }

        .scroll-cue {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          z-index: 10; display: flex; flex-direction: column; align-items: center;
          gap: 6px; opacity: 0.4;
        }
        .scroll-label {
          font-family: 'JetBrains Mono', monospace; font-size: 9px;
          letter-spacing: 0.18em; text-transform: uppercase; color: #f0f0f0;
        }

        /* ── NAV ── */
        .site-nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          background: rgba(30,30,30,0.9);
          gap: 12px;
          width: 100%;
          max-width: 100vw;
          overflow: hidden;
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .nav-gdg-icon  { height: 32px; width: auto; }
        .nav-rvce-logo { height: 22px; width: auto; max-width: 140px; }
        .nav-divider   { width: 1px; height: 20px; background: rgba(240,240,240,0.15); flex-shrink: 0; }
        .nav-links { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .nav-link {
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
          color: rgba(240,240,240,0.5); padding: 7px 12px;
          text-decoration: none; border-radius: 6px;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #57caff; }
        .nav-bid {
          border: 1px solid rgba(87,202,255,0.4);
          color: #57caff !important;
        }
        .nav-bid:hover { background: rgba(87,202,255,0.1); }
        .nav-dashboard {
          font-family: 'Space Grotesk', sans-serif !important;
          font-weight: 700; font-size: 13px !important;
          padding: 7px 16px !important;
          background: #4285f4; color: #fff !important;
          border-radius: 6px;
          box-shadow: 0 0 16px rgba(66,133,244,0.4);
        }
        .nav-dashboard:hover { opacity: 0.9; transform: scale(1.03); }

        /* ── SECTIONS ── */
        .section-pad { padding: 64px 20px; }
        .section-inner { margin: 0 auto; width: 100%; }
        .section-inner.wide   { max-width: 1140px; }
        .section-inner.mid    { max-width: 920px; }
        .section-inner.narrow { max-width: 780px; }

        .section-header { text-align: center; margin-bottom: 40px; }
        .section-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.22em;
          text-transform: uppercase; margin-bottom: 10px;
        }
        .section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700; font-size: clamp(1.6rem, 3vw, 2.4rem); color: #f0f0f0;
        }

        /* ── TIER TABS ── */
        .tier-tabs { display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }

        .tier-banner {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 20px; padding: 12px 20px; border-radius: 12px;
          background: rgba(255,255,255,0.02); margin-bottom: 20px;
        }
        .tier-meta-item { display: flex; align-items: center; gap: 8px; }
        .tier-meta-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(240,240,240,0.4); }
        .tier-meta-val   { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; }

        /* ── TOOL CARDS ── */
        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .tool-card {
          padding: 18px; border-radius: 16px;
          background: rgba(255,255,255,0.018);
          transition: all 0.22s; cursor: default;
        }
        .tool-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .tier-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          padding: 3px 8px; border-radius: 999px;
        }
        .tool-name {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 13px; margin-bottom: 5px;
          line-height: 1.35; color: #f0f0f0;
        }
        .tool-desc {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: rgba(240,240,240,0.38);
          line-height: 1.55; margin-bottom: 14px;
        }
        .tool-footer {
          padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; justify-content: space-between; align-items: center;
        }
        .tool-price-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(240,240,240,0.28); }
        .tool-price { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; }

        /* ── RULES ── */
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 10px;
        }
        .rule-card {
          display: flex; gap: 14px; padding: 16px 18px;
          border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02); transition: all 0.2s;
        }
        .rule-num {
          flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .rule-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 13px; color: #f0f0f0; margin-bottom: 3px;
        }
        .rule-body {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: rgba(240,240,240,0.42); line-height: 1.6;
        }

        /* ── SCORING ── */
        .scoring-card {
          padding: 40px 32px; border-radius: 22px;
          text-align: center; position: relative; overflow: hidden;
        }
        .scoring-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.9rem);
          color: #f0f0f0; margin-bottom: 24px; margin-top: 8px;
        }
        .scoring-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 10px; margin-bottom: 24px;
        }
        .score-cell {
          padding: 14px 6px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .score-num {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px; font-weight: 700; line-height: 1; margin-bottom: 5px;
        }
        .score-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: rgba(240,240,240,0.4); line-height: 1.45;
        }
        .underdog-badge {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 10px 20px; border-radius: 999px;
        }
        .underdog-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

        /* ── BOTTOM CTA ── */
        .bottom-cta-section { padding-bottom: 80px; }
        .cta-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700; font-size: clamp(1.6rem, 3vw, 2.3rem);
          color: #f0f0f0; margin-bottom: 14px; line-height: 1.2;
        }
        .cta-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px; color: rgba(240,240,240,0.38);
          margin-bottom: 32px; line-height: 1.7;
        }
        .cta-buttons { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
        .cta-btn-primary {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px; padding: 14px 28px; border-radius: 6px;
          color: #fff; font-weight: 700; text-decoration: none;
          transition: all 0.2s; display: inline-block;
        }
        .cta-btn-ghost {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px; padding: 14px 24px; border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(240,240,240,0.5); text-decoration: none;
          transition: all 0.2s; display: inline-block;
        }

        /* ── FOOTER ── */
        .site-footer {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 22px 24px;
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: space-between; gap: 16px;
        }
        .footer-logo { display: flex; align-items: center; gap: 10px; }
        .footer-links { display: flex; flex-wrap: wrap; gap: 16px; }
        .footer-link {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: rgba(240,240,240,0.22);
          text-decoration: none; transition: color 0.2s;
        }

        /* ════════════════════════════
           MOBILE BREAKPOINT ≤ 640px
        ════════════════════════════ */
        @media (max-width: 640px) {
          /* Hero */
          .hero-logo  { height: 26px; max-width: 180px; }
          .hero-content { padding: 0 16px; gap: 14px; }
          .hero-cta-wrap { max-width: 100%; }
          .cta-primary { font-size: 13px; padding: 12px 18px; }
          .hero-pills { gap: 8px; }
          .hero-pill  { font-size: 11px; padding: 7px 12px; }
          .scroll-cue { display: none; }
          .blob-blue  { width: 220px; height: 220px; }
          .blob-green { width: 180px; height: 180px; }
          .blob-yellow{ width: 170px; height: 170px; }
          .blob-red   { width: 160px; height: 160px; }

          /* Nav: compact, RVCE logo hidden */
          .site-nav   { padding: 10px 14px; gap: 8px; }
          .nav-logo   { gap: 8px; }
          .nav-gdg-icon  { height: 26px; }
          .nav-rvce-logo { display: none; }
          .nav-divider   { display: none; }
          /* Nav links: shrink to icon-only on tiny screens */
          .nav-links  { gap: 4px; flex-shrink: 0; }
          .nav-link   { font-size: 11px; padding: 6px 8px; }
          .nav-dashboard { font-size: 11px !important; padding: 6px 10px !important; }

          /* Sections */
          .section-pad   { padding: 44px 14px; }
          .section-title { font-size: 1.45rem; }
          .section-header { margin-bottom: 28px; }

          /* Tier tabs */
          .tier-tabs  { gap: 6px; }
          .tier-banner{ gap: 10px; padding: 10px 12px; }

          /* Tool cards: 2-col on mobile */
          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .tool-card  { padding: 12px; border-radius: 12px; }
          .tool-name  { font-size: 11px; }
          .tool-desc  { font-size: 10px; margin-bottom: 10px; }
          .tool-footer{ padding-top: 8px; }

          /* Rules: 1-col */
          .rules-grid { grid-template-columns: 1fr; }
          .rule-card  { padding: 14px 14px; }

          /* Scoring: 2×2 */
          .scoring-card  { padding: 24px 14px; }
          .scoring-title { font-size: 1.2rem; }
          .scoring-grid  { grid-template-columns: repeat(2, 1fr); }
          .underdog-badge{ flex-direction: column; gap: 6px; text-align: center; padding: 10px 14px; }
          .underdog-text { font-size: 10px; }

          /* Bottom CTA */
          .cta-heading { font-size: 1.5rem; }
          .cta-sub     { font-size: 12px; }
          .cta-btn-primary, .cta-btn-ghost { font-size: 13px; padding: 12px 20px; }
          .cta-buttons { flex-direction: column; align-items: center; }

          /* Footer: stack */
          .site-footer   { flex-direction: column; align-items: flex-start; padding: 18px 14px; }
          .footer-links  { gap: 14px; flex-wrap: wrap; }
        }

        /* ════════════════════════════
           TABLET ≤ 768px
        ════════════════════════════ */
        @media (max-width: 768px) and (min-width: 641px) {
          .nav-rvce-logo  { max-width: 110px; }
          .tools-grid     { grid-template-columns: repeat(2, 1fr); }
          .rules-grid     { grid-template-columns: 1fr; }
          .scoring-grid   { grid-template-columns: repeat(2, 1fr); }
          .section-pad    { padding: 56px 24px; }
        }
      `}</style>
    </div>
  );
}
