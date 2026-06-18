import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

/* =========================
   CONFIG
========================= */

const API_URL = "https://techub-9gis.onrender.com";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system",
  storageBucket: "techub-login-system.firebasestorage.app",
  messagingSenderId: "48424106638",
  appId: "1:48424106638:web:9246d83f302b21ab0327df",
  measurementId: "G-PQ5RJ1V0BB"
};

const predefinedColors = {
  Aaron: "#4fc3f7",
  Jesse: "#f06292",
  Marc: "#ffca28",
  Leon: "#81c784",
  Mike: "#ba68c8",
  Brandon: "#ff8a65",
  Brad: "#4db6ac",
  Graham: "#9575cd",
  Kalob: "#e57373"
};

function getInstructorColor(name) {
  return predefinedColors[name] || "#888";
}

/* =========================
   FIREBASE INIT
========================= */

const app = initializeApp(firebaseConfig);
getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   STATE
========================= */

let calendar = null;
let calendarReady = false;
let currentRole = null;
let currentUserSlug = null;

/* =========================
   HELPERS
========================= */

// DATE HELPER
function addDays(dateString, days) {
  if (!dateString) {
    console.error("Invalid dateString passed to addDays:", dateString);
    return null;
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    console.error("Invalid date value:", dateString);
    return null;
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}


/* =========================
   MAP SCHEDULE → CALENDAR
========================= */

function mapScheduleToEvents(schedule) {
  if (!Array.isArray(schedule)) {
    console.error("mapScheduleToEvents received invalid schedule:", schedule);
    return [];
  }

  return schedule
    .filter(slot => slot.weekStartDate)
    .map(slot => {
      const end = addDays(
        slot.weekEndDate || slot.weekStartDate,
        1
      );

      if (!end) return null;

      return {
        title: `${slot.className} — ${slot.location}`,
        start: slot.weekStartDate,
        end,
        allDay: true,
        backgroundColor: getInstructorColor(slot.instructorName),
        extendedProps: {
          instructorName: slot.instructorName,
          location: slot.location
        }
      };
    })
    .filter(Boolean);
}


/* =========================
   LOAD SCHEDULE
========================= */

async function loadScheduleIntoCalendar() {
  if (!calendarReady || !calendar) return;

  try {
    const res = await fetch(`${API_URL}/schedule`);
    const schedule = await res.json();

    const events = mapScheduleToEvents(schedule);

    calendar.removeAllEvents();
    calendar.addEventSource(events);

  } catch (err) {
    console.error("Failed to load schedule:", err);
    alert("Unable to load schedule");
  }
}

/* =========================
   AUTH & ROLE
========================= */

async function loadUserRole(user) {
  if (!user) {
    currentRole = null;
    currentUserSlug = null;
    return;
  }

  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn("User record missing");
      return;
    }

    currentRole = docSnap.data().role;
    currentUserSlug = user.email?.split("@")[0]?.toLowerCase() || null;

    await loadScheduleIntoCalendar();

  } catch (err) {
    console.error("Failed to load user role:", err);
  }
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const calendarEl = document.getElementById("calendar");
  const backBtn = document.getElementById("backBtn");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 650,

    //  READ‑ONLY
    editable: false,
    droppable: false,
    selectable: false,
    eventClick: null
  });

  calendar.render();
  calendarReady = true;

  //  Auth triggers schedule load
  onAuthStateChanged(auth, loadUserRole);

  //  Back button
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (currentRole === "instructor") {
        window.location.href = "userDashboard.html";
      } else {
        window.location.href = "adminDashboard.html";
      }
    });
  }
});