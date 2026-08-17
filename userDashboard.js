import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system",
  storageBucket: "techub-login-system.firebasestorage.app",
  messagingSenderId: "48424106638",
  appId: "1:48424106638:web:9246d83f302b21ab0327df",
  measurementId: "G-PQ5RJ1V0BB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ELEMENTS */
const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logoutBtn");
const outlookList = document.getElementById("outlookList");

/* AUTH GATE (INSTRUCTOR ONLY) */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));

  // Admins should not be on instructor dashboard
  if (userDoc.data()?.role === "admin") {
    window.location.href = "adminDashboard.html";
    return;
  }

  // Instructor access allowed
  if (welcome) {
    welcome.textContent = "Welcome, " + user.email;
  }

  loadTeachingOutlook();
});

/* PLACEHOLDER TEACHING OUTLOOK */
function loadTeachingOutlook() {
  if (!outlookList) return;

  outlookList.innerHTML = "Teaching schedule coming soon";

  // This can later be replaced with calendar logic
}

/* LOGOUT */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Sign out error:", err);
      alert("Failed to sign out");
    }
  });
}