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

  schedule.forEach((slot, index) => {

    const card = document.createElement("div");
    card.className = "scheduleCard";

    card.innerHTML = `
      <h3>Week ${slot.weekNumber} - ${slot.location}</h3>
      <p><strong>Class:</strong> ${slot.className}</p>
      <p><strong>Assigned:</strong> <span id="assigned-${index}">
        ${slot.instructorId || "None"}
      </span></p>

      <label>Change Instructor:</label>
      <select onchange="updateInstructor(${index}, this.value)">
        ${buildOptions(slot)}
      </select>
    `;
    card.classList.add(slot.location);
    container.appendChild(card);
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
function updateInstructor(index, instructorId) {

  const assignedSpan = document.getElementById(`assigned-${index}`);
  assignedSpan.textContent = instructorId;

  // ✅ Update local schedule data
  currentSchedule[index].instructorId = instructorId;

  console.log("Updated slot", index, "→", instructorId);
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
