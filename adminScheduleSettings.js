import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const auth = getAuth();

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://api.techubtraining.com";


async function getAuthHeaders() {

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "User not authenticated"
    );
  }

  const token =
    await user.getIdToken();

  return {
    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${token}`
  };
}

async function loadSettings() {
  const res = await fetch(
  `${API_URL}/config/generation`,
  {
    headers:
      await getAuthHeaders()
  }
);
  const config = await res.json();

  document.getElementById("year").value = config.year;
  document.getElementById("totalClasses").value = config.totalClasses;

  const foundationalPct = Math.round(
    config.categoryCaps.Foundational * 100
  );

  document.getElementById("foundationalPct").value = foundationalPct;
  document.getElementById("advancedPct").value = 100 - foundationalPct;

  document.getElementById("maxConsecutiveWeeks").value =
    config.maxConsecutiveWeeks ?? 2;

  document.getElementById("ntoEnabled").checked =
    config.nto.enabled;

  document.getElementById("ntoWeeks").value =
    config.nto.weeks ?? 2;

  document.getElementById("ntoStartDay").value =
    config.nto.startDay ?? "Tuesday";

document.getElementById("preventConflicts").checked =
  config.preventConflicts ?? false;

  document.querySelectorAll(".ntoLocation").forEach(cb => {
    cb.checked = config.nto.locations.includes(cb.value);
  });
}

document.getElementById("foundationalPct")
  .addEventListener("input", e => {
    document.getElementById("advancedPct").value =
      100 - Number(e.target.value);
  });

document.getElementById("saveSettingsBtn")
  .addEventListener("click", async () => {

    const foundationalPct =
      Number(document.getElementById("foundationalPct").value);

    const ntoLocations = Array.from(
      document.querySelectorAll(".ntoLocation")
    )
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const config = {
      year: Number(document.getElementById("year").value),
      totalClasses: Number(document.getElementById("totalClasses").value),
      preventConflicts: document.getElementById("preventConflicts").checked ?? false,
      categoryCaps: {
        Foundational: foundationalPct / 100,
        Advanced: 1 - foundationalPct / 100
      },

      maxConsecutiveWeeks: Number(
        document.getElementById("maxConsecutiveWeeks").value
      ),

      nto: {
        enabled: document.getElementById("ntoEnabled").checked,
        weeks: Number(document.getElementById("ntoWeeks").value),
        startDay: document.getElementById("ntoStartDay").value,
        locations: ntoLocations
      }
    };

    // Validation
    if (config.totalClasses <= 0) {
      alert("Total classes must be greater than zero");
      return;
    }

    if (config.nto.enabled && ntoLocations.length === 0) {
      alert("Select at least one NTO location");
      return;
    }

   const res = await fetch(
  `${API_URL}/config/generation`,
  {
    method: "POST",
    headers:
      await getAuthHeaders(),
    body: JSON.stringify(config)
  }
);

    document.getElementById("status").innerText =
      res.ok ? "Settings saved" : "Save failed";
  });

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  await loadSettings();
});




