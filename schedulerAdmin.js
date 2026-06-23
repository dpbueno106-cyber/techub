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
const currentInstructor = event.extendedProps.instructorName;

if (!currentInstructor) {
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
  
  
  document.getElementById("addCourseModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAddCourseModal() {
  document.getElementById("addCourseModal").classList.add("hidden");
  document.body.style.overflow = "auto";
}


document.getElementById("saveEventBtn")?.addEventListener("click", () => {
  if (!selectedEvent) return;

  const title = document.getElementById("editEventTitle").value;
  const location = document.getElementById("editEventLocation").value;
  const instructor = document.getElementById("editEventInstructor").value || null;

  selectedEvent.setProp(
    "title",
    `${title} (${location})`
  );

  selectedEvent.setExtendedProp("className", title);
  selectedEvent.setExtendedProp("location", location);
  selectedEvent.setExtendedProp("instructorName", instructor);

  if (instructor) {
  const color = getInstructorColor(instructor);
  const textColor = getContrastTextColor(color);

  selectedEvent.setProp("backgroundColor", color);
  selectedEvent.setProp("borderColor", color);
  selectedEvent.setProp("textColor", textColor);
} else {
  selectedEvent.setProp("backgroundColor", "#888");
  selectedEvent.setProp("borderColor", "#888");
  selectedEvent.setProp("textColor", "#000");
}

  closeEditModal();
});
// =========================
// CALENDAR INIT
// =========================
function getContrastTextColor(hexColor) {
  if (!hexColor) return "#000";

  // Remove # if present
  const hex = hexColor.replace("#", "");

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Bright background → dark text, dark background → light text
  return brightness > 160 ? "#000" : "#fff";
}
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
async function loadCatalog() {
  const res = await fetch(`${API_URL}/catalog`);
  const catalog = await res.json();

  const container = document.getElementById("externalEvents");
  container.innerHTML = "";
  if (!Array.isArray(catalog)) {
  console.error("Catalog load failed:", catalog);
  return;
}

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

async function saveCatalogClass() {
  const name = document.getElementById("courseName").value.trim();
  const category = document.getElementById("courseCategory").value;
  const durationWeeks = Number(document.getElementById("courseDuration").value);
  const locations = [...document.querySelectorAll("input[name='locations']:checked")]
    .map(el => el.value);
  const frequencyMode = document.getElementById("frequencyMode").value;
  const frequencyWeight = Number(document.getElementById("frequencyWeight").value || 1);

  if (!name || !category || !locations.length || !durationWeeks) {
    alert("All required fields must be filled");
    return;
  }

  const payload = {
    name,
    category,
    durationWeeks,
    defaultLocations: locations,
    frequencyMode,
    frequencyWeight,
    isActive: true
  };

  await fetch(`${API_URL}/catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  closeAddCourseModal();
  loadCatalog(); // refresh draggable list
}



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
      

      return {
        title: eventEl.innerText,
        duration: { days: Number(eventEl.dataset.durationWeeks) * 5 },
        backgroundColor: "#888",
        extendedProps: {
          className: eventEl.dataset.className,
          location: null,
          instructorName: null
        }
      };
    }
  });
}



// =========================
// RENDER SCHEDULE (FINAL)
// =========================

function renderCalendarFromSchedule(schedule) {
  if (!Array.isArray(schedule)) {
  console.error("renderCalendarFromSchedule received invalid data:", schedule);
  return;
}
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

    const bgColor = getInstructorColor(slot.instructorName);
    const textColor = getContrastTextColor(bgColor);

    adminCalendar.addEvent({
      title: `${slot.className} (${slot.location})`,
      start: startMonday.toISOString().split("T")[0],
      end: exclusiveFridayFromMonday(startMonday),
      allDay: true,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor: textColor,
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
renderInstructorLegend();
loadCatalog();

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
  closeEditModal,
  saveSchedule,
  getAdminCalendar: () => adminCalendar
});