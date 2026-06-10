let currentSchedule = [];
let adminCalendar;
let externalEventsContainer;
let externalEventDraggable;
let newClassNameInput;
let newClassLocationInput;
let newEventTitleInput;
let newEventStartInput;
let newEventEndInput;
let newEventLocationInput;
let newEventInstructorSelect;
let saveAsTemplateCheckbox;

const templateMap = new Map();
const instructorColorMap = new Map();
const paletteColors = [
  "#4fc3f7",
  "#f06292",
  "#ffca28",
  "#81c784",
  "#ba68c8",
  "#ff8a65",
  "#4db6ac",
  "#9575cd"
];

function getInstructorColor(name) {
  if (!name) {
    return "#9e9e9e";
  }

  if (!instructorColorMap.has(name)) {
    const used = Array.from(instructorColorMap.values());
    const next = paletteColors.find(color => !used.includes(color)) || "#9e9e9e";
    instructorColorMap.set(name, next);
  }

  return instructorColorMap.get(name);
}

function buildInstructorLegend(schedule) {
  const legend = document.getElementById("colorLegend");
  if (!legend) return;

  const names = Array.from(
    new Set(schedule.map(slot => slot.instructorName).filter(Boolean))
  );

  if (names.length === 0) {
    legend.innerHTML = `<div class="legend-empty">No instructor assignments yet</div>`;
    return;
  }

  legend.innerHTML = names
    .map(name => `
      <div class="legend-item">
        <span class="legend-color" style="background:${getInstructorColor(name)}"></span>
        <span class="legend-label">${name}</span>
      </div>
    `)
    .join("");
}

function addTemplateToPalette(template) {
  const key = `${template.classId}-${template.location}-${template.className}`;
  if (templateMap.has(key)) return;
  templateMap.set(key, template);

  const eventEl = document.createElement("div");
  eventEl.className = "external-event";
  eventEl.dataset.id = template.classId;
  eventEl.dataset.location = template.location;
  eventEl.innerText = `${template.className} (${template.location})`;
  externalEventsContainer.appendChild(eventEl);
  makeExternalEventsDraggable();
}

function updateInstructorSelect(schedule) {
  if (!newEventInstructorSelect) return;

  const names = Array.from(
    new Set(schedule.map(slot => slot.instructorName).filter(Boolean))
  );

  newEventInstructorSelect.innerHTML = `<option value="">TBD</option>` +
    names.map(name => `<option value="${name}">${name}</option>`).join("");
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

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
    buildInstructorLegend(schedule);
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
        const color = slot.instructorName ? getInstructorColor(slot.instructorName) : (slot.location === "MI" ? "#f06292" : "#4fc3f7");

        card.innerHTML = `
  <div class="cardHeader">
    <span class="scheduleColorChip" style="background:${color}"></span>
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
    .map((slot, index) => {
      const instructorName = slot.instructorName || "";
      const titleParts = [`${slot.className} ${slot.location || ""}`.trim()];
      if (instructorName) {
        titleParts.push(`(${instructorName})`);
      }
      return {
        id: `event-${slot.weekNumber || index}-${slot.classId}-${index}`,
        title: titleParts.join(" "),
        start: slot.weekStartDate,
        end: addDays(slot.weekEndDate, 1),
        allDay: true,
        backgroundColor: instructorName ? getInstructorColor(instructorName) : (slot.location === "MI" ? "#f06292" : "#4fc3f7"),
        borderColor: "#222",
        textColor: "#121212",
        extendedProps: {
          ...slot
        }
      };
    });
}

function renderCalendar(schedule) {
  if (!adminCalendar) return;
  adminCalendar.removeAllEvents();
  adminCalendar.addEventSource(mapScheduleToCalendarEvents(schedule));
}

function buildExternalEventList(schedule) {
  if (!externalEventsContainer) return;

  templateMap.clear();
  externalEventsContainer.innerHTML = `<h2>Draggable Classes</h2>`;

  const unique = new Map();
  schedule.forEach(slot => {
    const key = `${slot.classId || slot.className}-${slot.location}`;
    if (!unique.has(key)) {
      unique.set(key, {
        classId: slot.classId || slot.className,
        className: slot.className || slot.classId,
        location: slot.location || "IN"
      });
    }
  });

  unique.forEach(template => addTemplateToPalette(template));
  updateInstructorSelect(schedule);
}

function makeExternalEventsDraggable() {
  if (!externalEventsContainer || typeof FullCalendar === "undefined" || !FullCalendar.Draggable) {
    return;
  }

  if (externalEventDraggable && typeof externalEventDraggable.destroy === "function") {
    externalEventDraggable.destroy();
  }

  externalEventDraggable = new FullCalendar.Draggable(externalEventsContainer, {
    itemSelector: ".external-event",
    eventData(eventEl) {
      const instructorName = eventEl.dataset.instructor || null;
      const title = eventEl.innerText.trim();
      return {
        title,
        allDay: true,
        backgroundColor: instructorName ? getInstructorColor(instructorName) : "#4fc3f7",
        textColor: "#121212",
        extendedProps: {
          classId: eventEl.dataset.id || title,
          className: title,
          location: eventEl.dataset.location || "IN",
          instructorId: instructorName ? instructorName.toLowerCase().replace(/\s+/g, "-") : null,
          instructorName,
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
  newEventInstructorSelect = document.getElementById("newEventInstructor");
  saveAsTemplateCheckbox = document.getElementById("saveAsTemplate");
  const addButton = document.getElementById("addNewEventBtn");

  if (!titleInput || !startInput || !endInput || !locationInput || !addButton) return;

  addButton.addEventListener("click", () => {
    const title = titleInput.value.trim();
    const start = startInput.value;
    const end = endInput.value;
    const location = locationInput.value;
    const instructorName = newEventInstructorSelect?.value || null;
    const saveTemplate = saveAsTemplateCheckbox?.checked;

    if (!title || !start || !end || !["IN", "MI"].includes(location)) {
      alert("Please enter a title, valid start/end dates, and location IN or MI.");
      return;
    }

    const eventData = {
      title: `${title} (${location})`,
      start,
      end: addDays(end, 1),
      allDay: true,
      backgroundColor: instructorName ? getInstructorColor(instructorName) : "#4fc3f7",
      textColor: "#121212",
      extendedProps: {
        classId: title.toLowerCase().replace(/\s+/g, "-"),
        className: title,
        location,
        instructorId: instructorName ? instructorName.toLowerCase().replace(/\s+/g, "-") : null,
        instructorName,
        category: "CUSTOM",
        level: "Foundational",
        durationWeeks: 1
      }
    };

    adminCalendar.addEvent(eventData);
    syncScheduleFromCalendar();

    if (saveTemplate) {
      addTemplateToPalette({
        classId: eventData.extendedProps.classId,
        className: title,
        location,
        instructorName
      });
    }

    titleInput.value = "";
    startInput.value = "";
    endInput.value = "";
    locationInput.value = "IN";
    if (newEventInstructorSelect) newEventInstructorSelect.value = "";
    if (saveAsTemplateCheckbox) saveAsTemplateCheckbox.checked = false;
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
  buildInstructorLegend(currentSchedule);
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

    addTemplateToPalette({
      classId: className.toLowerCase().replace(/\s+/g, "-"),
      className,
      location: classLocation
    });
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
