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

// Initialize Firebase
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



// AUTH-BASED ROUTING (FINAL)

onAuthStateChanged(auth, async user => {

  if (!user) {
    return;
  }

  if (hasLoaded) return;
  hasLoaded = true;

  let snap = await getDoc(doc(db, "users", user.uid));

  const { role } = snap.data();

  if (role === "admin") {
    window.location.href = "adminDashboard.html";
  } else if (role === "instructor") {
    window.location.href = "userDashboard.html";
  } else {
    window.location.href = "pending.html";
  }
});

// LOGIN
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      loginEmail.value.trim(),
      loginPassword.value
    );
    // Routing handled by onAuthStateChanged
  } catch (error) {
    message.textContent = error.message;
  }
});

// SIGNUP
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMessage = document.getElementById("signupMessage");

signupBtn.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!email || !email.includes("@")) {
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
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Store metadata only (not authorization)
    const user = userCredential.user;

//  Check pre‑approval
const approvalSnap = await getDoc(
  doc(db, "preapprovedInstructors", user.email.toLowerCase())
);

const role = approvalSnap.exists()
  ? "instructor"
  : "pending";
const email = user.email.toLowerCase();
await setDoc(doc(db, "users", user.uid), {
  email,
  role,
  canTeach: [],
  capabilities: []
  //createdAt: new Date()
});

//  Optional cleanup
if (approvalSnap.exists()) {
  await deleteDoc(
    doc(db, "preapprovedInstructors", user.email.toLowerCase())
  );
}

    signupMessage.textContent = "Account created";
    signupMessage.style.color = "green";

  

  }  catch (error) {
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

// HELP
helpBtn.addEventListener("click", () => {
  alert("Enter your email and password. Click Create Account first if you're new.");
});