import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

const backBtn = document.getElementById("backBtn");
const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system",
  storageBucket: "techub-login-system.firebasestorage.app",
  messagingSenderId: "48424106638",
  appId: "1:48424106638:web:9246d83f302b21ab0327df",
  measurementId: "G-PQ5RJ1V0BB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

let currentRole = null;
let currentUserSlug = null;
let calendar = null;
let calendarReady = false;

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
      console.warn("User document not found for uid:", user.uid);
      currentRole = null;
      currentUserSlug = null;
      return;
    }

    currentRole = docSnap.data().role;
    currentUserSlug = user.email?.split("@")[0]?.toLowerCase() || null;
    await loadScheduleIntoCalendar();
  } catch (error) {
    console.error("Failed to load role:", error);
    currentRole = null;
    currentUserSlug = null;
  }
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function mapScheduleToEvents(schedule) {
  const normalizedInstructor = currentUserSlug;
  let filtered = schedule;

  if (currentRole === "instructor" && normalizedInstructor) {
    filtered = schedule.filter(slot => {
      const slotId = slot.instructorId?.toLowerCase();
      const slotName = slot.instructorName?.toLowerCase();
      return slotId === normalizedInstructor || slotName === normalizedInstructor;
    });
  }

  return filtered
    .filter(slot => slot.instructorId)
    .map(slot => ({
      title: `${slot.className} — ${slot.location} (${slot.instructorName ?? slot.instructorId})`,
      start: slot.weekStartDate,
      end: addDays(slot.weekEndDate, 1),
      allDay: true,
      extendedProps: {
        location: slot.location,
        instructorId: slot.instructorId,
        instructorName: slot.instructorName
      }
    }));
}

async function loadScheduleIntoCalendar() {
  if (!calendarReady || !calendar) return;

  try {
    const response = await fetch("http://localhost:3000/schedule");
    const schedule = await response.json();
    const events = mapScheduleToEvents(schedule);

    calendar.removeAllEvents();
    calendar.addEventSource(events);
  } catch (error) {
    console.error("Unable to load schedule:", error);
  }
}

onAuthStateChanged(auth, (user) => {
  loadUserRole(user);
});

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    events: []
  });

  calendar.render();
  calendarReady = true;
  loadScheduleIntoCalendar();

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (!currentRole) {
        console.error("Unable to determine role. Please log in again.");
        return;
      }

      if (currentRole === "instructor") {
        window.location.href = "userDashboard.html";
      } else if (currentRole === "admin") {
        window.location.href = "adminDashboard.html";
      } else {
        console.warn("Unknown role:", currentRole);
      }
    });
  }
});

