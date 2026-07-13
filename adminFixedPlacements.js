const API_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://techub-9gis.onrender.com";

async function loadFixedPlacements() {

  const res = await fetch(
    `${API_URL}/fixedPlacements`
  );

  const placements = await res.json();
  console.log("LOADED PLACEMENTS:",placements);
  const tbody =
    document.querySelector(
      "#fixedPlacementTable tbody"
    );

  const emptyMessage =
    document.getElementById(
      "emptyMessage"
    );

  tbody.innerHTML = "";

  if (placements.length === 0) {

    emptyMessage.style.display =
      "block";

    return;
  }

  emptyMessage.style.display =
    "none";

  placements.forEach(p => {

    tbody.innerHTML += `
      <tr>
        <td>${p.className}</td>
        <td>${formatDate(p.weekStartDate)}</td>
        <td>${p.location}</td>
        <td>${p.instructorName ?? ""}</td>

        <td>
          <button
            class="deleteBtn"
            onclick="deleteFixedPlacement('${p.id}')"
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}


async function deleteFixedPlacement(id) {

  if (
    !confirm(
      "Delete this fixed placement?"
    )
  ) {
    return;
  }

  await fetch(
    `${API_URL}/fixedPlacements/${id}`,
    {
      method: "DELETE"
    }
  );

  loadFixedPlacements();
}





async function deleteAllFixedPlacements() {

  if (
    !confirm(
      "Delete ALL fixed placements?"
    )
  ) {
    return;
  }

  await fetch(
    `${API_URL}/fixedPlacements`,
    {
      method: "DELETE"
    }
  );

  loadFixedPlacements();
}



function formatDate(date) {

  if (!date) return "";

  if (date._seconds) {

    return new Date(
      date._seconds * 1000
    ).toLocaleDateString();
  }

  return new Date(date)
    .toLocaleDateString();
}

function goBack() {
  window.location.href =
    "adminScheduleManagement.html";
}

window.addEventListener(
  "DOMContentLoaded",
  loadFixedPlacements
);

Object.assign(window, {
  deleteFixedPlacement,
  deleteAllFixedPlacements,
  goBack
});