import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system",
  storageBucket: "techub-login-system.firebasestorage.app",
  messagingSenderId: "48424106638",
  appId: "1:48424106638:web:9246d83f302b21ab0327df",
  measurementId: "G-PQ5RJ1V0BB" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const welcome = document.getElementById("welcome");

// Check user
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  welcome.textContent = "Welcome, " + user.email;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  const role = docSnap.data().role;

  if (role !== "admin") {
    alert("Access denied 🚫");
    window.location.href = "index.html";
  }
});

// Change roles
document.getElementById("makeAdmin").addEventListener("click", async () => {
  const uid = document.getElementById("userId").value;

  await setDoc(doc(db, "users", uid), { role: "admin" }, { merge: true });

  alert("User is now admin ✅");
});

document.getElementById("makeInstructor").addEventListener("click", async () => {
  const uid = document.getElementById("userId").value;

  await setDoc(doc(db, "users", uid), { role: "instructor" }, { merge: true });

  alert("User is now instructor ✅");
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

