 
//  GLOBAL STATE
 
let adminCalendar;
let currentSchedule = [];

const defaultInstructorNames = [
  "Aaron", "Jesse", "Marc", "Leon",
  "Mike", "Brandon", "Brad", "Graham", "Kalob"
];

//  Dynamic backend URL (local vs deployed)
const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://your-backend-url.com"; // replace later

 
//  NAVIGATION
 
function goBack() {
  window.location.href = "adminDashboard.html";
}

 
//  GENERATE SCHEDULE
 
async function generateSchedule() {
  try {
    const res = await fetch(`${API_URL}/schedule`);
    const schedule = await res.json();

    currentSchedule = schedule;

    renderCalendarFromSchedule(schedule);

  } catch (err) {
    console.error(err);
    alert("Failed to generate schedule");
  }
}

 
//  SAVE SCHEDULE
 
async function saveSchedule() {
  try {
    const events = adminCalendar.getEvents();

    const schedule = events.map(event => ({
      className: event.extendedProps.className,
      location: event.extendedProps.location,
      instructorName: event.extendedProps.instructorName,
      weekStartDate: event.startStr,
      weekEndDate: event.endStr
    }));

    const res = await fetch(`${API_URL}/saveSchedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(schedule)
    });

    if (!res.ok) throw new Error();

    alert(" Schedule saved");

  } catch (err) {
    console.error(err);
    alert(" Save failed");
  }
}

 
//  RENDER SCHEDULE → CALENDAR
 
function renderCalendarFromSchedule(schedule) {
  adminCalendar.removeAllEvents();

  schedule.forEach(slot => {
    adminCalendar.addEvent({
      title: `${slot.className} (${slot.location})`,
      start: slot.weekStartDate,
      end: slot.weekEndDate,
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

 
//  COLOR SYSTEM
 
const colors = [
  "#4fc3f7", "#f06292", "#ffca28",
  "#81c784", "#ba68c8", "#ff8a65"
];

const colorMap = new Map();

function getInstructorColor(name) {
  if (!name) return "#888";

  if (!colorMap.has(name)) {
    colorMap.set(name, colors[colorMap.size % colors.length]);
  }

  return colorMap.get(name);
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
  el.dataset.instructor = instructor;

  document.getElementById("externalEvents").appendChild(el);

  makeExternalEventsDraggable();

  closeAddCourseModal();
}

 
//  DRAGGABLE EVENTS
 
function makeExternalEventsDraggable() {
  new FullCalendar.Draggable(
    document.getElementById("externalEvents"),
    {
      itemSelector: ".external-event",
      eventData: function (eventEl) {
        return {
          title: eventEl.innerText,
          duration: { weeks: Number(eventEl.dataset.duration || 1) },

          extendedProps: {
            className: eventEl.dataset.className,
            location: eventEl.dataset.location,
            instructorName: eventEl.dataset.instructor
          }
        };
      }
    }
  );
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

  document.getElementById("editEventTitle").value =
    event.extendedProps.className;

  document.getElementById("editEventLocation").value =
    event.extendedProps.location;

  const instructorSelect = document.getElementById("editEventInstructor");

  instructorSelect.innerHTML = defaultInstructorNames.map(name => `
    <option ${name === event.extendedProps.instructorName ? "selected" : ""}>
      ${name}
    </option>
  `).join("");

  document.getElementById("eventEditMenu").classList.remove("hidden");
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

 
//  INIT CALENDAR
 
function initCalendar() {

  adminCalendar = new FullCalendar.Calendar(
    document.getElementById("adminCalendar"),
    {
      initialView: "dayGridMonth",
      editable: true,
      droppable: true,
      height: 600,

      eventClick: function (info) {
        openEditModal(info.event);
      }
    }
  );

  adminCalendar.render();
}

 
//  INIT PAGE

window.addEventListener("DOMContentLoaded", () => {

  initCalendar();
  makeExternalEventsDraggable();

  // populate instructor dropdown in modal
  const select = document.getElementById("courseInstructor");

  if (select) {
    select.innerHTML = defaultInstructorNames.map(name => `
      <option>${name}</option>
    `).join("");
  }
});