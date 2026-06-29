import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check every 5 seconds
const CHECK_INTERVAL_MS = 5000;

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  setInterval(async () => {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) return;

    const { role } = snap.data();

    if (role === "admin") {
      window.location.href = "adminDashboard.html";
    } else if (role === "instructor") {
      window.location.href = "userDashboard.html";
    }
    // else still pending → do nothing
  }, CHECK_INTERVAL_MS);
});