import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  setDoc,
  doc,
  getDoc,
  deleteDoc
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

let hasLoaded = false;

// UI Elements
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const helpBtn = document.getElementById("helpBtn");
const message = document.getElementById("message");

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
// AUTH-BASED ROUTING
// =========================
onAuthStateChanged(auth, async user => {

  if (!user) return;

  if (hasLoaded) return;
  hasLoaded = true;

  let snap = await getDoc(doc(db, "users", user.uid));

  // Retry a few times if not ready yet
  for (let i = 0; i < 3 && !snap.exists(); i++) {
    await new Promise(res => setTimeout(res, 300));
    snap = await getDoc(doc(db, "users", user.uid));
  }

  //  Safe fallback
  if (!snap.exists()) {
    console.error("User document missing");

    // Optional: auto-create fallback instead
    window.location.href = "pending.html";
    return;
  }

  const { role } = snap.data();

  if (role === "admin") {
    window.location.href = "adminDashboard.html";
  } else if (role === "instructor") {
    window.location.href = "userDashboard.html";
  } else {
    window.location.href = "pending.html";
  }
});


// =========================
// LOGIN
// =========================
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

loginBtn.addEventListener("click", async () => {
  try {
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
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMessage = document.getElementById("signupMessage");

signupBtn.addEventListener("click", async () => {
  const inputEmail = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!inputEmail || !inputEmail.includes("@")) {
    signupMessage.textContent = "Please enter a valid email address";
    signupMessage.style.color = "red";
    return;
  }

  if (password.length < 6) {
    signupMessage.textContent = "Password must be at least 6 characters";
    signupMessage.style.color = "red";
    return;
  }

  try {
    //  Create Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      inputEmail,
      password
    );

    const user = userCredential.user;
    const email = user.email.toLowerCase();

    //  Check pre‑approval
    const approvalSnap = await getDoc(
      doc(db, "preapprovedInstructors", email)
    );

    const role = approvalSnap.exists()
      ? "instructor"
      : "pending";

    //  Create Firestore user doc
    try {
  console.log("🔥 Starting Firestore write...");

  await setDoc(doc(db, "users", user.uid), {
    email,
    role,
    canTeach: [],
    capabilities: []
  });

  console.log("User doc created successfully");

} catch (err) {
  console.error("Firestore failed:", err);
}
    // Remove pre-approved entry
    if (approvalSnap.exists()) {
      await deleteDoc(doc(db, "preapprovedInstructors", email));
    }

    signupMessage.textContent = "Account created";
    signupMessage.style.color = "green";

  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      signupMessage.textContent = "Email already registered. Please log in instead.";
    } else if (error.code === "auth/invalid-email") {
      signupMessage.textContent = "Invalid email format.";
    } else if (error.code === "auth/weak-password") {
      signupMessage.textContent = "Password must be at least 6 characters.";
    } else if (error.code === "auth/too-many-requests") {
      signupMessage.textContent = "Too many attempts. Try again later.";
    } else {
      signupMessage.textContent = error.message;
    }

    signupMessage.style.color = "red";
  }
});


// =========================
// HELP
// =========================
helpBtn.addEventListener("click", () => {
  alert("Enter your email and password. Click Create Account first if you're new.");
});
``