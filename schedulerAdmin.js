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
// DOM REFERENCES (EXPLICIT)
// =========================

const calendarEl = document.getElementById("calendar");
const externalEventsEl = document.getElementById("externalEvents");
const instructorWorkloadEl = document.getElementById("instructorWorkload");

const editEventTitleEl = document.getElementById("editEventTitle");
const editEventLocationEl = document.getElementById("editEventLocation");
const editEventInstructorEl = document.getElementById("editEventInstructor");

const saveEventBtn = document.getElementById("saveEventBtn");
const deleteEventBtn = document.getElementById("deleteEventBtn");
const generateScheduleBtn = document.getElementById("generateScheduleBtn");

const courseNameEl = document.getElementById("courseName");
const courseDurationEl = document.getElementById("courseDuration");
const addCourseModalEl = document.getElementById("addCourseModal");
const eventEditMenuEl = document.getElementById("eventEditMenu");

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
// INSTRUCTOR HELPERS
// =========================

function populateInstructorDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";
  defaultInstructorNames.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

// =========================
// SERIALIZATION (PERSISTENCE)
// =========================

function serializeCalendarToSlots() {
  const slots = [];

  adminCalendar.getEvents().forEach(event => {
    const {
      className,
      category,
      location,
      instructorName,
      durationWeeks,
      weekStartDate
    } = event.extendedProps;

    const key = `${className}-${location}-${weekStartDate}`;
    if (slots.some(s => `${s.className}-${s.location}-${s.weekStartDate}` === key)) {
      return;
    }

    slots.push({
      className,
      category,
      location,
      instructorName,
      weekStartDate,
      durationWeeks
    });
  });

  return slots;
}

// =========================
// MODALS
// =========================

function openEditModal(event) {
  selectedEvent = event;

  editEventTitleEl.value = event.extendedProps.className || "";
  editEventLocationEl.value = event.extendedProps.location || "IN";

  populateInstructorDropdown("editEventInstructor");

  if (event.extendedProps.instructorName) {
    editEventInstructorEl.value = event.extendedProps.instructorName;
  }

  eventEditMenuEl.classList.remove("hidden");
}

function closeEditModal() {
  eventEditMenuEl.classList.add("hidden");
  selectedEvent = null;
}

function openAddCourseModal() {
  courseNameEl.value = "";
  courseDurationEl.value = 1;
  addCourseModalEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddCourseModal() {
  addCourseModalEl.classList.add("hidden");
  document.body.style.overflow = "auto";
}

// =========================
// CATALOG
// =========================

async function saveCatalogClass() {
  if (!courseNameEl.value || !courseDurationEl.value) {
    alert("Course name and duration are required");
    return;
  }

  await fetch(`${API_URL}/catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: courseNameEl.value.trim(),
      category: "Foundational",
      durationWeeks: Number(courseDurationEl.value),
      defaultLocations: ["IN"],
      frequencyMode: "WEIGHT",
      frequencyWeight: 1,
      isActive: true
    })
  });

  closeAddCourseModal();
  loadCatalog();
}

// =========================
// CALENDAR INIT
// =========================

function initCalendar() {
  adminCalendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 600,
    editable: true,
    droppable: true,

    eventClick(info) {
      openEditModal(info.event);
    },

    eventReceive(info) {
      const e = info.event;

      const slot = {
        className: e.extendedProps.className,
        category: e.extendedProps.category,
        location: e.extendedProps.location ?? "IN",
        instructorName: e.extendedProps.instructorName,
        durationWeeks: e.extendedProps.durationWeeks ?? 1,
        weekStartDate: e.startStr.split("T")[0]
      };

      e.remove();
      renderCalendarFromSchedule([slot], false);
      renderInstructorWorkloadFromCalendar();
    }
  });

  adminCalendar.render();
}

// =========================
// LOAD CATALOG (DOUBLE‑CLICK DELETE)
// =========================

async function loadCatalog() {
  const res = await fetch(`${API_URL}/catalog`);
  const catalog = await res.json();

  externalEventsEl.innerHTML = "";

  catalog.forEach(cls => {
    if (!cls.isActive) return;

    const el = document.createElement("div");
    el.className = "external-event";
    el.dataset.category = cls.category;
    el.dataset.durationWeeks = cls.durationWeeks;
    el.textContent = cls.name;

    el.addEventListener("dblclick", async e => {
      e.preventDefault();
      e.stopPropagation();

      el.classList.add("confirm-delete");

      if (!confirm(`Remove "${cls.name}" permanently?`)) {
        el.classList.remove("confirm-delete");
        return;
      }

      await fetch(`${API_URL}/catalog/${cls.id}`, { method: "DELETE" });
      loadCatalog();
    });

    externalEventsEl.appendChild(el);
  });

  makeExternalEventsDraggable();
}

// =========================
// DRAGGABLE
// =========================

function makeExternalEventsDraggable() {
  if (draggableInstance) draggableInstance.destroy();

  draggableInstance = new FullCalendar.Draggable(externalEventsEl, {
    itemSelector: ".external-event",
    eventData(el) {
      return {
        title: el.innerText,
        allDay: true,
        backgroundColor: "#888",
        extendedProps: {
          className: el.innerText,
          category: el.dataset.category,
          location: null,
          instructorName: null,
          durationWeeks: Number(el.dataset.durationWeeks)
        }
      };
    }
  });
}

// =========================
// RENDERING
// =========================

function renderCalendarFromSchedule(schedule, clearFirst = true) {
  if (clearFirst) adminCalendar.removeAllEvents();

  schedule.forEach(slot => {
    const bg = getInstructorColor(slot.instructorName);
    const tc = getContrastTextColor(bg);

    if (slot.category === "NTO") {
      for (let w = 0; w < slot.durationWeeks; w++) {
        const start = new Date(slot.weekStartDate + "T00:00:00");
        start.setDate(start.getDate() + w * 7);
        if (w === 0) start.setDate(start.getDate() + 1);

        const end = new Date(start);
        end.setDate(end.getDate() + (w === 0 ? 4 : 5));

        adminCalendar.addEvent({
          title: `${slot.className} (${slot.location})`,
          start: start.toLocaleDateString("en-CA"),
          end: end.toLocaleDateString("en-CA"),
          allDay: true,
          backgroundColor: bg,
          borderColor: bg,
          textColor: tc,
          extendedProps: { ...slot }
        });
      }
    } else {
      const start = new Date(slot.weekStartDate + "T00:00:00");
      const end = new Date(start);
      end.setDate(end.getDate() + 5);

      adminCalendar.addEvent({
        title: `${slot.className} (${slot.location})`,
        start: start.toLocaleDateString("en-CA"),
        end: end.toLocaleDateString("en-CA"),
        allDay: true,
        backgroundColor: bg,
        borderColor: bg,
        textColor: tc,
        extendedProps: { ...slot }
      });
    }
  });
}

// =========================
// WORKLOAD
// =========================

function renderInstructorWorkloadFromCalendar() {
  instructorWorkloadEl.innerHTML = "";
  const counts = {};

  adminCalendar.getEvents().forEach(e => {
    const inst = e.extendedProps.instructorName || "TBD";
    counts[inst] = (counts[inst] || 0) + 1;
  });

  Object.entries(counts).forEach(([n, w]) => {
    instructorWorkloadEl.innerHTML += `<div>${n}: ${w} Classes</div>`;
  });
}

// =========================
// COLORS
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

function getContrastTextColor(hex) {
  if (!hex) return "#000";
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#000" : "#fff";
}

// =========================
// GENERATE / PERSIST
// =========================

async function generateSchedule() {
  if (generateScheduleBtn) {
    generateScheduleBtn.disabled = true;
    generateScheduleBtn.textContent = "Generating...";
  }

  try {
    const res = await fetch(`${API_URL}/schedule`);
    const data = await res.json();
    renderCalendarFromSchedule(data, true);
    renderInstructorWorkloadFromCalendar();
  } finally {
    if (generateScheduleBtn) {
      generateScheduleBtn.disabled = false;
      generateScheduleBtn.textContent = "Generate Schedule";
    }
  }
}

async function saveSchedule() {
  await fetch(`${API_URL}/schedule/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year: new Date().getFullYear(),
      slots: serializeCalendarToSlots()
    })
  });

  alert("Schedule saved");
}

async function loadSavedSchedule() {
  const year = new Date().getFullYear();
  const res = await fetch(`${API_URL}/schedule/load?year=${year}`);
  const data = await res.json();

  if (!data.slots?.length) return false;

  renderCalendarFromSchedule(data.slots, true);
  renderInstructorWorkloadFromCalendar();
  return true;
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

    initCalendar();
    loadCatalog();

    const loaded = await loadSavedSchedule();
    if (!loaded) generateSchedule();

    saveEventBtn.onclick = () => {
      if (!selectedEvent) return;
      selectedEvent.setExtendedProp("instructorName", editEventInstructorEl.value);
      selectedEvent.setExtendedProp("location", editEventLocationEl.value);
      closeEditModal();
      renderInstructorWorkloadFromCalendar();
    };

    deleteEventBtn.onclick = () => {
      if (!selectedEvent) return;
      selectedEvent.remove();
      closeEditModal();
      renderInstructorWorkloadFromCalendar();
    };
  });
});

// =========================
// EXPOSE
// =========================

Object.assign(window, {
  generateSchedule,
  saveSchedule,
  openAddCourseModal,
  closeAddCourseModal,
  saveCatalogClass
});
