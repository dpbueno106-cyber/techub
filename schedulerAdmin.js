// =========================
// GLOBAL STATE
// =========================

let adminCalendar = null;
let draggableInstance = null;
let selectedEvent = null;

const defaultInstructorNames = [
  "Aaron", "Jesse", "Marc", "Leon",
  "Mike", "Brandon", "Brad", "Graham", "Kalob"
];

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://techub-9gis.onrender.com";

// =========================
// FIREBASE AUTH (ADMIN ONLY)
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =========================
// DATE HELPERS
// =========================

function normalizeMonday(date) {
  const d = new Date(date);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

function exclusiveFridayFromMonday(monday) {
  const d = new Date(monday);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// =========================
// MODALS
// =========================

function openEditModal(event) {
  selectedEvent = event;

  document.getElementById("editEventTitle").value =
    event.extendedProps.className || "";

  document.getElementById("editEventLocation").value =
    event.extendedProps.location || "IN";

  const instructorSelect = document.getElementById("editEventInstructor");
  instructorSelect.innerHTML = defaultInstructorNames
    .map(name => `
      <option ${name === event.extendedProps.instructorName ? "selected" : ""}>
        ${name}
      </option>
    `)
    .join("");

  const instructor = event.extendedProps.instructorName;
  if (!instructor) {
    event.setProp("backgroundColor", "#888");
    event.setProp("borderColor", "#888");
    event.setProp("textColor", "#000");
  }

  document.getElementById("eventEditMenu").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("eventEditMenu").classList.add("hidden");
  selectedEvent = null;
}

// =========================
// CALENDAR INIT
// =========================

function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  adminCalendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 600,
    editable: true,
    droppable: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek"
    },

    eventClick(info) {
      openEditModal(info.event);
    },

    eventReceive(info) {
      const event = info.event;
      const monday = normalizeMonday(event.start);
      event.setStart(monday.toISOString().split("T")[0]);
      event.setEnd(exclusiveFridayFromMonday(monday));
      openEditModal(event);
    }
  });

  adminCalendar.render();
}

// =========================
// LOAD CATALOG (DRAG SOURCE)
// =========================

async function loadCatalog() {
  const res = await fetch(`${API_URL}/catalog`);
  const catalog = await res.json();

  if (!Array.isArray(catalog)) {
    console.error("Catalog load failed:", catalog);
    return;
  }

  const container = document.getElementById("externalEvents");
  container.innerHTML = "";

  catalog.forEach(cls => {
    if (!cls.isActive) return;

    const el = document.createElement("div");
    el.className = "external-event";
    el.innerText = cls.name;

    el.dataset.classId = cls.id;
    el.dataset.category = cls.category;
    el.dataset.durationWeeks = cls.durationWeeks;

    container.appendChild(el);
  });

  makeExternalEventsDraggable();
}

// =========================
// DRAGGABLE COURSES
// =========================

function makeExternalEventsDraggable() {
  const container = document.getElementById("externalEvents");
  if (!container) return;

  if (draggableInstance) draggableInstance.destroy();

  draggableInstance = new FullCalendar.Draggable(container, {
    itemSelector: ".external-event",
    eventData(eventEl) {
      return {
        title: eventEl.innerText,
        duration: { days: Number(eventEl.dataset.durationWeeks) * 5 },
        backgroundColor: "#888",
        extendedProps: {
          className: eventEl.innerText,
          category: eventEl.dataset.category,
          location: null,
          instructorName: null
        }
      };
    }
  });
}

// =========================
// GENERATE SCHEDULE
// =========================

async function generateSchedule() {
  const btn = document.getElementById("generateScheduleBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }

  try {
    adminCalendar.removeAllEvents();

    const res = await fetch(`${API_URL}/schedule`);
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      console.error("Schedule API error:", data);
      alert(data?.error || "Failed to load schedule");
      return;
    }

    renderCalendarFromSchedule(data);

  } catch (err) {
    console.error("Generate schedule failed:", err);
    alert("Unexpected error generating schedule");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Generate Schedule";
    }
  }
}

// =========================
// RENDER SCHEDULE
// =========================

function renderCalendarFromSchedule(schedule) {
  adminCalendar.removeAllEvents();

  schedule.forEach(slot => {
    const baseDate = new Date(slot.weekStartDate);
    const isNTO = slot.category === "NTO";

    let startMonday = normalizeMonday(baseDate);

    if (isNTO) {
      startMonday.setDate(startMonday.getDate() + 7);
      while (startMonday.getDay() !== 2) {
        startMonday.setDate(startMonday.getDate() + 1);
      }
    }

    const bgColor = getInstructorColor(slot.instructorName);
    const textColor = getContrastTextColor(bgColor);

    adminCalendar.addEvent({
      title: `${slot.className} (${slot.location})`,
      start: startMonday.toISOString().split("T")[0],
      end: exclusiveFridayFromMonday(startMonday),
      allDay: true,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor,
      extendedProps: {
        className: slot.className,
        category: slot.category,
        location: slot.location,
        instructorName: slot.instructorName
      }
    });
  });
}

// =========================
// SAVE SCHEDULE (DEMO ONLY)
// =========================



async function saveSchedule() {
  // This is intentionally still a demo.
  // We are NOT persisting schedules yet.
  // This will be wired after instructor scoring is finalized.

  alert("Schedule saved (demo only — not persisted)");
}

// =========================
// COLOR SYSTEM
// =========================

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

function getContrastTextColor(hexColor) {
  if (!hexColor) return "#000";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#000" : "#fff";
}

// =========================
// PAGE INIT
// =========================

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const token = await user.getIdTokenResult();
    if (!token.claims.admin) {
      window.location.href = "adminDashboard.html";
      return;
    }

    initCalendar();
    loadCatalog();

    document.getElementById("saveScheduleBtn")?.addEventListener("click", saveSchedule);
  });
});

// =========================
// EXPOSE
// =========================

Object.assign(window, {
  generateSchedule,
  saveSchedule,
  clearSchedule,
  openAddCourseModal,
  closeEditModal
});