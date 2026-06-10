let currentSchedule = [];

function goBack() {
  window.location.href = "adminDashboard.html";
}
async function generateSchedule() {
  try {
    const response = await fetch("http://localhost:3000/schedule");
    const schedule = await response.json();
    currentSchedule = schedule;
    renderSchedule(schedule);
  } catch (err) {
    console.error("Error fetching schedule:", err);
  }
}


function renderSchedule(schedule) {
  const container = document.getElementById("scheduleContainer");
  container.innerHTML = "";

  //  Group by week
  const weeks = {};

  schedule.forEach(slot => {
    if (!weeks[slot.weekNumber]) {
      weeks[slot.weekNumber] = [];
    }
    weeks[slot.weekNumber].push(slot);
  });

  //  Render each week as a column
  Object.keys(weeks)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(weekNumber => {

      const weekCol = document.createElement("div");
      weekCol.className = "weekColumn";

      weekCol.innerHTML = `<h3>Week ${weekNumber}</h3>`;

      weeks[weekNumber].forEach((slot, index) => {

        const card = document.createElement("div");
        card.className = `scheduleCard ${slot.location}`;

        card.innerHTML = `
  <div class="cardHeader">
    ${slot.location}
  </div>

  <div class="className">
    ${slot.className}
  </div>

  <div class="assigned">
    Assigned: 
    <span id="assigned-${weekNumber}-${index}">
      ${slot.instructorId || "None"}
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

  return slot.recommendedInstructors.map(r => `
    <option value="${r.id}">
      ${r.id} (score: ${r.score})
    </option>
  `).join("");
}
function updateInstructorByWeek(weekNumber, index, instructorId) {

  const span = document.getElementById(
    `assigned-${weekNumber}-${index}`
  );

  span.textContent = instructorId;

  // ✅ Update your stored data too
  const slot = currentSchedule.find(
    (s, i) =>
      s.weekNumber == weekNumber &&
      currentSchedule
        .filter(x => x.weekNumber == weekNumber)[index] === s
  );

  if (slot) {
    slot.instructorId = instructorId;
  }

  console.log("Updated", weekNumber, index, instructorId);
}

async function saveSchedule() {
  try {
    await fetch("http://localhost:3000/saveSchedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(currentSchedule)
    });

    alert("Schedule saved!");
  } catch (err) {
    console.error("Error saving schedule:", err);
  }
}
