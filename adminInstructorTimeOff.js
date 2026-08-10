const API_URL =
    window.location.hostname.includes(
        "localhost"
    )
        ? "http://localhost:3000"
        : "https://techub-9gis.onrender.com";

window.addEventListener(
    "DOMContentLoaded",
    async () => {
        await loadInstructors();
        await loadTimeOff();
    }
);
let selectedInstructors = [];
let instructors = [];
async function loadInstructors() {

    try {

        const response =
            await fetch(
                `${API_URL}/instructors`
            );

       instructors =
    await response.json();

        const container =
            document.getElementById(
                "instructorSelector"
            );

        container.innerHTML = "";

        instructors
            .sort((a, b) =>
                (a.name)
                    .localeCompare(
                        b.name
                    )
            )
            .forEach(instructor => {

                const chip =
                    document.createElement(
                        "div"
                    );

                chip.className =
                    "instructorChip";

                chip.textContent =
                    instructor.name;

                chip.dataset.id =
                    instructor.id;

                chip.addEventListener(
                    "click",
                    () => {

                        chip.classList.toggle(
                            "selected"
                        );

                        if (
                            chip.classList.contains(
                                "selected"
                            )
                        ) {

                            selectedInstructors.push(
                                instructor.id
                            );

                        } else {

                            selectedInstructors =
                                selectedInstructors.filter(
                                    id =>
                                        id !== instructor.id
                                );
                        }
                    }
                );

                container.appendChild(
                    chip
                );
            });

    } catch (error) {

        console.error(
            "Failed to load instructors",
            error
        );
    }
}


async function addTimeOff() {

    const instructorIds =
        [...selectedInstructors];


    const startDate =
        document.getElementById(
            "startDate"
        ).value;

    const endDate =
        document.getElementById(
            "endDate"
        ).value;

    const reason =
        document
            .getElementById(
                "reason"
            )
            .value.trim();

    if (
        instructorIds.length === 0
    ) {
        alert(
            "Select at least one instructor."
        );
        return;
    }

    if (!startDate) {
        alert(
            "Please select a start date."
        );
        return;
    }

    if (!endDate) {
        alert(
            "Please select an end date."
        );
        return;
    }

    if (endDate < startDate) {
        alert(
            "End date cannot be before start date."
        );
        return;
    }

    try {await Promise.all(
    instructorIds.map(
        instructorId => {

            const instructor =
                instructors.find(
                    i => i.id === instructorId
                );

            return fetch(
                `${API_URL}/instructorTimeOff`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        instructorId,
                        instructorName:
                            instructor?.name ??
                            instructorId,
                        startDate,
                        endDate,
                        reason
                    })
                }
            );
        }
    )
);


        document.getElementById(
            "startDate"
        ).value = "";

        document.getElementById(
            "endDate"
        ).value = "";

        document.getElementById(
            "reason"
        ).value = "";

        selectedInstructors = [];

        document
            .querySelectorAll(
                ".instructorChip"
            )
            .forEach(chip => {
                chip.classList.remove(
                    "selected"
                );
            });

        await loadTimeOff();

    } catch (error) {

        console.error(error);

        alert(
            "Failed to save time off."
        );
    }
}

async function loadTimeOff() {

    try {

        const response =
            await fetch(
                `${API_URL}/instructorTimeOff`
            );

        const entries =
            await response.json();

        buildSummary(entries);

        renderTimeOffList(entries);

    } catch (error) {

        console.error(
            "Failed to load time off",
            error
        );
    }
}

function buildSummary(entries) {

    const summaryContainer =
        document.getElementById(
            "summaryContainer"
        );

    summaryContainer.innerHTML = "";

    const counts =
        new Map();

    entries.forEach(entry => {

        const days =
            calculateDays(
                entry.startDate,
                entry.endDate
            );

        const instructorName =
    entry.instructorName ??
    entry.instructorId;

        if (instructorName) {
    counts.set(
        instructorName,
        (counts.get(instructorName) ?? 0) +
        days
    );
}
    });

    const sorted =
        [...counts.entries()]
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );

    sorted.forEach(
        ([instructorName, days]) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "summaryCard";

            card.innerHTML = `
        <h3>${instructorName}</h3>
        <div class="days">
          ${days} Day${days === 1
                    ? ""
                    : "s"
                }
        </div>
      `;

            summaryContainer.appendChild(
                card
            );
        }
    );
}

function renderTimeOffList(
    entries
) {
    const container =
    document.getElementById(
        "timeOffList"
    );

container.innerHTML = "";
    const grouped =
    new Map();

entries.forEach(entry => {

    const key =
        entry.instructorName ??
        entry.instructorId;

    if (!grouped.has(key)) {
        grouped.set(key, []);
    }

    grouped.get(key).push(entry);
});
grouped.forEach(
    (records, instructorName) => {
records.sort(
    (a, b) =>
        a.startDate.localeCompare(
            b.startDate
        )
);

        const totalDays =
            records.reduce(
                (sum, record) =>
                    sum +
                    calculateDays(
                        record.startDate,
                        record.endDate
                    ),
                0
            );

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "timeOffCard";
            card.innerHTML = `
<div class="timeOffHeader">

    <div>
        <strong>
            ${instructorName}
        </strong>

        <div class="dates">
            ${records.length}
            Request${
                records.length === 1
                    ? ""
                    : "s"
            }
            •
            ${totalDays}
            Days
        </div>
    </div>

    <span class="expandIcon">
        ▼
    </span>

</div>

<div
    class="timeOffDetails"
    style="display:none;"
>

${records.map(record => `
    <div class="ptoEntry">

    <div class="ptoDates">
        ${formatDate(record.startDate)}
        -
        ${formatDate(record.endDate)}
    </div>

    <div class="ptoReason">
        ${record.reason ||
        "No Reason Provided"}
    </div>

        <button
            class="dangerBtn"
            onclick="deleteTimeOff('${record.id}')"
        >
            Delete
        </button>

    </div>
`).join("")}

</div>
`;
const header =
    card.querySelector(
        ".timeOffHeader"
    );

const details =
    card.querySelector(
        ".timeOffDetails"
    );

const icon =
    card.querySelector(
        ".expandIcon"
    );

header.addEventListener(
    "click",
    () => {

        const open =
            details.style.display ===
            "block";

        details.style.display =
            open
                ? "none"
                : "block";

        icon.textContent =
            open
                ? "▼"
                : "▲";
    }
);

container.appendChild(card);
}
);
}


async function deleteTimeOff(
    id
) {

    if (
        !confirm(
            "Delete this time off request?"
        )
    ) {
        return;
    }

    try {

        await fetch(
            `${API_URL}/instructorTimeOff/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadTimeOff();
        

    } catch (error) {

        console.error(error);

        alert(
            "Failed to delete."
        );
    }
}

function calculateDays(
    startDate,
    endDate
) {

    const start =
        new Date(startDate);

    const end =
        new Date(endDate);

    const diff =
        end.getTime() -
        start.getTime();

    return (
        Math.floor(
            diff /
            (1000 * 60 * 60 * 24)
        ) + 1
    );
}

function formatDate(
    dateString
) {

    if (!dateString) {
        return "";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return (
        date.getMonth() +
        1
    )
        .toString()
        .padStart(2, "0") +
        "/" +
        date
            .getDate()
            .toString()
            .padStart(2, "0") +
        "/" +
        date.getFullYear();
}

Object.assign(window, {
    addTimeOff,
    deleteTimeOff,
});
