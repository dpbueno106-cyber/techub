 
//  GLOBAL STATE
 
let adminCalendar;
let currentSchedule = [];
let draggableInstance;



const defaultInstructorNames = [
  "Aaron", "Jesse", "Marc", "Leon",
  "Mike", "Brandon", "Brad", "Graham", "Kalob"
];

//  Dynamic backend URL (local vs deployed)
const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://techub-9gis.onrender.com"; // replaced!

 
//  NAVIGATION
 
function goBack() {
  window.location.href = "adminDashboard.html";
}

// DATE HELPER
function addDays(dateString, days) {
  if (!dateString) {
    console.error("Invalid dateString passed to addDays:", dateString);
    return null;
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    console.error("Invalid date value:", dateString);
    return null;
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
 
//  GENERATE SCHEDULE
 
async function generateSchedule() {
  if (!adminCalendar) {
    console.error("Calendar not initialized");
    alert("Calendar is not ready yet. Please refresh the page.");
    return;
  }

  try {
    adminCalendar.getEvents().forEach(e => e.remove());

    const res = await fetch(`${API_URL}/schedule`);
    const schedule = await res.json();

    if (!Array.isArray(schedule)) {
      console.error("Schedule API error:", schedule);
      alert(schedule.error || "Failed to load schedule");
      return;
    }

    currentSchedule = schedule;
    renderCalendarFromSchedule(schedule);

  } catch (err) {
    console.error("Generate schedule failed:", err);
    alert("Failed to generate schedule");
  }
}


 async function clearSchedule() {
  if (!confirm("Reset schedule to recommended version?")) return;

  try {
    await fetch(`${API_URL}/clearSchedule`, { method: "POST" });

    alert("Schedule reset successful");

    generateSchedule(); // reload immediately
  } catch (err) {
    console.error(err);
    alert("Failed to reset schedule");
  }
}
//  SAVE SCHEDULE
 
async function saveSchedule() {
  try {
    const events = adminCalendar.getEvents();

    if (!events || events.length === 0) {
      alert("Nothing to save");
      return;
    }

    const schedule = events
      .filter(e => e.start) //  ensure valid events
      .map(e => ({
        className:
          e.extendedProps?.className ||
          e.title?.split(" (")[0] ||
          "Unknown",

        location:
          e.extendedProps?.location ||
          e.title?.match(/\((.*?)\)/)?.[1] ||
          "IN",

        instructorName: e.extendedProps?.instructorName || null,

        weekStartDate: e.startStr,
        weekEndDate: e.endStr || e.startStr
      }));

    console.log("Saving schedule payload:", schedule);

    if (!Array.isArray(schedule)) {
      throw new Error("Schedule payload is not an array");
    }

    const res = await fetch(`${API_URL}/saveSchedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Save failed");
    }

    alert("Schedule saved");

  } catch (err) {
    console.error("SaveSchedule failed:", err);
    alert("Save failed (check console)");
  }
}

 
//  RENDER SCHEDULE → CALENDAR
 
function renderCalendarFromSchedule(schedule) {
  if (!Array.isArray(schedule)) {
    console.error("Invalid schedule passed to renderer:", schedule);
    return;
  }

  adminCalendar.getEvents().forEach(e => e.remove());

  schedule.forEach(slot => {
    adminCalendar.addEvent({
      title: `${slot.className} (${slot.location})`,
      start: slot.weekStartDate,
      end: addDays(slot.weekEndDate, 1),
      allDay: true,
      backgroundColor: getInstructorColor(slot.instructorName),
      extendedProps: {
        className: slot.className,
        location: slot.location,
        instructorName: slot.instructorName
      }
    });
  });

  renderInstructorLegendFromSchedule(schedule);
}


 
//  COLOR SYSTEM
 
const colors = [
  "#4fc3f7", "#f06292", "#ffca28",
  "#81c784", "#ba68c8", "#ff8a65"
];

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
  if (!name) return "#888";
  return predefinedColors[name] || "#888";
}

 
//  ADD COURSE MODAL
 
function openAddCourseModal() {

  const modal = document.getElementById("addCourseModal");
  modal.classList.remove("hidden");
  document.body.style.overflow ="hidden";
}

function closeAddCourseModal() {
  const modal = document.getElementById("addCourseModal");
  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
}

 
//  ADD COURSE → DRAGGABLE
 
function addCourse() {
  const name = document.getElementById("courseName").value;
  const location = document.getElementById("courseLocation").value;
  const duration = document.getElementById("courseDuration").value;
  const instructor = document.getElementById("courseInstructor").value;

  const el = document.createElement("div");
  el.className = "external-event";
  el.innerText = `${name} (${location})`;

  el.dataset.className = name;
  el.dataset.location = location;
  el.dataset.duration = duration;
  el.dataset.instructor = instructor || null;

  document.getElementById("externalEvents").appendChild(el);

  makeExternalEventsDraggable();

  closeAddCourseModal();
}

 
//  DRAGGABLE EVENTS
 
function makeExternalEventsDraggable() {
  const container = document.getElementById("externalEvents");

  if (draggableInstance) {
    draggableInstance.destroy();
  }
    draggableInstance = new FullCalendar.Draggable(container,
    {
      itemSelector: ".external-event",
      eventData: function (eventEl) {
  const instructor = eventEl.dataset.instructor || null;

  return {
    title: eventEl.innerText,
    duration: { days: Number(eventEl.dataset.duration || 1) * 5 },
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

 document.getElementById("addCourseModal").addEventListener("click", (e) => {
  if (e.target.id === "addCourseModal") {
    closeAddCourseModal();
  }
});
//  EDIT MODAL
 
let selectedEvent;

function openEditModal(event) {
  selectedEvent = event;

  const titleInput = document.getElementById("editEventTitle");
  const locationInput = document.getElementById("editEventLocation");
  const instructorSelect = document.getElementById("editEventInstructor");

  if (!titleInput || !locationInput || !instructorSelect) {
    console.error("Edit modal elements not found");
    return;
  }

  titleInput.value = event.extendedProps.className || "";
  locationInput.value = event.extendedProps.location || "";

  instructorSelect.innerHTML = defaultInstructorNames.map(name => `
    <option ${name === event.extendedProps.instructorName ? "selected" : ""}>
      ${name}
    </option>
  `).join("");

  document.getElementById("eventEditMenu")?.classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("eventEditMenu").classList.add("hidden");
}
//  SAVE EDIT
 
document.getElementById("saveEventBtn")?.addEventListener("click", () => {

  if (!selectedEvent) return;

  const title = document.getElementById("editEventTitle").value;
  const location = document.getElementById("editEventLocation").value;
  const instructor = document.getElementById("editEventInstructor").value;

  selectedEvent.setProp("title", `${title} (${location})`);

  selectedEvent.setExtendedProp("className", title);
  selectedEvent.setExtendedProp("location", location);
  selectedEvent.setExtendedProp("instructorName", instructor);
  selectedEvent.setProp(
  "backgroundColor",
  getInstructorColor(instructor)
);
  closeEditModal();
});

 
//  DELETE EVENT
 
document.getElementById("deleteEventBtn")?.addEventListener("click", () => {
  if (!selectedEvent) return;

  selectedEvent.remove();
  closeEditModal();
});

 function renderInstructorLegendFromSchedule(schedule) {
  const legend = document.getElementById("instructorLegend");
  if (!legend) return;

  legend.innerHTML = "";

  const usedInstructors = [...new Set(
    schedule
      .map(s => s.instructorName)
      .filter(Boolean)
  )];

  usedInstructors.forEach(name => {
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
//  INIT CALENDAR
 
function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  if (!calendarEl) {
    console.error("calendar element not found");
    return;
  }

  adminCalendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    editable: true,
    droppable: true,
    height: 600,
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
  console.log(" Calendar rendered");
}

 
//  INIT PAGE

window.addEventListener("DOMContentLoaded", () => {

  initCalendar();
  makeExternalEventsDraggable();
  renderInstructorLegendFromSchedule(currentSchedule);

  // populate instructor dropdown in modal
  const select = document.getElementById("courseInstructor");

  if (select) {
    select.innerHTML = defaultInstructorNames.map(name => `
      <option>${name}</option>
    `).join("");
  }
});