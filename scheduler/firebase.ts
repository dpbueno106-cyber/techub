import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: "techub-login-system"
});

const db = getFirestore();
export { db };