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
// DATE HELPERS (FINAL)
// =========================

function normalizeMonday(date) {
  const d = new Date(date);
  if (d.getDay() === 1) return d;
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

function exclusiveFridayFromMonday(monday) {
  const d = new Date(monday);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + 1); // exclusive end
  return d.toISOString().split("T")[0];
}

// =========================
// NAVIGATION
// =========================

function goBack() {
  window.location.href = "adminDashboard.html";
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

  document.getElementById("eventEditMenu").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("eventEditMenu").classList.add("hidden");
  selectedEvent = null;
}

function openAddCourseModal() {
  document.getElementById("courseName").value = "";
  document.getElementById("courseLocation").value = "IN";
  document.getElementById("courseDuration").value = 1;
  document.getElementById("courseInstructor").value = "";

  document.getElementById("addCourseModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddCourseModal() {
  document.getElementById("addCourseModal").classList.add("hidden");
  document.body.style.overflow = "auto";
}

function addCourse() {
  const name = document.getElementById("courseName").value.trim();
  const location = document.getElementById("courseLocation").value;
  const instructor = document.getElementById("courseInstructor").value || null;

  if (!name) {
    alert("Course name is required");
    return;
  }

  const el = document.createElement("div");
  el.className = "external-event";
  el.innerText = `${name} (${location})`;

  el.dataset.className = name;
  el.dataset.location = location;
  el.dataset.instructor = instructor;

  document.getElementById("externalEvents").appendChild(el);

  makeExternalEventsDraggable();
  closeAddCourseModal();
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
    //hiddenDays: [0, 6],
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
// SCHEDULE ACTIONS
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
    const schedule = await res.json();
    renderCalendarFromSchedule(schedule);
    renderDraggableCourses(schedule);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Generate Schedule";
    }
  }
}

async function clearSchedule() {
  if (!confirm("Reset schedule to recommended version?")) return;
  await fetch(`${API_URL}/clearSchedule`, { method: "POST" });
  generateSchedule();
}

async function saveSchedule() {
  const events = adminCalendar.getEvents();

  const schedule = events.map(e => ({
    className: e.extendedProps.className,
    location: e.extendedProps.location,
    instructorName: e.extendedProps.instructorName,
    weekStartDate: normalizeMonday(new Date(e.startStr))
      .toISOString()
      .split("T")[0]
  }));
/*
  await fetch(`${API_URL}/saveSchedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schedule)
  }); */

  alert("Schedule saved (not really, this is a demo)");
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
      const instructor = eventEl.dataset.instructor || null;

      return {
        title: eventEl.innerText,
        duration: { days: 1 },
        backgroundColor: getInstructorColor(instructor),
        extendedProps: {
          className: eventEl.dataset.className,
          location: eventEl.dataset.location,
          instructorName: instructor
        }
      };
    }
  });
}

function renderDraggableCourses(schedule) {
  const container = document.getElementById("externalEvents");
  container.innerHTML = "";

  const unique = new Map();
  schedule.forEach(s => unique.set(s.className, s));

  unique.forEach(course => {
    const el = document.createElement("div");
    el.className = "external-event";
    el.innerText = `${course.className} (${course.location})`;
    el.dataset.className = course.className;
    el.dataset.location = course.location;
    el.dataset.instructor = course.instructorName || null;
    container.appendChild(el);
  });

  makeExternalEventsDraggable();
}

// =========================
// RENDER SCHEDULE (FINAL)
// =========================

function renderCalendarFromSchedule(schedule) {
  adminCalendar.removeAllEvents();

  schedule.forEach(slot => {
    const baseDate = new Date(slot.weekStartDate);
    const isNTO = slot.className.toUpperCase().includes("NTO");

    let startMonday;

    if (isNTO) {
      startMonday = normalizeMonday(baseDate);
      startMonday.setDate(startMonday.getDate() + 7);
      while (startMonday.getDay() !== 2) {
        startMonday.setDate(startMonday.getDate() + 1);
      }
    } else {
      startMonday = normalizeMonday(baseDate);
    }

    adminCalendar.addEvent({
      title: `${slot.className} (${slot.location})`,
      start: startMonday.toISOString().split("T")[0],
      end: exclusiveFridayFromMonday(startMonday),
      allDay: true,
      backgroundColor: getInstructorColor(slot.instructorName),
      extendedProps: {
        className: slot.className,
        location: slot.location,
        instructorName: slot.instructorName
      }
    });
  });
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
    document.getElementById("saveScheduleBtn")
      ?.addEventListener("click", saveSchedule);
  });
});

// =========================
// EXPOSE FUNCTIONS FOR HTML
// =========================

Object.assign(window, {
  goBack,
  generateSchedule,
  clearSchedule,
  openAddCourseModal,
  closeAddCourseModal,
  addCourse,
  closeEditModal
});