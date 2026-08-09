// Shared auction constants — imported by API routes and client pages.
// Change values here only; never hardcode them inline.

export const STARTING_PURSE = 120;
export const BID_INCREMENT = 5;
export const LOT_DURATION_MS = 15_000;
export const ANTI_SNIPE_EXTENSION_MS = 5_000;
export const BID_COOLDOWN_MS = 1_000;
export const S_TIER_CAP = 1;
export const A_TIER_CAP = 2;

export type Tier = "S" | "A" | "B";

export interface ToolDefinition {
  id: string;
  name: string;
  tier: Tier;
  basePrice: number;
  copies: number | "Unlimited";
  logoUrl: string;
}

export const TOOLS: ToolDefinition[] = [
  { id: "google-antigravity", name: "Google Antigravity", tier: "S", basePrice: 60, copies: 4, logoUrl: "" },
  { id: "firebase-studio", name: "Firebase Studio", tier: "S", basePrice: 60, copies: 4, logoUrl: "" },
  { id: "gemini-pro", name: "Gemini 2.5 Pro", tier: "S", basePrice: 60, copies: 4, logoUrl: "" },
  { id: "vertex-agent-builder", name: "Vertex AI Agent Builder", tier: "S", basePrice: 60, copies: 4, logoUrl: "" },
  
  { id: "firebase", name: "Firebase (Firestore/RTDB + Auth)", tier: "A", basePrice: 30, copies: 6, logoUrl: "" },
  { id: "google-ai-studio", name: "Google AI Studio", tier: "A", basePrice: 30, copies: 6, logoUrl: "" },
  { id: "google-colab", name: "Google Colab", tier: "A", basePrice: 30, copies: 6, logoUrl: "" },
  { id: "android-studio", name: "Android Studio + Jetpack Compose", tier: "A", basePrice: 30, copies: 6, logoUrl: "" },
  { id: "apps-script", name: "Apps Script + Workspace APIs", tier: "A", basePrice: 30, copies: 6, logoUrl: "" },

  { id: "maps-platform", name: "Maps Platform API", tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "" },
  { id: "cloud-vision", name: "Cloud Vision / Speech-to-Text", tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "" },
  { id: "looker-studio", name: "Looker Studio / Sheets API", tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "" },
  { id: "translate-api", name: "Translate API", tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "" },
  { id: "forms-api", name: "Forms API + Fonts/Material assets", tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "" },
];
