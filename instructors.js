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
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const instructorList = document.getElementById("instructorList");
const backBtn = document.getElementById("backBtn");

/* AUTH + ADMIN GATE */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const token = await user.getIdTokenResult();

  if (!token.claims.admin) {
    alert("Access denied");
    window.location.href = "adminDashboard.html";
    return;
  }

  loadInstructors();
});

/* LOAD INSTRUCTORS (ADMIN ONLY) */
async function loadInstructors() {
  instructorList.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "users"));
  instructorList.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const uid = docSnap.id;

    /* Only show instructors (metadata, not auth) */
    if (data.role !== "instructor") return;

    const div = document.createElement("div");
    div.classList.add("instructor-card");

    div.innerHTML = `
      <h3>${data.email}</h3>

      <div class="capabilities">
        <label><input type="checkbox" value="DGT"> Diagnostic Tools</label>
        <label><input type="checkbox" value="ELE"> Electrical</label>
        <label><input type="checkbox" value="ENG"> Engines</label>
        <label><input type="checkbox" value="EPG"> Electric Power Generation</label>
        <label><input type="checkbox" value="FUE"> Fuel Systems</label>
        <label><input type="checkbox" value="HAC"> Heating & Conditioning</label>
        <label><input type="checkbox" value="HYD"> Hydraulics</label>
        <label><input type="checkbox" value="MNT"> Maintenance</label>
        <label><input type="checkbox" value="NTO"> New Hire Technician Onboarding</label>
        <label><input type="checkbox" value="PRD"> Product Information</label>
        <label><input type="checkbox" value="PWT"> Powertrain</label>
        <label><input type="checkbox" value="SAF"> Safety</label>
        <label><input type="checkbox" value="SAG"> Seals & Gaskets</label>
        <label><input type="checkbox" value="SIS"> Service Information System</label>
        <label><input type="checkbox" value="SRW"> Service Report Writing</label>
        <label><input type="checkbox" value="TCH"> Technology</label>
        <label><input type="checkbox" value="TDV"> Technician Development</label>
        <label><input type="checkbox" value="TRB"> Troubleshooting</label>
        <label><input type="checkbox" value="WMH"> Welding and Metal Handling</label>
      </div>

      <button class="saveBtn">Save Changes</button>
    `;

    /* Pre-check saved capabilities */
    const checkboxes = div.querySelectorAll("input");
    checkboxes.forEach(cb => {
      if (data.capabilities?.includes(cb.value)) {
        cb.checked = true;
      }
    });

    /* Save button */
    const saveBtn = div.querySelector(".saveBtn");
    saveBtn.addEventListener("click", async () => {
      const selected = [...div.querySelectorAll("input:checked")]
        .map(cb => cb.value);

      await setDoc(doc(db, "users", uid), {
        capabilities: selected
      }, { merge: true });

      alert("Capabilities updated successfully");
    });

    instructorList.appendChild(div);
  });
}

/* BACK BUTTON */
backBtn.addEventListener("click", () => {
  window.location.href = "adminDashboard.html";
});