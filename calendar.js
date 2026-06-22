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
  doc
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

/* UI ELEMENTS */
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

/* AUTH‑BASED ROUTING (FINAL MODEL) */
onAuthStateChanged(auth, async user => {
  if (!user) return;

  const token = await user.getIdTokenResult();

  if (token.claims.admin) {
    window.location.href = "adminDashboard.html";
  } else {
    window.location.href = "userDashboard.html";
  }
});

/* LOGIN */
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginPassword.value
    );
    // Routing handled by onAuthStateChanged
  } catch (error) {
    message.textContent = error.message;
  }
});

/* SIGNUP */
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMessage = document.getElementById("signupMessage");

signupBtn.addEventListener("click", async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      signupEmail.value,
      signupPassword.value
    );

    // Store metadata only (not authorization)
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: signupEmail.value,
      role: "instructor"
    });

    signupMessage.textContent = "Account created";
    signupMessage.style.color = "green";

    setTimeout(() => {
      signupBox.style.display = "none";
      signupMessage.textContent = "";
      loginBox.style.display = "block";
    }, 3000);

  } catch (error) {
    signupMessage.textContent = error.message;
    signupMessage.style.color = "red";
  }
});

/* HELP */
helpBtn.addEventListener("click", () => {
  alert("Enter your email and password. Click Create Account first if you're new.");
});