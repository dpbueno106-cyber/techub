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
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
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

  const inst = event.extendedProps.instructorName;
  if (inst) {
    document.getElementById("editEventInstructor").value = inst;
  } else {
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

function openAddCourseModal() {
  document.getElementById("courseName").value = "";
  document.getElementById("courseDuration").value = 1;
  populateInstructorDropdown("courseInstructor");
  document.getElementById("addCourseModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddCourseModal() {
  document.getElementById("addCourseModal").classList.add("hidden");
  document.body.style.overflow = "auto";
}

async function saveCatalogClass() {
  const name = document.getElementById("courseName").value.trim();
  const durationWeeks = Number(document.getElementById("courseDuration").value);

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
  await fetch(`${API_URL}/clearSchedule`, { method: "POST" });
  generateSchedule();
}

function goBack() {
  window.location.href = "adminDashboard.html";
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
// LOAD CATALOG (DRAG SOURCE + DELETE)
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

    const label = document.createElement("span");
    label.textContent = cls.name;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "remove-course-btn";
    removeBtn.title = "Remove course";

    removeBtn.addEventListener("click", async e => {
      e.stopPropagation();
      if (!confirm(`Remove "${cls.name}" from catalog?`)) return;
      await fetch(`${API_URL}/catalog/${cls.id}`, { method: "DELETE" });
      loadCatalog();
    });

    el.dataset.category = cls.category;
    el.dataset.durationWeeks = cls.durationWeeks;

    el.appendChild(label);
    el.appendChild(removeBtn);
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
    eventData(el) {
      return {
        title: el.innerText.replace("×", "").trim(),
        allDay: true,
        backgroundColor: "#888",
        extendedProps: {
          className: el.innerText.replace("×", "").trim(),
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
// GENERATE & RENDER
// =========================

async function generateSchedule() {
  const btn = document.getElementById("generateScheduleBtn");
  btn.disabled = true;
  btn.textContent = "Generating...";
  try {
    const res = await fetch(`${API_URL}/schedule`);
    const data = await res.json();
    renderCalendarFromSchedule(data, true);
    renderInstructorWorkloadFromCalendar();
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Schedule";
  }
}

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
// INSTRUCTOR LEGEND & WORKLOAD
// =========================

function renderInstructorLegend() {
  const legend = document.getElementById("instructorLegend");
  if (!legend) return;
  legend.innerHTML = "";
  Object.entries(predefinedColors).forEach(([n, c]) => {
    const row = document.createElement("div");
    row.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${c};margin-right:6px"></span>${n}`;
    legend.appendChild(row);
  });
}

function renderInstructorWorkloadFromCalendar() {
  const container = document.getElementById("instructorWorkload");
  if (!container || !adminCalendar) return;
  container.innerHTML = "";

  const counts = {};
  adminCalendar.getEvents().forEach(e => {
    const inst = e.extendedProps.instructorName || "TBD";
    counts[inst] = (counts[inst] || 0) + 1;
  });

  Object.entries(counts).forEach(([n, w]) => {
    const row = document.createElement("div");
    row.textContent = `${n}: ${w} blocks`;
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

    document.getElementById("saveEventBtn")?.addEventListener("click", () => {
      if (!selectedEvent) return;
      const t = editEventTitle.value;
      const l = editEventLocation.value;
      const i = editEventInstructor.value;
      selectedEvent.setProp("title", `${t} (${l})`);
      selectedEvent.setExtendedProp("className", t);
      selectedEvent.setExtendedProp("location", l);
      selectedEvent.setExtendedProp("instructorName", i);
      const bg = getInstructorColor(i);
      selectedEvent.setProp("backgroundColor", bg);
      selectedEvent.setProp("borderColor", bg);
      selectedEvent.setProp("textColor", getContrastTextColor(bg));
      closeEditModal();
      renderInstructorWorkloadFromCalendar();
    });

    document.getElementById("deleteEventBtn")?.addEventListener("click", () => {
      if (!selectedEvent) return;
      selectedEvent.remove();
      closeEditModal();
      renderInstructorWorkloadFromCalendar();
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
  saveSchedule,
  goBack
});