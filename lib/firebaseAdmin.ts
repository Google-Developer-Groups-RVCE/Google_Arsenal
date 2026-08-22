import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getDatabase, Database } from "firebase-admin/database";
import { getAuth, Auth } from "firebase-admin/auth";

let adminDb: Database | undefined;
let adminAuth: Auth | undefined;

if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Replace literal \n with newlines if present (needed for Vercel env vars)
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    adminDb = getDatabase();
    adminAuth = getAuth();
  } catch (error: any) {
    console.error("Firebase admin initialization error", error.stack);
  }
} else {
  adminDb = getDatabase();
  adminAuth = getAuth();
}

export { adminDb, adminAuth };
