import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

//  Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
  projectId: "techub-login-system"
});

//  Firestore instance
const db = getFirestore();

export { db };