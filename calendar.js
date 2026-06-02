document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },

    // ✅ Placeholder events (for now)
    events: [
      {
        title: "Teaching",
        start: "2026-03-18T09:00:00",
        end: "2026-03-18T11:00:00"
      },
      {
        title: "Teaching",
        start: "2026-03-19T13:00:00",
        end: "2026-03-19T15:00:00"
      }
    ]
  });

  calendar.render();
});

const backBtn = document.getElementById("backBtn");
backBtn.addEventListener("click", () => {
  windows.location.href="adminDashboard.html";
})
