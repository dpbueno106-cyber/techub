
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system",
  storageBucket: "techub-login-system.firebasestorage.app",
  messagingSenderId: "48424106638",
  appId: "1:48424106638:web:9246d83f302b21ab0327df",
  measurementId: "G-PQ5RJ1V0BB"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const backBtn = document.getElementById("backBtn");

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

backBtn.addEventListener("click", () => {
  if (!docSnap || !docSnap.exists()) {
    console.error("User document not found");
    return;
  }

  const role = docSnap.data().role;
  console.log("ROLE:", role);

  if (role === "instructor") {
    window.location.href = "userDashboard.html";
  } else if (role === "admin") {
    window.location.href = "adminDashboard.html";
  } else {
    console.warn("Unknown role:", role);
  }
});

