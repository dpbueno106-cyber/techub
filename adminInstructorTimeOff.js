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

async function loadInstructors() {
    try {

        console.log("Loading instructors...");

        const response = await fetch(
            `${API_URL}/instructors`
        );

        const data =
    await response.json();

console.log(
  "Raw instructor response:",
  JSON.stringify(
    data,
    null,
    2
  )
);

        const select =
            document.getElementById(
                "instructors"
            );

        console.log(
            "Select:",
            select
        );

        select.innerHTML = "";

        data.forEach(
            instructor => {

                console.log(
                    "Instructor row:",
                    instructor
                );

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    instructor.id;

                option.textContent =
                    `${instructor.name}`;

                select.appendChild(
                    option
                );
            }
        );

        console.log(
            "Options created:",
            select.options.length
        );

    } catch (error) {

        console.error(
            "Failed to load instructors",
            error
        );
    }
}


async function addTimeOff() {

    const instructorIds =
        Array.from(
            document.getElementById(
                "instructors"
            ).selectedOptions
        ).map(
            option => option.value
        );

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

    try {

        await fetch(
            `${API_URL}/instructorTimeOff`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    instructorIds,
                    startDate,
                    endDate,
                    reason
                })
            }
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

        document.getElementById(
            "instructors"
        ).selectedIndex = -1;

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

        (
            entry.instructorIds ?? []
        ).forEach(id => {

            counts.set(
                id,
                (counts.get(id) ?? 0) +
                days
            );

        });

    });

    const sorted =
        [...counts.entries()]
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );

    sorted.forEach(
        ([instructorId, days]) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "summaryCard";

            card.innerHTML = `
        <h3>${instructorId}</h3>
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

    entries.sort(
        (a, b) =>
            a.startDate.localeCompare(
                b.startDate
            )
    );

    entries.forEach(entry => {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "timeOffCard";

        const instructorText =
            (
                entry.instructorIds ??
                []
            ).join(", ");

        card.innerHTML = `
      <strong>
        ${instructorText}
      </strong>

      <div class="dates">
        ${formatDate(
            entry.startDate
        )}
        -
        ${formatDate(
            entry.endDate
        )}
      </div>

      <div class="reason">
        ${entry.reason ||
            "No reason provided"
            }
      </div>

      <br>

      <button
        class="dangerBtn"
        onclick="deleteTimeOff('${entry.id}')"
      >
        Delete
      </button>
    `;

        container.appendChild(
            card
        );
    });
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
    deleteTimeOff
});
