"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MARKETPLACE_TOOLS } from "@/lib/marketplace";
import TextType from "./components/TextType";

const BounceCanvas = dynamic(() => import("./components/BounceCanvas"), { ssr: false });

/* ─────────────────────────────────────────────────────────
   PALETTE
───────────────────────────────────────────────────────── */
const C = {
  blue:    "#4285f4",
  green:   "#34a853",
  yellow:  "#f9ab00",
  red:     "#ea4335",
  hBlue:   "#57caff",
  hGreen:  "#5cdb6d",
  hYellow: "#ffd427",
  offWhite:"#f0f0f0",
};

/* ─────────────────────────────────────────────────────────
   RULES — marketplace edition
───────────────────────────────────────────────────────── */
const RULES = [
  {
    num: 1,
    title: "Starting Budget",
    body: "Every team receives 120 DevCoins to spend in the market. You cannot earn more — spend wisely.",
  },
  {
    num: 2,
    title: "Shop Freely",
    body: "Browse and buy any tool instantly — no tiers, no caps, no waiting. First come, first served.",
  },
  {
    num: 3,
    title: "Shared Catalogue",
    body: "Multiple teams can own the same tool. Buying a tool never blocks another team from buying it too.",
  },
  {
    num: 4,
    title: "No Overspending",
    body: "You can only buy tools your balance can cover. DevCoins are deducted the moment you confirm a purchase.",
  },
  {
    num: 5,
    title: "Mandatory Use",
    body: "Every tool your team purchases must be meaningfully used and demonstrated in your final pitch.",
  },
  {
    num: 6,
    title: "Scoring",
    body: "Innovation · Tool Utilization · Integration · Feasibility & Pitch — 10 points each, 40 total.",
  },
];

/* ─────────────────────────────────────────────────────────
   Tool accent colours (cycles through brand palette)
   Premium tools → amber family; Standard → cool palette
───────────────────────────────────────────────────────── */
const PREMIUM_ACCENT = { bg: "rgba(249,171,0,0.1)", border: "rgba(249,171,0,0.35)", text: "#ffd427" };
const STANDARD_ACCENTS = [
  { bg: "rgba(66,133,244,0.12)",  border: "rgba(66,133,244,0.3)",  text: "#57caff"  },
  { bg: "rgba(52,168,83,0.12)",   border: "rgba(52,168,83,0.3)",   text: "#5cdb6d"  },
  { bg: "rgba(0,229,255,0.1)",    border: "rgba(0,229,255,0.25)",  text: "#67e8f9"  },
  { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.3)",  text: "#c4b5fd"  },
];

/* ─────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────── */
export default function LandingPage() {
  // Detect existing session so the CTA can skip registration
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("arsenal_session");
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.teamId) setHasSession(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const ctaHref  = hasSession ? "/market"   : "/register";
  const ctaLabel = hasSession ? "$ enter_market →" : "$ join_team --market";

  return (
    <div className="page-root">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="hero-section">
        <BounceCanvas />

        {/* Brand blobs */}
        <div aria-hidden="true" className="hero-blobs">
          <div className="blob blob-blue" />
          <div className="blob blob-green" />
          <div className="blob blob-yellow" />
          <div className="blob blob-red" />
        </div>

        <div aria-hidden="true" className="hero-vignette" />

        {/* Hero content */}
        <div className="hero-content">
          <img src="/gdg-1.svg" alt="GDG RVCE" className="hero-logo" />

          <h1 className="hero-headline">
            THE GOOGLE{" "}
            <TextType
              text="AI ARSENAL"
              as="span"
              cursorCharacter="|"
              className="headline-gradient"
              typingSpeed={100}
              deletingSpeed={50}
            />
          </h1>

          <p className="hero-tagline">Pick Smart. Build Better.</p>

          {/* Single smart CTA — routes to /register or /market */}
          <div className="hero-cta-wrap">
            <Link href={ctaHref} className="cta-primary">
              {ctaLabel}
              <span aria-hidden="true" className="cta-underline" />
            </Link>
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
        <div className="nav-logo">
          <img src="/gdg-2.svg" alt="GDG" className="nav-gdg-icon" />
          <div className="nav-divider" />
          <img src="/gdg-1.svg" alt="GDG RVCE" className="nav-rvce-logo" />
        </div>
        <div className="nav-links">
          <Link href={ctaHref} className="nav-link nav-market">Market →</Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          TOOLS SECTION — flat list, no tiers
      ══════════════════════════════════════════ */}
      <section className="section-pad">
        <div className="section-inner wide">
          <div className="section-header">
            <p className="section-eyebrow" style={{ color: C.hBlue }}>The Arsenal</p>
            <h2 className="section-title">Tools in the Market</h2>
            <p className="section-sub">8 Google AI tools available to every team. Browse, pick, and build.</p>
          </div>

          <div className="tools-grid">
            {MARKETPLACE_TOOLS.map((tool, i) => {
              const isPremium = tool.tier === "premium";
              const stdIdx = MARKETPLACE_TOOLS.filter(t => t.tier === "standard").findIndex(t => t.id === tool.id);
              const accent = isPremium ? PREMIUM_ACCENT : STANDARD_ACCENTS[stdIdx % STANDARD_ACCENTS.length];
              const letter = tool.name.charAt(0).toUpperCase();
              return (
                <div
                  key={tool.id}
                  className="tool-card"
                  style={{ border: `1px solid ${accent.border}` }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = accent.bg;
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = `0 8px 28px ${accent.border}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.018)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Avatar */}
                  <div className="tool-avatar" style={{ background: accent.bg, border: `1.5px solid ${accent.border}`, color: accent.text }}>
                    {tool.logoUrl ? (
                      <img src={tool.logoUrl} alt={tool.name} style={{ width: 28, height: 28, objectFit: "contain" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextSibling as HTMLElement).style.display = "block"; }} />
                    ) : null}
                    <span className="tool-avatar-letter" style={{ display: tool.logoUrl ? "none" : "block", color: accent.text }}>{letter}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <h3 className="tool-name">{tool.name}</h3>
                    {isPremium && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 999, background: "rgba(249,171,0,0.1)", border: "1px solid rgba(249,171,0,0.3)", color: "#ffd427", flexShrink: 0 }}>PREMIUM</span>
                    )}
                  </div>

                  {/* Price pill */}
                  <div className="tool-price-pill" style={{ background: accent.bg, border: `1px solid ${accent.border}`, color: accent.text }}>
                    {tool.price} DC
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
            <h2 className="section-title">Rules of the Market</h2>
          </div>
          <div className="rules-grid">
            {RULES.map(rule => (
              <div
                key={rule.num}
                className="rule-card"
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = `${C.hYellow}33`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              >
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
            Register your team, pick your tools from the market, and show the world what you can build.
          </p>
          <div className="cta-buttons">
            <Link
              href={ctaHref}
              className="cta-btn-primary"
              style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.green})`, boxShadow: `0 8px 28px ${C.blue}40` }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {ctaLabel}
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
          {[
            { href: "/register", label: "Register" },
            { href: "/market",   label: "Market"   },
            { href: "/dashboard",label: "Dashboard" },
          ].map(l => (
            <Link key={l.href} href={l.href} className="footer-link"
              onMouseEnter={e => { e.currentTarget.style.color = C.hBlue; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(240,240,240,0.22)"; }}>
              {l.label}
            </Link>
          ))}
        </div>
      </footer>

      {/* ══════════════════════════════════════════
          STYLES
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

        .hero-logo { height: 90px; width: auto; object-fit: contain; max-width: 240px; }

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
        .nav-market {
          font-family: 'Space Grotesk', sans-serif !important;
          font-weight: 700; font-size: 13px !important;
          padding: 7px 16px !important;
          background: linear-gradient(135deg, #4285f4, #34a853);
          color: #fff !important;
          border-radius: 6px;
          box-shadow: 0 0 16px rgba(66,133,244,0.4);
          transition: opacity 0.2s, transform 0.2s;
        }
        .nav-market:hover { opacity: 0.9; transform: scale(1.03); }

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
        .section-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; color: rgba(240,240,240,0.38);
          margin-top: 10px; line-height: 1.6;
        }

        /* ── TOOL CARDS (flat grid) ── */
        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .tool-card {
          padding: 20px 18px;
          border-radius: 16px;
          background: rgba(255,255,255,0.018);
          transition: all 0.22s;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .tool-avatar {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tool-avatar-letter {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px; font-weight: 700;
        }
        .tool-name {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 14px;
          line-height: 1.35; color: #f0f0f0;
          flex: 1;
        }
        .tool-price-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 500;
          padding: 3px 10px; border-radius: 999px;
          letter-spacing: 0.06em;
        }

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
          gap: 10px;
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
           MOBILE ≤ 640px
        ════════════════════════════ */
        @media (max-width: 640px) {
          .hero-logo  { height: 80px; max-width: 180px; }
          .hero-content { padding: 0 16px; gap: 14px; }
          .hero-cta-wrap { max-width: 100%; }
          .cta-primary { font-size: 13px; padding: 12px 18px; }
          .scroll-cue { display: none; }
          .blob-blue  { width: 220px; height: 220px; }
          .blob-green { width: 180px; height: 180px; }
          .blob-yellow{ width: 170px; height: 170px; }
          .blob-red   { width: 160px; height: 160px; }

          .site-nav   { padding: 10px 14px; gap: 8px; }
          .nav-logo   { gap: 8px; }
          .nav-gdg-icon  { height: 26px; }
          .nav-rvce-logo { display: none; }
          .nav-divider   { display: none; }
          .nav-links  { gap: 4px; flex-shrink: 0; }
          .nav-link   { font-size: 11px; padding: 6px 8px; }
          .nav-market { font-size: 11px !important; padding: 6px 10px !important; }

          .section-pad   { padding: 44px 14px; }
          .section-title { font-size: 1.45rem; }
          .section-header { margin-bottom: 28px; }

          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .tool-card  { padding: 14px 12px; border-radius: 12px; gap: 10px; }
          .tool-avatar { width: 36px; height: 36px; }
          .tool-name  { font-size: 12px; }

          .rules-grid { grid-template-columns: 1fr; }
          .rule-card  { padding: 14px 14px; }

          .scoring-card  { padding: 24px 14px; }
          .scoring-title { font-size: 1.2rem; }
          .scoring-grid  { grid-template-columns: repeat(2, 1fr); }

          .cta-heading { font-size: 1.5rem; }
          .cta-sub     { font-size: 12px; }
          .cta-btn-primary { font-size: 13px; padding: 12px 20px; }
          .cta-buttons { flex-direction: column; align-items: center; }

          .site-footer   { flex-direction: column; align-items: flex-start; padding: 18px 14px; }
          .footer-links  { gap: 14px; flex-wrap: wrap; }
        }

        /* ════════════════════════════
           TABLET ≤ 768px
        ════════════════════════════ */
        @media (max-width: 768px) and (min-width: 641px) {
          .nav-rvce-logo  { max-width: 110px; }
          .tools-grid     { grid-template-columns: repeat(3, 1fr); }
          .rules-grid     { grid-template-columns: 1fr; }
          .scoring-grid   { grid-template-columns: repeat(2, 1fr); }
          .section-pad    { padding: 56px 24px; }
        }
      `}</style>
    </div>
  );
}
