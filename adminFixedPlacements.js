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
  if (!date) {
    return "";
  }

  // Firestore Timestamp
  if (date._seconds) {
    return new Date(
      date._seconds * 1000
    ).toLocaleDateString();
  }

  // Excel serial date
  if (
    typeof date === "number" ||
    /^\d+$/.test(String(date))
  ) {
    const excelDate =
      Number(date);

    const jsDate =
      new Date(
        (excelDate - 25569) *
          86400 *
          1000
      );

    return jsDate.toLocaleDateString();
  }

  // ISO yyyy-mm-dd
  if (
    typeof date === "string" &&
    date.match(
      /^\d{4}-\d{1,2}-\d{1,2}$/
    )
  ) {
    const [
      year,
      month,
      day
    ] = date.split("-");

    return `${month.padStart(2,"0")}/${day.padStart(2,"0")}/${year}`;
  }

  return String(date);
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