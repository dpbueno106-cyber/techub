import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
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
const auth = getAuth(app);
const db = getFirestore(app);

const instructorList = document.getElementById("instructorList");
const pendingInvitesEl = document.getElementById("pendingInvites");
const backBtn = document.getElementById("backBtn");

const preapproveForm = document.getElementById("preapproveForm");
const preapproveEmail = document.getElementById("preapproveEmail");

/* =========================
   AUTH + ADMIN GATE
========================= */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));

if (!userDoc.exists() || userDoc.data().role !== "admin") {
  alert("Admins only");
  window.location.href = "index.html";
  return;
}

  await loadInstructorsAndInvites();
  await loadUsers();
});

/* =========================
   PRE-APPROVE INSTRUCTOR
========================= */
if (preapproveForm) {
  preapproveForm.addEventListener("submit", async e => {
    e.preventDefault();

    const email = preapproveEmail.value.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      alert("Enter a valid email");
      return;
    }

    await setDoc(
      doc(db, "preapprovedInstructors", email),
      {
        email,
        approvedRole: "instructor",
        createdAt: new Date()
      }
    );

    alert(`${email} pre-approved`);
    preapproveForm.reset();

    // Refresh list after adding
    await loadInstructorsAndInvites();
  });
}

/* =========================
   LOAD EVERYTHING (SAFE)
========================= */
async function loadInstructorsAndInvites() {
  instructorList.innerHTML = "Loading...";
  pendingInvitesEl.innerHTML = "Loading...";

  const usersSnap = await getDocs(collection(db, "users"));
  const preapprovedSnap = await getDocs(
    collection(db, "preapprovedInstructors")
  );

  /* =========================
     BUILD EMAIL SET
  ========================= */
  const signedUpEmails = new Set();

  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.email) {
      signedUpEmails.add(data.email.toLowerCase());
    }
  });

  /* =========================
     FIND PENDING INVITES
  ========================= */
  const pendingInvites = [];

  preapprovedSnap.forEach(docSnap => {
    const email = docSnap.id.toLowerCase();
    if (!signedUpEmails.has(email)) {
      pendingInvites.push(email);
    }
  });

  renderPendingInvites(pendingInvites);
  renderInstructors(usersSnap);
}

/* =========================
   RENDER PENDING (RIGHT SIDE)
========================= */
function renderPendingInvites(pendingInvites) {
  if (!pendingInvites.length) {
    pendingInvitesEl.innerHTML = `
      <h2>Pre‑Approved</h2>
      <p style="text-align:center;">No pending invites</p>
    `;
    return;
  }

  pendingInvitesEl.innerHTML = `
    <h2>Pre‑Approved (Not Signed Up)</h2>
    <ul>
      ${pendingInvites.map(email => `<li>${email}</li>`).join("")}
    </ul>
  `;
}

/* =========================
   RENDER INSTRUCTORS
========================= */
function renderInstructors(usersSnap) {
  instructorList.innerHTML = "";

  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    const uid = docSnap.id;

    if (data.role !== "instructor") return;

    const div = document.createElement("div");
    div.classList.add("instructor-card");

    div.innerHTML = `
      <h3>${data.email}</h3>

      <div class="capabilities">
        ${buildCapabilitiesHTML()}
      </div>

      <button class="saveBtn">Save Changes</button>
    `;

    /*  Pre-check */
    const checkboxes = div.querySelectorAll("input");
    checkboxes.forEach(cb => {
      if (data.capabilities?.includes(cb.value)) {
        cb.checked = true;
      }
    });

    /*  Save */
    const saveBtn = div.querySelector(".saveBtn");
    saveBtn.addEventListener("click", async () => {
      const selected = [...div.querySelectorAll("input:checked")]
        .map(cb => cb.value);

      await setDoc(
        doc(db, "users", uid),
        { capabilities: selected },
        { merge: true }
      );

      alert("Saved");
    });

    instructorList.appendChild(div);
  });
}

/* =========================
   CAPABILITIES TEMPLATE
========================= */
function buildCapabilitiesHTML() {
  const items = [
    ["DGT", "Diagnostic Tools"],
    ["ELE", "Electrical"],
    ["ENG", "Engines"],
    ["EPG", "Electric Power Generation"],
    ["FUE", "Fuel Systems"],
    ["HAC", "Heating & Conditioning"],
    ["HYD", "Hydraulics"],
    ["MNT", "Maintenance"],
    ["NTO", "New Hire Technician Onboarding"],
    ["PRD", "Product Information"],
    ["PWT", "Powertrain"],
    ["SAF", "Safety"],
    ["SAG", "Seals & Gaskets"],
    ["SIS", "Service Information System"],
    ["SRW", "Service Report Writing"],
    ["TCH", "Technology"],
    ["TDV", "Technician Development"],
    ["TRB", "Troubleshooting"],
    ["WMH", "Welding and Metal Handling"]
  ];

  return items
    .map(([val, label]) =>
      `<label><input type="checkbox" value="${val}"> ${label}</label>`
    )
    .join("");
}
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
  <span>
    ${data.email}
    ${data.role === "pending" ? "<em style='color: orange;'> (Pending)</em>" : ""}
  </span>
  <select>
    <option value="pending" ${data.role === "pending" ? "selected" : ""}>
      Pending
    </option>
    <option value="instructor" ${data.role === "instructor" ? "selected" : ""}>
      Instructor
    </option>
    <option value="admin" ${data.role === "admin" ? "selected" : ""}>
      Admin
    </option>
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
/* =========================
   BACK BUTTON
========================= */
backBtn.addEventListener("click", () => {
  window.location.href = "adminDashboard.html";
});