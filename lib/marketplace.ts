// Marketplace tool definitions — edit this array to add/remove tools or change prices/tiers.
// tier: "premium" → 60 DC each, team may own AT MOST ONE premium tool total.
// tier: "standard" → 30 DC each, no cap beyond remaining balance.
// logoUrl: null means the UI renders a letter-avatar placeholder.

export type ToolTier = "premium" | "standard";

export interface MarketplaceTool {
  id: string;
  name: string;
  price: number;
  tier: ToolTier;
  logoUrl: string | null;
}

export const MARKETPLACE_TOOLS: MarketplaceTool[] = [
  // ── Premium tier — 60 DC · max 1 per team across ALL premium tools ──────
  {
    id: "gemini-api",
    name: "Gemini (app/api)",
    price: 60,
    tier: "premium",
    logoUrl:
      "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
  },
  { id: "google-ai-studio",   name: "Google AI Studio",   price: 60, tier: "premium", logoUrl: null },
  { id: "google-antigravity", name: "Google Antigravity", price: 60, tier: "premium", logoUrl: null },
  { id: "android-studio",     name: "Android Studio",     price: 60, tier: "premium", logoUrl: null },

  // ── Standard tier — 30 DC · unlimited (balance-gated only) ──────────────
  { id: "stitch",            name: "Stitch",            price: 30, tier: "standard", logoUrl: null },
  { id: "notebooklm",        name: "NotebookLM",        price: 30, tier: "standard", logoUrl: null },
  { id: "teachable-machine", name: "Teachable Machine", price: 30, tier: "standard", logoUrl: null },
  { id: "firebase",          name: "Firebase",          price: 30, tier: "standard", logoUrl: null },
];

/** Starting DevCoin balance for every team. */
export const STARTING_BALANCE = 120;

/** Convenience: IDs of all premium tools (derived — do not hardcode elsewhere). */
export const PREMIUM_IDS = new Set(
  MARKETPLACE_TOOLS.filter((t) => t.tier === "premium").map((t) => t.id)
);
