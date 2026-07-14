// =========================
// GLOBAL STATE
// =========================
let hiddenInstructors = new Set();
let adminCalendar = null;
let draggableInstance = null;
let selectedEvent = null;
let instructors = [];
let instructorColors = {};

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
const scheduleAnalyticsEl = document.getElementById("scheduleAnalytics");
const editEventTitleEl = document.getElementById("editEventTitle");
const editEventLocationEl = document.getElementById("editEventLocation");
const editEventInstructorEl = document.getElementById("editEventInstructor");
const showAllInstructorsEl = document.getElementById("showAllInstructors");
const saveEventBtn = document.getElementById("saveEventBtn");
const deleteEventBtn = document.getElementById("deleteEventBtn");
const generateScheduleBtn = document.getElementById("generateScheduleBtn");

const courseNameEl =
  document.getElementById("courseName");

const courseCategoryEl =
  document.getElementById("courseCategory");

const courseDurationEl =
  document.getElementById("courseDuration");

const locationINEl =
  document.getElementById("locationIN");

const locationMIEl =
  document.getElementById("locationMI");

const frequencyModeEl =
  document.getElementById("frequencyMode");

const frequencyWeightEl =
  document.getElementById("frequencyWeight");

const courseActiveEl =
  document.getElementById("courseActive");
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =========================
// INSTRUCTOR HELPERS
// =========================

async function clearFixedPlacements() {

  if (
    !confirm(
      "Delete all imported courses?"
    )
  ) {
    return;
  }

  const res = await fetch(
    `${API_URL}/fixedPlacements/`,
    {
      method: "DELETE"
    }
  );

  if (!res.ok) {
    alert(
      "Failed to clear imported courses"
    );
    return;
  }

  alert(
    "Imported courses deleted"
  );

  await generateSchedule();
}

async function loadInstructors() {
  const db = getFirestore();

  const snap = await getDocs(collection(db, "instructors"));

  instructors = snap.docs.map(doc => doc.data());

  console.log("Loaded instructors:", instructors);
}

async function saveCatalogClass() {
  const defaultLocations = [];

  if (locationINEl.checked) {
    defaultLocations.push("IN");
  }

  if (locationMIEl.checked) {
    defaultLocations.push("MI");
  }

  const payload = {
    name: courseNameEl.value.trim(),
    category: courseCategoryEl.value,
    durationWeeks: Number(
      courseDurationEl.value
    ),
    defaultLocations,
    frequencyMode:
      frequencyModeEl.value,
    frequencyWeight: Number(
      frequencyWeightEl.value
    ),
    isActive:
      courseActiveEl.checked
  };

  await fetch(`${API_URL}/catalog`, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json"
    },
    body: JSON.stringify(payload)
  });

  closeAddCourseModal();
  loadCatalog();
}


function buildInstructorColors() {
  instructorColors = {};

  instructors.forEach((inst, index) => {
    instructorColors[inst.id] =
      colorPalette[index % colorPalette.length];
  });

  console.log("Instructor colors:", instructorColors);
}


function populateInstructorDropdown(
  selectId,
  className = null,
  showAll = false
) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";
  const blank = document.createElement("option");
blank.value = "";
blank.textContent = "-- Select Instructor --";
select.appendChild(blank);
  let availableInstructors = instructors;

if (
  className &&
  !showAll
) {
    const normalizedClass =
      className.trim().toLowerCase();

    availableInstructors = instructors.filter(
      inst =>
        (inst.capabilities ?? []).some(
          cap =>
            cap.trim().toLowerCase() ===
            normalizedClass
        )
    );
  }

  availableInstructors
  .sort((a, b) =>
    (a.name || a.id)
      .localeCompare(b.name || b.id)
  )
  .forEach(inst => {
    const opt = document.createElement("option");

    opt.value = inst.id;
    opt.textContent =
      inst.name || inst.id;

    select.appendChild(opt);
  });
}


// =========================
// SERIALIZATION (PERSISTENCE)
// =========================

function serializeCalendarToSlots() {
  const slots = [];

  getLogicalScheduleEvents().forEach(event => {
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
  if (showAllInstructorsEl) {
  showAllInstructorsEl.onchange = () => {
    populateInstructorDropdown(
      "editEventInstructor",
      selectedEvent?.extendedProps
        ?.className,
      showAllInstructorsEl.checked
    );

    if (
      selectedEvent?.extendedProps
        ?.instructorId
    ) {
      editEventInstructorEl.value =
        selectedEvent.extendedProps
          .instructorId;
    }
  };
}

  editEventTitleEl.value = event.extendedProps.className || "";
  editEventLocationEl.value = event.extendedProps.location || "IN";

  populateInstructorDropdown("editEventInstructor" , event.extendedProps.className,showAllInstructorsEl?.checked);

  if (event.extendedProps.instructorId) {
    editEventInstructorEl.value = event.extendedProps.instructorId;
  }else {
  editEventInstructorEl.value = "";
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




function closeEditModal() {
  eventEditMenuEl.classList.add("hidden");
  selectedEvent = null;
}

function openAddCourseModal() {
  courseNameEl.value = "";

  courseCategoryEl.value =
    "Foundational";

  courseDurationEl.value = 1;

  locationINEl.checked = true;
  locationMIEl.checked = false;

  frequencyModeEl.value = "WEIGHT";
  frequencyWeightEl.value = 1;

  courseActiveEl.checked = true;

  addCourseModalEl.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";
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
      applyInstructorFilter();
      renderInstructorWorkloadFromCalendar();
      renderScheduleAnalytics();
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
          classNames:slot.locked? ["fixed-course"]: [],
          borderColor:slot.locked? "#000": bg,
          backgroundColor: bg,
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
        borderColor: slot.locked? "#000": bg,
        classNames: slot.locked? ["fixed-course"]: [],
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
  getInstructorColor(instructor.id);

    const label = document.createElement("span");
    label.textContent =
  ` ${
    instructor.name || instructor.id
  }`;

    row.appendChild(swatch);
row.appendChild(label);

row.style.cursor = "pointer";

row.onclick = () => {
  if (hiddenInstructors.has(instructor.id)) {
    hiddenInstructors.delete(instructor.id);
  } else {
    hiddenInstructors.add(instructor.id);
  }

  renderInstructorLegend();
  applyInstructorFilter();
};

if (hiddenInstructors.has(instructor.id)) {
  row.style.opacity = "0.4";
}

legend.appendChild(row);
  });
}

// =========================
// WORKLOAD
// =========================

function applyInstructorFilter() {
  adminCalendar.getEvents().forEach(event => {
    const instructorId =
      event.extendedProps.instructorId;

    if (
      instructorId &&
      hiddenInstructors.has(instructorId)
    ) {
      event.setProp("display", "none");
    } else {
      event.setProp("display", "auto");
    }
  });
}

function renderInstructorWorkloadFromCalendar() {
  instructorWorkloadEl.innerHTML = "";

  const counts = {};

  adminCalendar.getEvents().forEach(event => {
    const instructorId =
      event.extendedProps.instructorId;

    if (!instructorId) return;

    counts[instructorId] =
      (counts[instructorId] || 0) + 1;
  });

  const max =
    Math.max(
      1,
      ...Object.values(counts)
    );

  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, count]) => {

      const instructor =
        instructors.find(
          i => i.id === id
        );

      const color =
        getInstructorColor(id);

      const percent =
        (count / max) * 100;

      instructorWorkloadEl.innerHTML += `
        <div class="workload-card">
          <div class="workload-header">
            <span>${instructor?.name || id}</span>
            <strong>${count}</strong>
          </div>

          <div class="workload-bar">
            <div
              class="workload-fill"
              style="
                width:${percent}%;
                background:${color};
              "
            ></div>
          </div>
        </div>
      `;
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

document
  .getElementById("fixedPlacementImport")
  ?.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files?.[0];

      if (!file) return;

      const data =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(data);

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          sheet
        );

      console.log(
        "ROWS TO IMPORT:",
        rows
      );

      const res =
        await fetch(
          `${API_URL}/fixedPlacements/import`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(
              rows
            )
          }
        );

      console.log(
        "IMPORT STATUS:",
        res.status
      );

      if (!res.ok) {
        alert(
          "Import failed"
        );
        return;
      }

      alert(
        "Import complete"
      );

      await generateSchedule();
    }
  );

async function getConfiguredYear() {
  const response = await fetch(
    `${API_URL}/config/generation`
  );

  if (!response.ok) {
    return new Date().getFullYear();
  }

  const config =
    await response.json();

  return Number(
    config.year ||
    new Date().getFullYear()
  );
}

async function generateSchedule() {
  if (generateScheduleBtn) {
    generateScheduleBtn.disabled = true;
    generateScheduleBtn.textContent = "Generating...";
  }

  try {
    const res = await fetch(
      `${API_URL}/schedule`,
      {
        cache: "no-store"
      }
    );

    const data = await res.json();

    console.log(
      "Schedule API response:",
      data
    );

    console.log(
      "Is schedule an array?",
      Array.isArray(data)
    );

    console.log(
      "Logical slots returned by API:",
      Array.isArray(data)
        ? data.length
        : "Not an array"
    );

    if (!res.ok) {
      console.error(
        "Schedule request failed:",
        res.status,
        data
      );

      alert(
        data?.error ||
        "Failed to generate schedule."
      );

      return;
    }

    if (!Array.isArray(data)) {
      console.error(
        "Schedule API returned an invalid response:",
        data
      );

      alert(
        data?.error ||
        "The schedule API did not return an array."
      );

      return;
    }

    renderCalendarFromSchedule(
      data,
      true
    );

    console.log(
      "FullCalendar events rendered:",
      adminCalendar
        .getEvents()
        .length
    );

    applyInstructorFilter();
    renderInstructorWorkloadFromCalendar();
    renderScheduleAnalytics();

    console.log(
      "Generated schedule:",
      data
    );
  } catch (error) {
    console.error(
      "Generate schedule failed:",
      error
    );

    alert(
      "Failed to generate schedule."
    );
  } finally {
    if (generateScheduleBtn) {
      generateScheduleBtn.disabled = false;
      generateScheduleBtn.textContent =
        "Generate Schedule";
    }
  }
}

async function saveSchedule() {
  const year =
    await getConfiguredYear();

  await fetch(
    `${API_URL}/schedule/save`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        year,
        slots:
          serializeCalendarToSlots()
      })
    }
  );

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
  const year =
    await getConfiguredYear();

  const res = await fetch(
    `${API_URL}/schedule/load?year=${year}`
  );

  const data =
    await res.json();

  if (!data.slots?.length) {
    return false;
  }

  renderCalendarFromSchedule(
    data.slots,
    true
  );

  applyInstructorFilter();
  renderInstructorWorkloadFromCalendar();
  renderScheduleAnalytics();

  return true;
}
function getLogicalScheduleEvents() {
  const uniqueEvents = new Map();

  adminCalendar
    .getEvents()
    .forEach(event => {
      const props =
        event.extendedProps;

      const key = [
        props.classId ||
          props.className,
        props.location,
        props.weekStartDate,
        props.instructorId || ""
      ].join("|");

      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(
          key,
          event
        );
      }
    });

  return [
    ...uniqueEvents.values()
  ];
}

function renderScheduleAnalytics() {
 

  const events =
  getLogicalScheduleEvents();

  const instructorCounts = {};
  const locationCounts = {};
  const categoryCounts = {};
  const weekCounts = {};
const uniqueClasses = new Set();

  events.forEach(event => {
    const instructor =
      event.extendedProps.instructorId ||
      "Unassigned";

    const location =
      event.extendedProps.location ||
      "Unknown";

    const category =
      event.extendedProps.category ||
      "Unknown";

     const date = event.start;

const yearStart = new Date(
  date.getFullYear(),
  0,
  1
);

const week =
  Math.ceil(
    (
      (date - yearStart) /
      86400000 +
      yearStart.getDay() +
      1
    ) / 7
  );

    instructorCounts[instructor] =
      (instructorCounts[instructor] || 0) + 1;

    locationCounts[location] =
      (locationCounts[location] || 0) + 1;

    categoryCounts[category] =
      (categoryCounts[category] || 0) + 1;

    if (week) {
  const key = [
    week,
    event.extendedProps.className,
    event.extendedProps.location
  ].join("|");

  if (!uniqueClasses.has(key)) {
    uniqueClasses.add(key);

    weekCounts[week] =
      (weekCounts[week] || 0) + 1;
  }
}

  });
  const topInstructor =
  Object.entries(instructorCounts)
    .sort((a,b) => b[1] - a[1])[0];

const topLocation =
  Object.entries(locationCounts)
    .sort((a,b) => b[1] - a[1])[0];

const topCategory =
  Object.entries(categoryCounts)
    .sort((a,b) => b[1] - a[1])[0];
  const maxClassesInWeek =
    Math.max(
      0,
      ...Object.values(weekCounts)
    );

  const unassigned =
    instructorCounts.Unassigned || 0;

  scheduleAnalyticsEl.innerHTML = `
<div class="analytics-grid">

  <div class="analytics-card">
    <div class="analytics-value">
      ${events.length}
    </div>
    <div class="analytics-label">
      Total Classes
    </div>
  </div>

  <div class="analytics-card">
    <div class="analytics-value">
      ${unassigned}
    </div>
    <div class="analytics-label">
      Unassigned
    </div>
  </div>

  <div class="analytics-card">
    <div class="analytics-value">
      ${maxClassesInWeek}
    </div>
    <div class="analytics-label">
      Peak Week
    </div>
  </div>

  <div class="analytics-card">
    <div class="analytics-value">
      ${topInstructor?.[1] ?? 0}
    </div>
    <div class="analytics-label">
      Top Instructor
      <br>
      ${
  instructors.find(
    i => i.id === topInstructor?.[0]
  )?.name ||
  topInstructor?.[0] ||
  "-"
}
    </div>
  </div>

  <div class="analytics-card">
    <div class="analytics-value">
      ${topLocation?.[1] ?? 0}
    </div>
    <div class="analytics-label">
      Top Location
      <br>
      ${topLocation?.[0] ?? "-"}
    </div>
  </div>

  <div class="analytics-card">
    <div class="analytics-value">
      ${topCategory?.[1] ?? 0}
    </div>
    <div class="analytics-label">
      Top Category
      <br>
      ${topCategory?.[0] ?? "-"}
    </div>
  </div>

</div>
`;
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
  const fixedPlacementImportEl =
  document.getElementById(
    "fixedPlacementImport"
  );
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
  renderScheduleAnalytics();
  
};

    deleteEventBtn.onclick = () => {
      if (!selectedEvent) return;
      selectedEvent.remove();
      closeEditModal();
      renderInstructorWorkloadFromCalendar();
      renderScheduleAnalytics();
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
  showAllInstructorsEl,
  saveCatalogClass,
  renderScheduleAnalytics,
  goBack: () => window.location.href = "adminDashboard.html",
  openEditModal,
  closeEditModal,
  clearFixedPlacements,
  clearSchedule: () => {
    if (confirm("Are you sure you want to clear the schedule?")) {
      adminCalendar.removeAllEvents();
      renderInstructorWorkloadFromCalendar();
      renderScheduleAnalytics();
    }
  }
});
