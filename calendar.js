import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

const backBtn = document.getElementById("backBtn");
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
const auth = getAuth(app);
const db = getFirestore(app);

let currentRole = null;

async function loadUserRole(user) {
  if (!user) {
    currentRole = null;
    return;
  }

  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn("User document not found for uid:", user.uid);
      currentRole = null;
      return;
    }

    currentRole = docSnap.data().role;
  } catch (error) {
    console.error("Failed to load role:", error);
    currentRole = null;
  }
}

onAuthStateChanged(auth, (user) => {
  loadUserRole(user);
});

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

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (!currentRole) {
        console.error("Unable to determine role. Please log in again.");
        return;
      }

      if (currentRole === "instructor") {
        window.location.href = "userDashboard.html";
      } else if (currentRole === "admin") {
        window.location.href = "adminDashboard.html";
      } else {
        console.warn("Unknown role:", currentRole);
      }
    });
  }
});

