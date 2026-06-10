let currentSchedule = [];
let adminCalendar;
let externalEventsContainer;
let newClassNameInput;
let newClassLocationInput;
let newEventTitleInput;
let newEventStartInput;
let newEventEndInput;
let newEventLocationInput;

function goBack() {
  window.location.href = "adminDashboard.html";
}

async function generateSchedule() {
  try {
    const response = await fetch("http://localhost:3000/schedule");
    const schedule = await response.json();
    currentSchedule = schedule;
    renderSchedule(schedule);
    renderCalendar(schedule);
    buildExternalEventList(schedule);
  } catch (err) {
    console.error("Error fetching schedule:", err);
    alert("Failed to load schedule from the backend.");
  }
}

function renderSchedule(schedule) {
  const container = document.getElementById("scheduleContainer");
  container.innerHTML = "";

  //  Group by week
  const weeks = {};

  schedule.forEach(slot => {
    const weekKey = slot.weekNumber ?? "Unscheduled";
    if (!weeks[weekKey]) {
      weeks[weekKey] = [];
    }
    weeks[weekKey].push(slot);
  });

  Object.keys(weeks)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(weekNumber => {
      const weekCol = document.createElement("div");
      weekCol.className = "weekColumn";
      weekCol.innerHTML = `<h3>Week ${weekNumber}</h3>`;

      weeks[weekNumber].forEach((slot, index) => {
        const card = document.createElement("div");
        card.className = `scheduleCard ${slot.location || ""}`;

        card.innerHTML = `
  <div class="cardHeader">
    ${slot.location || "TBD"}
  </div>

  <div class="className">
    ${slot.className || "Unnamed class"}
  </div>

  <div class="assigned">
    Assigned: 
    <span id="assigned-${weekNumber}-${index}">
      ${slot.instructorName ? slot.instructorName.toUpperCase() : "None"}
    </span>
  </div>

  <select onchange="updateInstructorByWeek('${weekNumber}', ${index}, this.value)">
    ${buildOptions(slot)}
  </select>
`;

        weekCol.appendChild(card);
      });

      container.appendChild(weekCol);
    });
}

function buildOptions(slot) {
  if (!slot.recommendedInstructors) return "<option>No options</option>";

  return slot.recommendedInstructors
    .map(r => `
    <option value="${r.id}">
      ${r.name ? r.name.toUpperCase() : r.id.toUpperCase()} (score: ${r.score})
    </option>
  `)
    .join("");
}

function updateInstructorByWeek(weekNumber, index, instructorId) {
  const span = document.getElementById(`assigned-${weekNumber}-${index}`);
  if (span) {
    span.textContent = instructorId.toUpperCase();
  }

  const weekItems = currentSchedule.filter(x => String(x.weekNumber) === String(weekNumber));
  const slot = weekItems[index];

  if (slot) {
    const instructor = slot.recommendedInstructors?.find(r => r.id === instructorId);
    slot.instructorId = instructorId;
    slot.instructorName = instructor?.name ?? instructorId;
  }

  console.log("Updated", weekNumber, index, instructorId);
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function mapScheduleToCalendarEvents(schedule) {
  return schedule
    .filter(slot => slot.weekStartDate && slot.weekEndDate)
    .map((slot, index) => ({
      id: `event-${slot.weekNumber || index}-${slot.classId}-${index}`,
      title: `${slot.className} ${slot.location || ""}`.trim(),
      start: slot.weekStartDate,
      end: addDays(slot.weekEndDate, 1),
      allDay: true,
      backgroundColor: slot.location === "MI" ? "#f06292" : "#4fc3f7",
      extendedProps: {
        ...slot
      }
    }));
}

function renderCalendar(schedule) {
  if (!adminCalendar) return;
  adminCalendar.removeAllEvents();
  adminCalendar.addEventSource(mapScheduleToCalendarEvents(schedule));
}

function buildExternalEventList(schedule) {
  if (!externalEventsContainer) return;

  const unique = new Map();
  schedule.forEach(slot => {
    const key = `${slot.classId || slot.className}-${slot.location}`;
    if (!unique.has(key)) {
      unique.set(key, {
        id: slot.classId || slot.className,
        name: slot.className,
        location: slot.location || "IN"
      });
    }
  });

  const html = [
    `<h2>Draggable Classes</h2>`,
    ...Array.from(unique.values()).map(cls => `
      <div class="external-event" data-id="${cls.id}" data-location="${cls.location}">
        ${cls.name} (${cls.location})
      </div>
    `)
  ];

  externalEventsContainer.innerHTML = html.join("");
  makeExternalEventsDraggable();
}

function makeExternalEventsDraggable() {
  if (!externalEventsContainer || typeof FullCalendar === "undefined" || !FullCalendar.Draggable) {
    return;
  }

  new FullCalendar.Draggable(externalEventsContainer, {
    itemSelector: ".external-event",
    eventData(eventEl) {
      return {
        title: eventEl.innerText.trim(),
        allDay: true,
        extendedProps: {
          classId: eventEl.dataset.id || eventEl.innerText.trim(),
          className: eventEl.innerText.trim(),
          location: eventEl.dataset.location || "IN",
          instructorId: null,
          instructorName: null,
          category: "CUSTOM",
          level: "Foundational",
          durationWeeks: 1
        }
      };
    }
  });
}

function deleteCalendarEvent(event) {
  if (!confirm(`Delete event "${event.title}"?`)) return;
  event.remove();
  syncScheduleFromCalendar();
}

function setupAddEventForm() {
  const titleInput = document.getElementById("newEventTitle");
  const startInput = document.getElementById("newEventStart");
  const endInput = document.getElementById("newEventEnd");
  const locationInput = document.getElementById("newEventLocation");
  const addButton = document.getElementById("addNewEventBtn");

  if (!titleInput || !startInput || !endInput || !locationInput || !addButton) return;

  addButton.addEventListener("click", () => {
    const title = titleInput.value.trim();
    const start = startInput.value;
    const end = endInput.value;
    const location = locationInput.value.trim().toUpperCase();

    if (!title || !start || !end || !["IN", "MI"].includes(location)) {
      alert("Please enter a title, valid start/end dates, and location IN or MI.");
      return;
    }

    adminCalendar.addEvent({
      title: `${title} (${location})`,
      start,
      end: addDays(end, 1),
      allDay: true,
      backgroundColor: location === "MI" ? "#f06292" : "#4fc3f7",
      extendedProps: {
        classId: title.toLowerCase().replace(/\s+/g, "-"),
        className: title,
        location,
        instructorId: null,
        instructorName: null,
        category: "CUSTOM",
        level: "Foundational",
        durationWeeks: 1
      }
    });

    syncScheduleFromCalendar();
    titleInput.value = "";
    startInput.value = "";
    endInput.value = "";
    locationInput.value = "";
  });
}

function syncScheduleFromCalendar() {
  if (!adminCalendar) return currentSchedule;

  const events = adminCalendar.getEvents();
  const updatedSchedule = events.map(event => {
    const props = event.extendedProps || {};
    const start = event.start;
    const end = event.end || event.start;
    const endDate = event.allDay && end ? new Date(end) : end;
    if (event.allDay && endDate) {
      endDate.setDate(endDate.getDate() - 1);
    }

    return {
      classId: props.classId ?? event.title,
      className: props.className ?? event.title,
      category: props.category ?? "CUSTOM",
      level: props.level ?? "Foundational",
      durationWeeks: props.durationWeeks ?? 1,
      location: props.location ?? "IN",
      instructorId: props.instructorId ?? null,
      instructorName: props.instructorName ?? null,
      weekStartDate: start ? start.toISOString().split("T")[0] : null,
      weekEndDate: endDate ? endDate.toISOString().split("T")[0] : null,
      weekNumber: props.weekNumber ?? null,
      recommendedInstructors: props.recommendedInstructors ?? []
    };
  });

  currentSchedule = updatedSchedule;
  renderSchedule(currentSchedule);
  return currentSchedule;
}

function setupNewClassButton() {
  if (!newClassNameInput || !newClassLocationInput) return;

  const button = document.getElementById("addCustomClassBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    const className = newClassNameInput.value.trim();
    const classLocation = newClassLocationInput.value.trim().toUpperCase();
    if (!className || !["IN", "MI"].includes(classLocation)) {
      alert("Please enter a valid class name and location (IN or MI).");
      return;
    }

    const eventEl = document.createElement("div");
    eventEl.className = "external-event";
    eventEl.dataset.id = className.toLowerCase().replace(/\s+/g, "-");
    eventEl.dataset.location = classLocation;
    eventEl.textContent = `${className} (${classLocation})`;
    externalEventsContainer.appendChild(eventEl);
    makeExternalEventsDraggable();
    newClassNameInput.value = "";
    newClassLocationInput.value = "";
  });
}

async function saveSchedule() {
  try {
    const scheduleToSave = syncScheduleFromCalendar();
    const response = await fetch("http://localhost:3000/saveSchedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(scheduleToSave)
    });

    if (!response.ok) {
      throw new Error(`Save failed with status ${response.status}`);
    }

    alert("Schedule saved successfully!");
  } catch (err) {
    console.error("Error saving schedule:", err);
    alert("Save failed. Check the console for details.");
  }
}

function initializeAdminCalendar() {
  adminCalendar = new FullCalendar.Calendar(document.getElementById("adminCalendar"), {
    initialView: "dayGridMonth",
    editable: true,
    droppable: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    eventReceive() {
      syncScheduleFromCalendar();
    },
    eventDrop() {
      syncScheduleFromCalendar();
    },
    eventResize() {
      syncScheduleFromCalendar();
    },
    eventClick(arg) {
      deleteCalendarEvent(arg.event);
    }
  });

  adminCalendar.render();
}

window.addEventListener("DOMContentLoaded", () => {
  externalEventsContainer = document.getElementById("externalEvents");
  newClassNameInput = document.getElementById("newClassName");
  newClassLocationInput = document.getElementById("newClassLocation");
  newEventTitleInput = document.getElementById("newEventTitle");
  newEventStartInput = document.getElementById("newEventStart");
  newEventEndInput = document.getElementById("newEventEnd");
  newEventLocationInput = document.getElementById("newEventLocation");

  initializeAdminCalendar();
  setupNewClassButton();
  setupAddEventForm();
  buildExternalEventList(currentSchedule);
});
