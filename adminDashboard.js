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

//  Get elements
const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logoutBtn");
const makeAdminBtn = document.getElementById("makeAdmin");
const makeInstructorBtn = document.getElementById("makeInstructor");
const userIdInput = document.getElementById("userId");

// Protect page + show user
onAuthStateChanged1(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  welcome.textContent = "Welcome, " + user.email;

  //  check role (only admins allowed)
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("User not found");
    return;
  }

  const role = docSnap.data().role;

  if (role !== "admin") {
    alert("Access denied 🚫");
    window.location.href = "index.html";
  }
});

//  logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});
//  make admin
makeAdminBtn.addEventListener("click", async () => {
  const uid = userIdInput.value;

  await setDoc(doc(db, "users", uid), {
    role: "admin"
  }, { merge: true });

  alert("User is now admin ✅");
});

//  make instructor
makeInstructorBtn.addEventListener("click", async () => {
  const uid = userIdInput.value;

  await setDoc(doc(db, "users", uid), {
    role: "instructor"
  }, { merge: true });

  alert("User is now instructor ✅");
});
