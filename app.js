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

// =========================
// FIREBASE SETUP
// =========================
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


// =========================
// UI TOGGLE (LOGIN ↔ SIGNUP)
// =========================
const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

document.getElementById("showSignup").addEventListener("click", () => {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
});

document.getElementById("showLogin").addEventListener("click", () => {
  signupBox.style.display = "none";
  loginBox.style.display = "block";
});


// =========================
// LOGIN
// =========================
const loginBtn = document.getElementById("loginBtn");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const message = document.getElementById("message");

loginBtn.addEventListener("click", async () => {
  try {
    // ✅ clear previous session (prevents auto admin login bug)
    await signOut(auth);

    await signInWithEmailAndPassword(
      auth,
      loginEmail.value.trim(),
      loginPassword.value
    );

  } catch (error) {
    message.textContent = error.message;
  }
});


// =========================
// SIGNUP
// =========================
const signupBtn = document.getElementById("signupBtn");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMessage = document.getElementById("signupMessage");

signupBtn.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!email.includes("@")) {
    signupMessage.textContent = "Enter a valid email";
    return;
  }

  if (password.length < 6) {
    signupMessage.textContent = "Password must be at least 6 characters";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);

    signupMessage.textContent = "Account created successfully";
    signupMessage.style.color = "green";

  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      signupMessage.textContent = "Email already registered. Log in.";
    } else {
      signupMessage.textContent = error.message;
    }
    signupMessage.style.color = "red";
  }
});


// =========================
// AUTH STATE HANDLER (CORE)
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const email = user.email.toLowerCase();

  let snap = await getDoc(doc(db, "users", uid));

  //  Create Firestore user AFTER auth is ready
  if (!snap.exists()) {

    console.log("Creating new user document...");

    const approvalSnap = await getDoc(
      doc(db, "preapprovedInstructors", email)
    );

    const assignedRole = approvalSnap.exists()
      ? "instructor"
      : "pending";

    await setDoc(doc(db, "users", uid), {
      email,
      role: assignedRole,
      canTeach: [],
      createdAt: new Date()
    });

    if (approvalSnap.exists()) {
      await deleteDoc(doc(db, "preapprovedInstructors", email));
    }

    snap = await getDoc(doc(db, "users", uid));
  }

  const { role } = snap.data();

  console.log("Logged in as:", email, "| Role:", role);

  //  Routing
  if (role === "admin") {
    window.location.href = "adminDashboard.html";
  } else if (role === "instructor") {
    window.location.href = "userDashboard.html";
  } else {
    window.location.href = "pending.html";
  }
});


// =========================
// HELP BUTTON
// =========================
const helpBtn = document.getElementById("helpBtn");
helpBtn.addEventListener("click", () => {
  alert("Enter your email and password. If new, click Sign Up.");
});
