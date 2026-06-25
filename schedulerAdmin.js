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

  document
    .getElementById("eventEditMenu")
    .classList.remove("hidden");
}
async function saveSchedule() {
  alert("Schedule persistence is not enabled yet.");
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

      const slot = {
        className: event.extendedProps.className,
        category: event.extendedProps.category,
        location: event.extendedProps.location ?? "IN",
        instructorName: event.extendedProps.instructorName,
        durationWeeks: event.extendedProps.durationWeeks ?? 1,
        weekStartDate: event.startStr.split("T")[0]
      };

      event.remove();
      renderCalendarFromSchedule([slot]);
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

    renderCalendarFromSchedule(data);
    renderInstructorWorkload(data);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Schedule";
  }
}

// =========================
// RENDER SCHEDULE
// =========================
function renderInstructorLegend() {
  const legend = document.getElementById("instructorLegend");
  if (!legend) return;

  legend.innerHTML = "";

  Object.entries(predefinedColors).forEach(([name, color]) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.marginBottom = "6px";

    const swatch = document.createElement("span");
    swatch.style.width = "14px";
    swatch.style.height = "14px";
    swatch.style.backgroundColor = color;
    swatch.style.display = "inline-block";
    swatch.style.marginRight = "8px";
    swatch.style.borderRadius = "3px";

    const label = document.createElement("span");
    label.textContent = name;

    row.appendChild(swatch);
    row.appendChild(label);
    legend.appendChild(row);
  });
}
function renderCalendarFromSchedule(schedule) {
  adminCalendar.removeAllEvents();

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
          extendedProps: {
            className: slot.className,
            category: slot.category,
            location: slot.location,
            instructorName: slot.instructorName
          }
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
        extendedProps: {
          className: slot.className,
          category: slot.category,
          location: slot.location,
          instructorName: slot.instructorName
        }
      });
    }
  });
}

// =========================
// INSTRUCTOR WORKLOAD
// =========================

function renderInstructorWorkload(schedule) {
  const container = document.getElementById("instructorWorkload");
  if (!container) return;

  container.innerHTML = "";

  const workload = {};

  schedule.forEach(slot => {
    const name = slot.instructorName || "TBD";
    const weeks = slot.durationWeeks ?? 1;

    workload[name] ??= { total: 0, nto: 0, other: 0 };
    workload[name].total += weeks;

    if (slot.category === "NTO") workload[name].nto += weeks;
    else workload[name].other += weeks;
  });

  Object.entries(workload).forEach(([name, data]) => {
    const row = document.createElement("div");
    row.textContent = `${name}: ${data.total} weeks`;
    container.appendChild(row);
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

function getContrastTextColor(hexColor) {
  if (!hexColor) return "#000";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
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

    document
      .getElementById("saveEventBtn")
      ?.addEventListener("click", () => {
        if (!selectedEvent) return;

        const title =
          document.getElementById("editEventTitle").value;

        const location =
          document.getElementById("editEventLocation").value;

        const instructor =
          document.getElementById("editEventInstructor").value;

        selectedEvent.setProp(
          "title",
          `${title} (${location})`
        );

        selectedEvent.setExtendedProp("className", title);
        selectedEvent.setExtendedProp("location", location);
        selectedEvent.setExtendedProp("instructorName", instructor);

        const bgColor = getInstructorColor(instructor);
        selectedEvent.setProp("backgroundColor", bgColor);
        selectedEvent.setProp("borderColor", bgColor);
        selectedEvent.setProp(
          "textColor",
          getContrastTextColor(bgColor)
        );

        closeEditModal();
      });

    document
      .getElementById("deleteEventBtn")
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
  saveSchedule
});