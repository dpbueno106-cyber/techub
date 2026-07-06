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

// DOM
const instructorList = document.getElementById("instructorList");
const pendingInvitesEl = document.getElementById("pendingInvites");
const backBtn = document.getElementById("backBtn");

const preapproveForm = document.getElementById("preapproveForm");
const preapproveEmail = document.getElementById("preapproveEmail");

// =========================
// AUTH + ADMIN CHECK
// =========================
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

// =========================
// PRE-APPROVE INSTRUCTOR
// =========================
if (preapproveForm) {
  preapproveForm.addEventListener("submit", async e => {
    e.preventDefault();

    const email = preapproveEmail.value.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      alert("Enter a valid email");
      return;
    }

    await setDoc(doc(db, "preapprovedInstructors", email), {
      email,
      approvedRole: "instructor",
      createdAt: new Date()
    });

    alert(`${email} pre-approved`);
    preapproveForm.reset();

    await loadInstructorsAndInvites();
  });
}

// =========================
// LOAD DATA
// =========================
async function loadInstructorsAndInvites() {
  instructorList.innerHTML = "Loading...";
  pendingInvitesEl.innerHTML = "Loading...";

  const instructorsSnap = await getDocs(collection(db, "instructors"));
  const preapprovedSnap = await getDocs(
    collection(db, "preapprovedInstructors")
  );

  const signedUpEmails = new Set();

  // ✅ use instructors collection
  instructorsSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.email) {
      signedUpEmails.add(data.email.toLowerCase());
    }
  });

  const pendingInvites = [];

  preapprovedSnap.forEach(docSnap => {
    const email = docSnap.id.toLowerCase();
    if (!signedUpEmails.has(email)) {
      pendingInvites.push(email);
    }
  });

  renderPendingInvites(pendingInvites);
  renderInstructors(instructorsSnap);
}

// =========================
// RENDER PENDING INVITES
// =========================
function renderPendingInvites(pendingInvites) {
  if (!pendingInvites.length) {
    pendingInvitesEl.innerHTML = "<p>No pending invites</p>";
    return;
  }

  pendingInvitesEl.innerHTML = `
    <ul>
      ${pendingInvites.map(email => `<li>${email}</li>`).join("")}
    </ul>
  `;
}

// =========================
// RENDER INSTRUCTORS
// =========================
function renderInstructors(instructorsSnap) {
  instructorList.innerHTML = "";

  instructorsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const uid = docSnap.id;

    const div = document.createElement("div");
    div.classList.add("instructor-card");

    div.innerHTML = `
      <h3>${data.email}</h3>

      <div class="capabilities">
        ${buildCapabilitiesHTML()}
      </div>

      <button class="saveBtn">Save Changes</button>
    `;

    // ✅ pre-check saved capabilities
    const checkboxes = div.querySelectorAll("input");
    checkboxes.forEach(cb => {
      if (data.capabilities?.includes(cb.value)) {
        cb.checked = true;
      }
    });

    // ✅ save capabilities
    const saveBtn = div.querySelector(".saveBtn");
    saveBtn.addEventListener("click", async () => {
      const selected = [...div.querySelectorAll("input:checked")]
        .map(cb => cb.value);

      await setDoc(
        doc(db, "instructors", uid),
        { capabilities: selected },
        { merge: true }
      );

      alert("Saved");
    });

    instructorList.appendChild(div);
  });
}

// =========================
// CAPABILITIES TEMPLATE
// =========================
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

// =========================
// LOAD USERS (ROLE CONTROL)
// =========================
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
        ${data.role === "pending"
          ? "<em style='color: orange;'>(Pending)</em>"
          : ""}
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
      const newRole = select.value;

      //  update user role
      await setDoc(doc(db, "users", uid), {
        role: newRole
      }, { merge: true });

      //  create instructor profile
      if (newRole === "instructor") {
        await setDoc(doc(db, "instructors", uid), {
          email: data.email,
          capabilities: [],
          availability: [],
          maxClasses: 2
        }, { merge: true });
      }

      console.log(`Updated ${data.email} → ${newRole}`);

      await loadInstructorsAndInvites(); // refresh left panel
    });

    userList.appendChild(row);
  });
}

// =========================
// BACK BUTTON
// =========================
backBtn?.addEventListener("click", () => {
  window.location.href = "adminDashboard.html";
});
