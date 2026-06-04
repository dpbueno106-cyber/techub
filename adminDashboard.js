import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { collection, getFirestore, doc, getDoc, setDoc, getDocs } 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
 apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ELEMENTS */
const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");

/* AUTH PROTECTION */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  if (welcome) {
    welcome.textContent = "Welcome, " + user.email;
  }

  const docSnap = await getDoc(doc(db, "users", user.uid));

  if (!docSnap.exists()) return;

  const role = docSnap.data().role;

  if (role !== "admin") {
    alert("Access denied 🚫");
    window.location.href = "index.html";
  }
});

/* LOGOUT */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

/* LOAD USERS */
async function loadUsers() {
  const userList = document.getElementById("userList");
  if (!userList) return;

  userList.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "users"));

  userList.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const uid = docSnap.id;

    const row = document.createElement("div");
    row.classList.add("user-row");

    row.innerHTML = `
      <span>${data.email}</span>

      <select>
        <option value="admin" ${data.role === "admin" ? "selected" : ""}>Admin</option>
        <option value="instructor" ${data.role === "instructor" ? "selected" : ""}>Instructor</option>
      </select>
    `;

    const select = row.querySelector("select");

    select.addEventListener("change", async () => {
      await setDoc(doc(db, "users", uid), {
        role: select.value
      }, { merge: true });

      console.log(`Updated ${data.email} → ${select.value}`);
    });

    userList.appendChild(row);
  });
}
/*
backBtn.addEventListener("click", () => {
  window.location.href = "adminDashboard.html";
});
*/
/* LOAD ON READY */
window.addEventListener("DOMContentLoaded", () => {
  loadUsers();
});
