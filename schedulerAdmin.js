// =========================
// GLOBAL STATE
// =========================

let adminCalendar = null;
let draggableInstance = null;
let selectedEvent = null;
let instructors = [];

/*const defaultInstructorNames = [
  "Aaron", "Jesse", "Marc", "Leon",
  "Mike", "Brandon", "Brad", "Graham", "Kalob"
];*/

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

const catalogCourseEl =
  document.getElementById("catalogCourse");

const courseLocationEl =
  document.getElementById("courseLocation");
const addCourseModalEl = document.getElementById("addCourseModal");
const eventEditMenuEl = document.getElementById("eventEditMenu");

// =========================
// FIREBASE AUTH (ADMIN ONLY)
// =========================
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};
let catalogCourses = [];
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let instructorColors = {};
// =========================
// INSTRUCTOR HELPERS
// =========================
async function loadInstructors() {
  const db = getFirestore();

  const snap = await getDocs(collection(db, "instructors"));

  instructors = snap.docs.map(doc => doc.data());

  console.log("Loaded instructors:", instructors);
}


async function populateCatalogDropdown() {
  const res = await fetch(`${API_URL}/catalog`);

  catalogCourses = await res.json();

  catalogCourseEl.innerHTML = "";

  catalogCourses.forEach(course => {
    const option = document.createElement("option");

    option.value = course.id;
    option.textContent = course.name;

    catalogCourseEl.appendChild(option);
  });
}

function buildInstructorColors() {
  instructorColors = {};

  instructors.forEach((inst, index) => {
    instructorColors[inst.id] =
      colorPalette[index % colorPalette.length];
  });

  console.log("Instructor colors:", instructorColors);
}


function populateInstructorDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";

  instructors.forEach(inst => {
    const opt = document.createElement("option");
    opt.value = inst.id;
opt.textContent = inst.name;
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
      instructorId,
      durationWeeks,
      weekStartDate
    } = event.extendedProps;

    const key = `${className}-${location}-${weekStartDate}`;

    if (
      slots.some(
        s =>
          `${s.className}-${s.location}-${s.weekStartDate}` === key
      )
    ) {
      return;
    }

    slots.push({
      className,
      category,
      location,
      instructorId,
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

  if (event.extendedProps.instructorId) {
    editEventInstructorEl.value = event.extendedProps.instructorId;
  }
  
editEventInstructorEl.onchange = () => {
    if (!selectedEvent) return;

    const instructor = editEventInstructorEl.value;
    const bg = getInstructorColor(instructor);
    const text = getContrastTextColor(bg);

    selectedEvent.setExtendedProp("instructorId", instructor);
    selectedEvent.setProp("backgroundColor", bg);
    selectedEvent.setProp("borderColor", bg);
    selectedEvent.setProp("textColor", text);
  };

  eventEditMenuEl.classList.remove("hidden");
}

function addCourseToSchedule() {
  const selectedCourse =
    catalogCourses.find(
      c => c.id === catalogCourseEl.value
    );

  if (!selectedCourse) {
    alert("Please select a course.");
    return;
  }

  const today = new Date();

  renderCalendarFromSchedule([
    {
      className: selectedCourse.name,
      category: selectedCourse.category,
      location: courseLocationEl.value,
      instructorId: null,
      durationWeeks: selectedCourse.durationWeeks,
      weekStartDate:
        today.toISOString().split("T")[0]
    }
  ], false);

  renderInstructorWorkloadFromCalendar();

  closeAddCourseModal();
}


function closeEditModal() {
  eventEditMenuEl.classList.add("hidden");
  selectedEvent = null;
}

async function openAddCourseModal() {
  await populateCatalogDropdown();

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
  instructorId: e.extendedProps.instructorId,
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
  instructorId: null,
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
  if (clearFirst) {
    adminCalendar.removeAllEvents();
  }

  schedule.forEach(slot => {
    const instructorKey =
      slot.instructorId ||
      slot.instructorName ||
      "";

    const bg = getInstructorColor(instructorKey);
    const tc = getContrastTextColor(bg);

    if (slot.category === "NTO") {
      for (let w = 0; w < slot.durationWeeks; w++) {
        const start = new Date(
          slot.weekStartDate + "T00:00:00"
        );

        start.setDate(start.getDate() + w * 7);

        if (w === 0) {
          start.setDate(start.getDate() + 1);
        }

        const end = new Date(start);

        end.setDate(
          end.getDate() + (w === 0 ? 4 : 5)
        );

        adminCalendar.addEvent({
          title: `${slot.className} (${slot.location})`,
          start: start.toLocaleDateString("en-CA"),
          end: end.toLocaleDateString("en-CA"),
          allDay: true,

          backgroundColor: bg,
          borderColor: bg,
          textColor: tc,

          extendedProps: {
            ...slot
          }
        });
      }
    } else {
      const start = new Date(
        slot.weekStartDate + "T00:00:00"
      );

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

        extendedProps: {
          ...slot
        }
      });
    }
  });
}
function renderInstructorLegend() {
  const legend = document.getElementById("instructorLegend");
  if (!legend) return;

  legend.innerHTML = "";

  instructors.forEach(instructor => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.marginBottom = "6px";

    const swatch = document.createElement("span");
    swatch.style.width = "12px";
    swatch.style.height = "12px";
    swatch.style.display = "inline-block";
    swatch.style.marginRight = "6px";
    swatch.style.borderRadius = "3px";
    swatch.style.backgroundColor =
  colorPalette[
    instructors.findIndex(
      i => i.id === instructor.id
    ) % colorPalette.length
  ];

    const label = document.createElement("span");
    label.textContent =
      instructor.name || instructor.id;

    row.appendChild(swatch);
    row.appendChild(label);
    legend.appendChild(row);
  });
}

// =========================
// WORKLOAD
// =========================
function renderInstructorWorkloadFromCalendar() {
  instructorWorkloadEl.innerHTML = "";
  const counts = {};

  adminCalendar.getEvents().forEach(e => {
    const inst =
  e.extendedProps.instructorId ||
  "TBD";
    counts[inst] = (counts[inst] || 0) + 1;
  });

  Object.entries(counts).forEach(([n, w]) => {
    instructorWorkloadEl.innerHTML += `<div>${n}: ${w} Classes</div>`;
  });
}

// =========================
// COLORS
// =========================

const colorPalette = [
  "#4fc3f7",
  "#f06292",
  "#ffca28",
  "#81c784",
  "#ba68c8",
  "#ff8a65",
  "#4db6ac",
  "#9575cd",
  "#e57373",
  "#64b5f6",
  "#aed581",
  "#ffd54f",
  "#a1887f",
  "#90a4ae"
];



function getInstructorColor(instructorId) {
  return (
    instructorColors[instructorId] ||
    "#9e9e9e"
  );
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
    console.log("Generated schedule:", data);
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

editEventInstructorEl.onchange = () => {
  if (!selectedEvent) return;

  const instructor = editEventInstructorEl.value;
  const bg = getInstructorColor(instructor);
  const text = getContrastTextColor(bg);

  selectedEvent.setExtendedProp("instructorId", instructor);
  selectedEvent.setProp("backgroundColor", bg);
  selectedEvent.setProp("borderColor", bg);
  selectedEvent.setProp("textColor", text);
};

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
    await loadInstructors();
buildInstructorColors();

initCalendar();
    loadCatalog();
    renderInstructorLegend();
    const loaded = await loadSavedSchedule();
    if (!loaded) generateSchedule();

    saveEventBtn.onclick = () => {
  if (!selectedEvent) return;

  const instructor = editEventInstructorEl.value;
  const location = editEventLocationEl.value;

  selectedEvent.setExtendedProp("instructorId", instructor);
  selectedEvent.setExtendedProp("location", location);

  const bg = getInstructorColor(instructor);
  const text = getContrastTextColor(bg);

  selectedEvent.setProp("backgroundColor", bg);
  selectedEvent.setProp("borderColor", bg);
  selectedEvent.setProp("textColor", text);

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
  addCourseToSchedule,
  goBack: () => window.location.href = "adminDashboard.html",
  openEditModal,
  closeEditModal,
  clearSchedule: () => {
    if (confirm("Are you sure you want to clear the schedule?")) {
      adminCalendar.removeAllEvents();
      renderInstructorWorkloadFromCalendar();
    }
  }
});
