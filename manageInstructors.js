import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where
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
const instructorIdEl =
  document.getElementById("instructorId");

const nameEl =
  document.getElementById("name");

const emailEl =
  document.getElementById("email");

const homeLocationEl =
  document.getElementById("homeLocation");

const maxClassesEl =
  document.getElementById("maxClasses");

const canTravelEl =
  document.getElementById("canTravel");
const listEl = document.getElementById("instructorList");

// =========================
// LOAD CAPABILITIES (CATALOG)
// =========================
async function loadCapabilities() {
  const snapshot = await getDocs(
    query(collection(db, "catalog"), where("isActive", "==", true))
  );

  return snapshot.docs.map(doc => doc.data().name);
}

// =========================
// LOAD INSTRUCTORS
// =========================
addInstructorForm.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    await setDoc(
      doc(
        db,
        "instructors",
        instructorIdEl.value.trim()
      ),
      {
        id: instructorIdEl.value.trim(),

        name: nameEl.value.trim(),

        email: emailEl.value.trim(),

        homeLocation:
          homeLocationEl.value,

        canTravel:
          canTravelEl.checked,

        capabilities: [],

        availability: [],

        maxClasses:
          Number(maxClassesEl.value)
      }
    );

    alert("Instructor created");

    loadInstructors();
  }
);



async function loadInstructors() {
  listEl.innerHTML = "Loading instructors...";

  const [catalogCapabilities, instructorSnap] =
  await Promise.all([
    loadCapabilities(),
    getDocs(collection(db, "instructors"))
  ]);

  listEl.innerHTML = "";

  instructorSnap.forEach(docSnap => {
   const instructorId = docSnap.id;
    const data = docSnap.data();

    const card = document.createElement("div");
    card.className = "instructor-card";

    const title = document.createElement("h3");
    title.textContent = data.name || data.email || instructorId;

    const form = document.createElement("div");
    form.className = "capability-form";

    //  Build checkboxes from CATALOG (not categories)
    catalogCapabilities.forEach(cap => {
      const label = document.createElement("label");
      label.style.display = "block";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = cap;
      cb.checked = data.capabilities?.includes(cap) ?? false;

      label.appendChild(cb);
      label.append(` ${cap}`);
      form.appendChild(label);
    });

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Capabilities";
    saveBtn.onclick = async () => {
      const selected = [
        ...form.querySelectorAll("input:checked")
      ].map(cb => cb.value);

      await setDoc(
        doc(db, "instructors", instructorId),
        { capabilities: selected },
        { merge: true }
      );

      alert("Capabilities updated");
    };

    card.appendChild(title);
    card.appendChild(form);
    card.appendChild(saveBtn);
    listEl.appendChild(card);
  });
}

// =========================
// AUTH + ADMIN GATE
// =========================
onAuthStateChanged(auth, async user => {
  if (!user) {
    alert("You must be logged in.");
    window.location.href = "index.html";
    return;
  }

  const token = await user.getIdTokenResult();

  if (!token.claims.admin) {
    alert("Admins only.");
    window.location.href = "adminScheduleManagement.html";
    return;
  }

  loadInstructors();
});