import express from "express";
import cors from "cors";


import { generateSchedule } from "./src/engine/generateSchedule";
import { db } from "./firebase";


const app = express();
app.use(express.json());
/*const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://techub-9gis.onrender.com";
*/
app.use(cors({
  origin: [
    "http://localhost:5500",
    "https://dpbueno106-cyber.github.io"
  ]
}));


//  Helper

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

async function loadConfigFromFirestore() {
  const docSnap = await db.collection("config").doc("current").get();

  if (!docSnap.exists) return null;

  return docSnap.data();
}

async function loadCatalogFromFirestore() {
  const snapshot = await db.collection("catalog").get();
  return snapshot.docs.map(doc => doc.data());
}

async function loadInstructorsFromFirestore() {
  const snapshot = await db.collection("instructors").get();
  return snapshot.docs.map(doc => doc.data());
}
//  Routes
app.get("/schedule", async (req, res) => {
  try {
    const doc = await db.collection("schedules").doc("current").get();

    //  If saved schedule exists → return it
    if (doc.exists) {
      return res.json(doc.data()?.schedule ?? []);
    }

    //  Otherwise generate from Firestore data
    const config = await loadConfigFromFirestore();
    const catalog = await loadCatalogFromFirestore();
    const instructors = await loadInstructorsFromFirestore();

    if (!config || !catalog.length || !instructors.length) {
      return res.status(400).json({
        error: "Missing config, catalog, or instructors in Firestore"
      });
    }

    const schedule = generateSchedule(config, catalog, instructors);

    //  Save it immediately
    await db.collection("schedules").doc("current").set({
      schedule,
      updatedAt: new Date()
    });

    res.json(schedule);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

app.post("/clearSchedule", async (req, res) => {
  try {
    await db.collection("schedules").doc("current").delete();

    res.json({ message: "Schedule cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear schedule" });
  }
});
//  Start server (ONLY ONE)
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error("Port already in use");
  } else {
    console.error(err);
  }
});
