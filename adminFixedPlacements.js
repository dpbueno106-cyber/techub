import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://api.techubtraining.com";

async function getAuthHeaders() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

/* AUTH + ADMIN GATE */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));

  if (userDoc.data()?.role !== "admin") {
    alert("Access denied");
    window.location.href = "index.html";
    return;
  }

  await loadFixedPlacements();
});

async function loadFixedPlacements() {

  const res = await fetch(
    `${API_URL}/fixedPlacements`,
    {
      headers: await getAuthHeaders()
    }
  );

  const placements = await res.json();
  console.log("LOADED PLACEMENTS:",placements);
  const tbody =
    document.querySelector(
      "#fixedPlacementTable tbody"
    );

  const emptyMessage =
    document.getElementById(
      "emptyMessage"
    );

  tbody.innerHTML = "";

  if (placements.length === 0) {

    emptyMessage.style.display =
      "block";

    return;
  }

  emptyMessage.style.display =
    "none";

  placements.forEach(p => {

    tbody.innerHTML += `
      <tr>
        <td>${p.className}</td>
        <td>${formatDate(p.weekStartDate)}</td>
        <td>${p.location}</td>
        <td>${p.instructorName ?? ""}</td>

        <td>
          <button
            class="deleteBtn"
            onclick="deleteFixedPlacement('${p.id}')"
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}


async function deleteFixedPlacement(id) {

  if (
    !confirm(
      "Delete this fixed placement?"
    )
  ) {
    return;
  }

  await fetch(
    `${API_URL}/fixedPlacements/${id}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders()
    }
  );

  loadFixedPlacements();
}





async function deleteAllFixedPlacements() {

  if (
    !confirm(
      "Delete ALL fixed placements?"
    )
  ) {
    return;
  }

  await fetch(
    `${API_URL}/fixedPlacements`,
    {
      method: "DELETE",
      headers: await getAuthHeaders()
    }
  );

  loadFixedPlacements();
}



function formatDate(date) {
  if (!date) {
    return "";
  }

  // Firestore Timestamp
  if (date._seconds) {
    return new Date(
      date._seconds * 1000
    ).toLocaleDateString();
  }

  // Excel serial date
  if (
    typeof date === "number" ||
    /^\d+$/.test(String(date))
  ) {
    const excelDate =
      Number(date);

    const jsDate =
      new Date(
        (excelDate - 25569) *
          86400 *
          1000
      );

    return jsDate.toLocaleDateString();
  }

  // ISO yyyy-mm-dd
  if (
    typeof date === "string" &&
    date.match(
      /^\d{4}-\d{1,2}-\d{1,2}$/
    )
  ) {
    const [
      year,
      month,
      day
    ] = date.split("-");

    return `${month.padStart(2,"0")}/${day.padStart(2,"0")}/${year}`;
  }

  return String(date);
}

function goBack() {
  window.location.href =
    "adminScheduleManagement.html";
}

Object.assign(window, {
  deleteFixedPlacement,
  deleteAllFixedPlacements,
  goBack
});