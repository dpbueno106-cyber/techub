import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const listEl = document.getElementById("instructorList");
const form = document.getElementById("addInstructorForm");

async function loadInstructors() {
  listEl.innerHTML = "";

  const snapshot = await getDocs(collection(db, "instructors"));

  snapshot.forEach(docSnap => {
    const instructor = docSnap.data();

    const li = document.createElement("li");
    li.textContent = `${instructor.name} (${instructor.homeLocation})`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      await deleteDoc(doc(db, "instructors", docSnap.id));
      loadInstructors();
    };

    li.appendChild(delBtn);
    listEl.appendChild(li);
  });
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const homeLocation = document.getElementById("homeLocation").value;
  const canTravel = document.getElementById("canTravel").checked;

  const id = name.toLowerCase();

  await addDoc(collection(db, "instructors"), {
  id,
  name,
  email,
  homeLocation,
  canTravel,
  active: true,
  createdAt: serverTimestamp()
});

  form.reset();
  loadInstructors();
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    alert("You must be logged in to manage instructors.");
    window.location.href = "login.html";
    return;
  }

  const token = await user.getIdTokenResult();

  if (!token.claims.admin) {
    alert("Admins only.");
    window.location.href = "adminScheduleManagement.html";
    return;
  }

  // User is authenticated AND admin
  loadInstructors();
});
