import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system",
  storageBucket: "techub-login-system.firebasestorage.app",
  messagingSenderId: "48424106638",
  appId: "1:48424106638:web:9246d83f302b21ab0327df"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const message = document.getElementById("message");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMessage = document.getElementById("signupMessage");

// =========================
// LOGIN
// =========================
loginBtn.addEventListener("click", async () => {
  try {
    await(signOut(auth));
    await signInWithEmailAndPassword(
      auth,
      loginEmail.value.trim(),
      loginPassword.value
    );
  } catch (err) {
    message.textContent = err.message;
  }
});

// =========================
// SIGNUP
// =========================
signupBtn.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    signupMessage.textContent = "Account created";
    signupMessage.style.color = "green";
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      signupMessage.textContent = "Email already registered. Log in instead.";
    } else {
      signupMessage.textContent = err.message;
    }
    signupMessage.style.color = "red";
  }
});

// =========================
// AUTH HANDLER (CORE LOGIC)
// =========================
onAuthStateChanged(auth, async user => {
  if (!user) return;

  const uid = user.uid;
  const email = user.email.toLowerCase();

console.log(" Logged in user:", user.email);

let snap = await getDoc(doc(db, "users", user.uid));

if (!snap.exists()) {
  console.error(" No user doc found");
  return;
}

const { role } = snap.data();
console.log(" Role =", role);

  if (!snap.exists()) {
    console.log("Creating Firestore user...");

    // Check preapproval
    const approvalSnap = await getDoc(
      doc(db, "preapprovedInstructors", email)
    );

    const assignedRole = approvalSnap.exists()
      ? "instructor"
      : "pending";

    await setDoc(doc(db, "users", uid), {
      email,
      assignedRole,
      canTeach: [],
      createdAt: new Date()
    });

    if (approvalSnap.exists()) {
      await deleteDoc(doc(db, "preapprovedInstructors", email));
    }

    snap = await getDoc(doc(db, "users", uid));
  }

 

  //  ROUTING
  if (role === "admin") {
    window.location.href = "adminDashboard.html";
  } else if (role === "instructor") {
    window.location.href = "userDashboard.html";
  } else {
    window.location.href = "pending.html";
  }
});