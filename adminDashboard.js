import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logoutBtn");

/*  AUTH + ADMIN GATE */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const token = await user.getIdTokenResult();
  if (!token.claims.admin) {
    alert("Access denied");
    window.location.href = "index.html";
    return;
  }

  if (welcome) {
    welcome.textContent = "Welcome, " + user.email;
  }

  loadUsers();
});

/* LOGOUT */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

/* LOAD USERS (ADMIN ONLY) */
async function loadUsers() {
  const userList = document.getElementById("userList");
  if (!userList) return;

  userList.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "users"));
  userList.innerHTML = "";

  snapshot.forEach(docSnap => {
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