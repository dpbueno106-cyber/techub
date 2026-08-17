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

  let userDoc;

  try {
    userDoc = await getDoc(doc(db, "users", user.uid));
  } catch (err) {
    console.error("Failed to load user role:", err);
    alert("Could not verify admin access. Check the console for details.");
    window.location.href = "index.html";
    return;
  }

  if (userDoc.data()?.role !== "admin") {
    alert("Access denied");
    window.location.href = "index.html";
    return;
  }

  await loadFixedPlacements();
});

async function loadFixedPlacements() {

  const tbody =
    document.querySelector(
      "#fixedPlacementTable tbody"
    );

  const emptyMessage =
    document.getElementById(
      "emptyMessage"
    );

  tbody.innerHTML = "";

  let placements;

  try {
    const res = await fetch(
      `${API_URL}/fixedPlacements`,
      {
        headers: await getAuthHeaders()
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error(
        "Failed to load fixed placements:",
        res.status,
        data
      );

      emptyMessage.textContent =
        data?.error ||
        `Failed to load fixed placements (status ${res.status}). Check the console.`;

      emptyMessage.style.display = "block";
      return;
    }

    // Accept either a bare array or a { placements: [...] } wrapper,
    // since the API isn't guaranteed to return a raw array.
    placements =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.placements)
          ? data.placements
          : null;

    if (!placements) {
      console.error(
        "Fixed placements response was not an array:",
        data
      );

      emptyMessage.textContent =
        "Unexpected response from the server. Check the console for details.";

      emptyMessage.style.display = "block";
      return;
    }
  } catch (err) {
    console.error("Failed to load fixed placements:", err);

    emptyMessage.textContent =
      "Failed to load fixed placements. Check the console for details.";

    emptyMessage.style.display = "block";
    return;
  }

  console.log("LOADED PLACEMENTS:", placements);

  if (placements.length === 0) {

    emptyMessage.textContent = "No fixed placements found.";
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

  const res = await fetch(
    `${API_URL}/fixedPlacements/${id}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders()
    }
  );

  if (!res.ok) {
    alert("Failed to delete fixed placement. Check the console.");
    console.error("Delete fixed placement failed:", res.status);
    return;
  }

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

  const res = await fetch(
    `${API_URL}/fixedPlacements`,
    {
      method: "DELETE",
      headers: await getAuthHeaders()
    }
  );

  if (!res.ok) {
    alert("Failed to delete fixed placements. Check the console.");
    console.error("Delete all fixed placements failed:", res.status);
    return;
  }

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