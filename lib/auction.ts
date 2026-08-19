// Shared auction constants — imported by API routes and client pages.
// Change values here only; never hardcode them inline.

export const STARTING_PURSE = 120;
export const BID_INCREMENT = 5;
export const LOT_DURATION_MS = 15_000;
export const ANTI_SNIPE_EXTENSION_MS = 5_000;
export const BID_COOLDOWN_MS = 1_000;
/** Number of winners (copies) per S-tier lot — all pay the Nth bid (clearing price). */
export const S_TIER_COPIES = 4;
/** Number of winners (copies) per A-tier lot — all pay the Nth bid (clearing price). */
export const A_TIER_COPIES = 6;
/** Max S-tier tools a single team can own. */
export const S_TIER_CAP = 1;
/** Max A-tier tools a single team can own. */
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
  // S-Tier
  { id: "google-antigravity",    name: "Google Antigravity",              tier: "S", basePrice: 60, copies: 4, logoUrl: "/gdg-10.svg" },
  { id: "firebase-studio",       name: "Firebase Studio",                 tier: "S", basePrice: 60, copies: 4, logoUrl: "https://www.gstatic.com/devrel-devsite/prod/v45f61267e9d252408cbb8e0eab4e005f12d4e41e8c5c4f8018b880f6975c0b4c/firebase/images/touchicon-180.png" },
  { id: "gemini-pro",            name: "Gemini 2.5 Pro",                  tier: "S", basePrice: 60, copies: 4, logoUrl: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" },
  { id: "vertex-agent-builder",  name: "Vertex AI Agent Builder",         tier: "S", basePrice: 60, copies: 4, logoUrl: "https://lh3.googleusercontent.com/ZUmXBxfXKxJxSHyC_6S_RFRg_0v1n4w2q7Z9G_cMxkFOKJBdA1e2yVTuV7pABvFf=s200" },

  // A-Tier
  { id: "firebase",              name: "Firebase (Firestore/RTDB + Auth)", tier: "A", basePrice: 30, copies: 6, logoUrl: "https://www.gstatic.com/devrel-devsite/prod/v45f61267e9d252408cbb8e0eab4e005f12d4e41e8c5c4f8018b880f6975c0b4c/firebase/images/touchicon-180.png" },
  { id: "google-ai-studio",      name: "Google AI Studio",                tier: "A", basePrice: 30, copies: 6, logoUrl: "https://www.gstatic.com/aistudio/ai_studio_favicon_32px.png" },
  { id: "google-colab",          name: "Google Colab",                    tier: "A", basePrice: 30, copies: 6, logoUrl: "https://colab.research.google.com/img/colab_favicon_256px.png" },
  { id: "android-studio",        name: "Android Studio + Jetpack Compose",tier: "A", basePrice: 30, copies: 6, logoUrl: "https://developer.android.com/static/studio/images/new-studio-logo-1.png" },
  { id: "apps-script",           name: "Apps Script + Workspace APIs",    tier: "A", basePrice: 30, copies: 6, logoUrl: "https://www.gstatic.com/images/branding/product/1x/apps_script_512dp.png" },
  { id: "nano-banana",           name: "Nano Banana (Imagen)",            tier: "A", basePrice: 30, copies: 6, logoUrl: "/gdg-11.svg" },

  // B-Tier
  { id: "maps-platform",         name: "Maps Platform API",               tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" },
  { id: "cloud-vision",          name: "Cloud Vision / Speech-to-Text",   tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/images/branding/product/1x/cloud_vision_api_512dp.png" },
  { id: "looker-studio",         name: "Looker Studio / Sheets API",      tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/images/branding/product/1x/sheets_512dp.png" },
  { id: "translate-api",         name: "Translate API",                   tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/images/branding/product/1x/translate_512dp.png" },
  { id: "forms-api",             name: "Forms API + Fonts/Material assets",tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/images/branding/product/1x/forms_512dp.png" },
  { id: "notebooklm",            name: "NotebookLM",                      tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/notebooklm/notebooklm_v2.svg" },
  { id: "google-stitch",         name: "Google Stitch",                   tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "/gdg-12.svg" },
  { id: "google-flow",           name: "Google Flow",                     tier: "B", basePrice: 12, copies: "Unlimited", logoUrl: "https://www.gstatic.com/aistudio/ai_studio_favicon_32px.png" },
];
