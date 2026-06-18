// =========================
// GLOBAL STATE
// =========================

let adminCalendar = null;
let currentSchedule = [];
let draggableInstance = null;

const defaultInstructorNames = [
  "Aaron", "Jesse", "Marc", "Leon",
  "Mike", "Brandon", "Brad", "Graham", "Kalob"
];

const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://techub-9gis.onrender.com";

// =========================
// NAVIGATION
// =========================

function goBack() {
  window.location.href = "adminDashboard.html";
}

// =========================
// DATE HELPER (REQUIRED)
// =========================

function addDays(dateString, days) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

let selectedEvent = null;

function openEditModal(event) {
  console.log("Editing event:", event);
  // Store the selected event globally if needed
  selectedEvent = event;

  // Example: populate modal fields
  const titleInput = document.getElementById("editEventTitle");
  const locationInput = document.getElementById("editEventLocation");
  const instructorSelect = document.getElementById("editEventInstructor");

  if (!titleInput || !locationInput || !instructorSelect) {
    console.error("Edit modal elements not found");
    return;
  }

  titleInput.value = event.extendedProps.className || "";
  locationInput.value = event.extendedProps.location || "IN";


  instructorSelect.innerHTML = defaultInstructorNames
    .map(name => `
      <option ${name === event.extendedProps.instructorName ? "selected" : ""}>
        ${name}
      </option>
    `)
    .join("");

  document.getElementById("eventEditMenu")?.classList.remove("hidden");
}

function closeEditModal() {
  const modal = document.getElementById("eventEditMenu");
  if (!modal) {
    console.error("Edit modal not found");
    return;
  }

  modal.classList.add("hidden");
  selectedEvent = null;
}

document.getElementById("saveEventBtn")?.addEventListener("click", () => {
  if (!selectedEvent) return;

  const title = document.getElementById("editEventTitle")?.value;
  const location = document.getElementById("editEventLocation")?.value;
  const instructor = document.getElementById("editEventInstructor")?.value;

  // Update title
  selectedEvent.setProp("title", `${title} (${location})`);

  // Update extended data
  selectedEvent.setExtendedProp("className", title);
  selectedEvent.setExtendedProp("location", location);
  selectedEvent.setExtendedProp("instructorName", instructor);

  // Update color
  selectedEvent.setProp(
    "backgroundColor",
    getInstructorColor(instructor)
  );

  closeEditModal();

  console.log("Event updated");
});
 
document.getElementById("deleteEventBtn")?.addEventListener("click", () => {
  if (!selectedEvent) return;

  selectedEvent.remove();
  closeEditModal();

  console.log("Event deleted");
});


// =========================
// CALENDAR INIT (CRITICAL)
// =========================

function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  if (!calendarEl) {
    console.error("calendar element not found");
    return;
  }

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
  }

  });

  adminCalendar.render();
  console.log("Calendar rendered");
}

// =========================
// GENERATE SCHEDULE
// =========================

async function generateSchedule() {
  if (!adminCalendar) {
    alert("Calendar not ready yet.");
    return;
  }

  try {
    adminCalendar.removeAllEvents();

    const res = await fetch(`${API_URL}/schedule`);
    const schedule = await res.json();

    if (!Array.isArray(schedule)) {
      console.error("Schedule API error:", schedule);
      alert(schedule.error || "Failed to load schedule");
      return;
    }

    currentSchedule = schedule;
    renderCalendarFromSchedule(schedule);
    renderDraggableCourses(schedule);

  } catch (err) {
    console.error("Generate schedule failed:", err);
    alert("Failed to generate schedule");
  }
}
function renderDraggableCourses(schedule) {
  const container = document.getElementById("externalEvents");
  if (!container) return;

  container.innerHTML = "";

  const uniqueCourses = new Map();

  schedule.forEach(s => {
    if (!uniqueCourses.has(s.className)) {
      uniqueCourses.set(s.className, s);
    }
  });

  uniqueCourses.forEach(course => {
    const el = document.createElement("div");

    el.className = "external-event";
    el.innerText = `${course.className} (${course.location})`;

    el.dataset.className = course.className;
    el.dataset.location = course.location;
    el.dataset.duration = course.durationWeeks || 1;
    el.dataset.instructor = course.instructorName || course.instructorId || null;

    container.appendChild(el);
  });

  makeExternalEventsDraggable();
}
// =========================
// RENDER SCHEDULE
// =========================

function renderCalendarFromSchedule(schedule) {
  if (!adminCalendar || !Array.isArray(schedule)) return;

  adminCalendar.removeAllEvents();

  schedule.forEach(slot => {
    const end = addDays(slot.weekEndDate, 1);
    if (!end) return;

    adminCalendar.addEvent({
      title: `${slot.className} (${slot.location})`,
      start: slot.weekStartDate,
      end,
      allDay: true,
      backgroundColor: getInstructorColor(slot.instructorName || slot.instructorId),
      extendedProps: {
        className: slot.className,
        location: slot.location,
        instructorName: slot.instructorName || slot.instructorId
      }
    });
  });

  renderInstructorLegendFromSchedule(schedule);
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
// INSTRUCTOR LEGEND
// =========================

function renderInstructorLegendFromSchedule(schedule) {
  const legend = document.getElementById("instructorLegend");
  if (!legend) return;

  legend.innerHTML = "";

  const used = [...new Set(
    schedule.map(s => s.instructorName || s.instructorId).filter(Boolean)
  )];

  used.forEach(name => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.marginBottom = "6px";

    const swatch = document.createElement("span");
    swatch.style.background = getInstructorColor(name);
    swatch.style.width = "14px";
    swatch.style.height = "14px";
    swatch.style.marginRight = "8px";
    swatch.style.display = "inline-block";

    const label = document.createElement("span");
    label.textContent = name;

    row.appendChild(swatch);
    row.appendChild(label);
    legend.appendChild(row);
  });
}

// =========================
// CLEAR SCHEDULE
// =========================

async function clearSchedule() {
  if (!confirm("Reset schedule to recommended version?")) return;

  await fetch(`${API_URL}/clearSchedule`, { method: "POST" });
  generateSchedule();
}

// =========================
// PAGE INIT
// =========================

window.addEventListener("DOMContentLoaded", () => {
  initCalendar();
});