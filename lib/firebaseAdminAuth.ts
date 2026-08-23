import { getApps } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import "./firebaseAdmin"; // ensures initializeApp() has already run

// eslint-disable-next-line prefer-const
let adminAuth!: Auth;

try {
  if (getApps().length > 0) {
    adminAuth = getAuth();
  }
} catch (error: any) {
  console.error("🔥 Firebase Admin Auth init failed:", error.message);
}

export { adminAuth };
