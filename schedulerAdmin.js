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
// INSTRUCTOR HELPERS
// =========================
async function saveCatalogClass() {
  const name = document.getElementById("courseName").value.trim();
  const durationWeeks = Number(
    document.getElementById("courseDuration").value
  );

  if (!name || !durationWeeks) {
    alert("Course name and duration are required");
    return;
  }

  await fetch(`${API_URL}/catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      category: "Foundational",
      durationWeeks,
      defaultLocations: ["IN"],
      frequencyMode: "WEIGHT",
      frequencyWeight: 1,
      isActive: true
    })
  });

  closeAddCourseModal();
  loadCatalog();
}
async function clearSchedule() {
  if (!confirm("Reset schedule to recommended version?")) return;

  await fetch(`${API_URL}/clearSchedule`, {
    method: "POST"
  });

  generateSchedule();
}

function populateInstructorDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = "";
  defaultInstructorNames.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
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

  populateInstructorDropdown("editEventInstructor");

  const instructorSelect =
    document.getElementById("editEventInstructor");

  const selectedInstructor =
    event.extendedProps.instructorName;

  if (selectedInstructor) {
    instructorSelect.value = selectedInstructor;
  } else {
    event.setProp("backgroundColor", "#888");
    event.setProp("borderColor", "#888");
    event.setProp("textColor", "#000");
  }

  document.getElementById("eventEditMenu")
    .classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("eventEditMenu").classList.add("hidden");
  selectedEvent = null;
}

function openAddCourseModal() {
  document.getElementById("courseName").value = "";
  document.getElementById("courseDuration").value = 1;
  populateInstructorDropdown("courseInstructor");
  document.getElementById("addCourseModal")
    .classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddCourseModal() {
  document.getElementById("addCourseModal").classList.add("hidden");
  document.body.style.overflow = "auto";
}

async function saveSchedule() {
  alert("Schedule persistence is not enabled yet.");
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

      const slot = {
        className: event.extendedProps.className,
        category: event.extendedProps.category,
        location: event.extendedProps.location ?? "IN",
        instructorName: event.extendedProps.instructorName,
        durationWeeks: event.extendedProps.durationWeeks ?? 1,
        weekStartDate: event.startStr.split("T")[0]
      };

      event.remove();
      renderCalendarFromSchedule([slot], false);
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
  if (!Array.isArray(catalog)) return;

  const container = document.getElementById("externalEvents");
  container.innerHTML = "";

  catalog.forEach(cls => {
    if (!cls.isActive) return;
    const el = document.createElement("div");
    el.className = "external-event";
    el.innerText = cls.name;
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
        allDay: true,
        backgroundColor: "#888",
        extendedProps: {
          className: eventEl.innerText,
          category: eventEl.dataset.category,
          location: null,
          instructorName: null,
          durationWeeks: Number(eventEl.dataset.durationWeeks)
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
  btn.disabled = true;
  btn.textContent = "Generating...";

  try {
    const res = await fetch(`${API_URL}/schedule`);
    const data = await res.json();
    renderCalendarFromSchedule(data, true);
    renderInstructorWorkload(data);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Schedule";
  }
}

// =========================
// RENDER SCHEDULE
// =========================

function renderCalendarFromSchedule(schedule, clearFirst = true) {
  if (clearFirst) adminCalendar.removeAllEvents();

  schedule.forEach(slot => {
    const bgColor = getInstructorColor(slot.instructorName);
    const textColor = getContrastTextColor(bgColor);

    if (slot.category === "NTO") {
      for (let w = 0; w < slot.durationWeeks; w++) {
        const startDate = new Date(slot.weekStartDate + "T00:00:00");
        startDate.setDate(startDate.getDate() + w * 7);
        if (w === 0) startDate.setDate(startDate.getDate() + 1);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (w === 0 ? 4 : 5));

        adminCalendar.addEvent({
          title: `${slot.className} (${slot.location})`,
          start: startDate.toLocaleDateString("en-CA"),
          end: endDate.toLocaleDateString("en-CA"),
          allDay: true,
          backgroundColor: bgColor,
          borderColor: bgColor,
          textColor,
          extendedProps: { ...slot }
        });
      }
    } else {
      const startDate = new Date(slot.weekStartDate + "T00:00:00");
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 5);

      adminCalendar.addEvent({
        title: `${slot.className} (${slot.location})`,
        start: startDate.toLocaleDateString("en-CA"),
        end: endDate.toLocaleDateString("en-CA"),
        allDay: true,
        backgroundColor: bgColor,
        borderColor: bgColor,
        textColor,
        extendedProps: { ...slot }
      });
    }
  });
}

// =========================
// INSTRUCTOR LEGEND & WORKLOAD
// =========================

function renderInstructorLegend() {
  const legend = document.getElementById("instructorLegend");
  if (!legend) return;
  legend.innerHTML = "";
  Object.entries(predefinedColors).forEach(([name, color]) => {
    const row = document.createElement("div");
    row.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};margin-right:6px"></span>${name}`;
    legend.appendChild(row);
  });
}

function renderInstructorWorkload(schedule) {
  const container = document.getElementById("instructorWorkload");
  if (!container) return;
  container.innerHTML = "";
  const workload = {};
  schedule.forEach(s => {
    const name = s.instructorName || "TBD";
    workload[name] = (workload[name] || 0) + (s.durationWeeks ?? 1);
  });
  Object.entries(workload).forEach(([n, w]) => {
    const row = document.createElement("div");
    row.textContent = `${n}: ${w} weeks`;
    container.appendChild(row);
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
// PAGE INIT
// =========================

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    initCalendar();
    loadCatalog();
    renderInstructorLegend();

    document.getElementById("saveEventBtn")
      ?.addEventListener("click", () => {
        if (!selectedEvent) return;

        const title = document.getElementById("editEventTitle").value;
        const location = document.getElementById("editEventLocation").value;
        const instructor = document.getElementById("editEventInstructor").value;

        selectedEvent.setProp("title", `${title} (${location})`);
        selectedEvent.setExtendedProp("className", title);
        selectedEvent.setExtendedProp("location", location);
        selectedEvent.setExtendedProp("instructorName", instructor);

        const bg = getInstructorColor(instructor);
        selectedEvent.setProp("backgroundColor", bg);
        selectedEvent.setProp("borderColor", bg);
        selectedEvent.setProp("textColor", getContrastTextColor(bg));

        closeEditModal();
      });

    document.getElementById("deleteEventBtn")
      ?.addEventListener("click", () => {
        if (!selectedEvent) return;
        selectedEvent.remove();
        closeEditModal();
      });
  });
});

// =========================
// EXPOSE
// =========================

Object.assign(window, {
  generateSchedule,
  openEditModal,
  closeEditModal,
  openAddCourseModal,
  closeAddCourseModal,
  saveCatalogClass,
  clearSchedule,
  saveSchedule
});