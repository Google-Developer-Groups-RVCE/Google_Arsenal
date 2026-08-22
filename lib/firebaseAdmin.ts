import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase, Database } from "firebase-admin/database";
import { getAuth, Auth } from "firebase-admin/auth";

// Use definite-assignment (!) so the build never fails.
// The whole block is in try-catch so the module always loads even if env vars are
// wrong on Vercel — any error will bubble up inside the route's try-catch instead
// of crashing the module and returning a non-JSON 500 HTML page.
// eslint-disable-next-line prefer-const
let adminDb!: Database;
// eslint-disable-next-line prefer-const
let adminAuth!: Auth;

try {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, '')
      : undefined;

    if (!privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error("Missing required Firebase Admin environment variables");
    }

    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
  adminDb = getDatabase();
  adminAuth = getAuth();
} catch (error: any) {
  console.error("🔥 Firebase Admin init failed:", error.message);
}

export { adminDb, adminAuth };
