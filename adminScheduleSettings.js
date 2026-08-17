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

async function loadSettings() {

  const res = await fetch(
    `${API_URL}/config/generation`
  );

  const config = await res.json();

  document.getElementById("year").value =
    config.year;

  document.getElementById("totalClasses").value =
    config.totalClasses;

  const foundationalPct = Math.round(
    (config.categoryCaps?.Foundational ?? 0.5) * 100
  );

  document.getElementById("foundationalPct").value =
    foundationalPct;

  document.getElementById("advancedPct").value =
    100 - foundationalPct;

  document.getElementById("maxConsecutiveWeeks").value =
    config.maxConsecutiveWeeks ?? 2;

  document.getElementById("maxClassesPerWeek").value =
    config.maxClassesPerWeek ?? 1;

  document.getElementById("ntoEnabled").checked =
    config.nto?.enabled ?? false;

  document.getElementById("ntoWeeks").value =
    config.nto?.weeks ?? 2;

  document.getElementById("ntoStartDate").value =
    config.nto?.startDate ?? `${config.year}-01-06`;

  document.getElementById("ntoFrequencyMonths").value =
    config.nto?.frequencyMonths ?? 1;

  document.getElementById("preventConflicts").checked =
    config.preventConflicts ?? false;

  document.querySelectorAll(".ntoLocation").forEach(cb => {
    cb.checked =
      config.nto?.locations?.includes(cb.value) ?? false;
  });
}

document
  .getElementById("foundationalPct")
  .addEventListener("input", e => {

    document.getElementById("advancedPct").value =
      100 - Number(e.target.value);

  });

document
  .getElementById("saveSettingsBtn")
  .addEventListener("click", async () => {

    const foundationalPct =
      Number(
        document.getElementById(
          "foundationalPct"
        ).value
      );

    const ntoLocations = Array.from(
      document.querySelectorAll(
        ".ntoLocation"
      )
    )
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const config = {

      year:
        Number(
          document.getElementById(
            "year"
          ).value
        ),

      totalClasses:
        Number(
          document.getElementById(
            "totalClasses"
          ).value
        ),

      preventConflicts:
        document.getElementById(
          "preventConflicts"
        ).checked,

      categoryCaps: {
        Foundational:
          foundationalPct / 100,

        Advanced:
          1 - foundationalPct / 100
      },

      maxConsecutiveWeeks:
        Number(
          document.getElementById(
            "maxConsecutiveWeeks"
          ).value
        ),

      maxClassesPerWeek:
        Number(
          document.getElementById(
            "maxClassesPerWeek"
          ).value
        ),

      nto: {

        enabled:
          document.getElementById(
            "ntoEnabled"
          ).checked,

        weeks:
          Number(
            document.getElementById(
              "ntoWeeks"
            ).value
          ),

        startDate:
          document.getElementById(
            "ntoStartDate"
          ).value,

        frequencyMonths:
          Number(
            document.getElementById(
              "ntoFrequencyMonths"
            ).value
          ),

        locations:
          ntoLocations
      }
    };

    if (config.totalClasses < 0) {

      alert(
        "Total classes cannot be negative"
      );

      return;
    }

    if (config.maxClassesPerWeek <= 0) {

      alert(
        "Max classes per week must be at least 1"
      );

      return;
    }

    if (
      config.nto.enabled &&
      ntoLocations.length === 0
    ) {

      alert(
        "Select at least one NTO location"
      );

      return;
    }

    if (
      config.nto.enabled &&
      !config.nto.startDate
    ) {

      alert(
        "Pick a start date for NTO"
      );

      return;
    }

    if (
      config.nto.enabled &&
      config.nto.frequencyMonths <= 0
    ) {

      alert(
        "NTO frequency must be at least 1 month"
      );

      return;
    }

    const res = await fetch(
      `${API_URL}/config/generation`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body:
          JSON.stringify(config)
      }
    );

    document.getElementById("status").innerText =
      res.ok
        ? "Settings saved"
        : "Save failed";
  });

loadSettings();

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
});