import express from "express";
import cors from "cors";
import type { ScheduleConfig } from "./src/types";

import { generateSchedule } from "./src/engine/generateSchedule";
import { db } from "./firebase";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "https://dpbueno106-cyber.github.io"
    ]
  })
);

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

/* =========================
   FIRESTORE LOADERS
========================= */

async function loadConfigFromFirestore(): Promise<ScheduleConfig | null> {
  const snap = await db.collection("config").doc("current").get();
  if (!snap.exists) return null;

  const data = snap.data();

  if (
    !data ||
    typeof data.year !== "number" ||
    typeof data.totalClasses !== "number" ||
    !Array.isArray(data.holidays)
  ) {
    return null;
  }

  return data as ScheduleConfig;
}

async function loadCatalogFromFirestore() {
  const snapshot = await db.collection("catalog").get();
  return snapshot.docs.map((doc: any) => doc.data());
}

async function loadInstructorsFromFirestore() {
  const snapshot = await db.collection("instructors").get();
  return snapshot.docs.map((doc: any) => doc.data());
}

/* =========================
   ROUTES
========================= */

app.get("/schedule", async (req, res) => {
  try {
    // Return saved schedule if it exists
    const saved = await db.collection("schedules").doc("current").get();
    if (saved.exists) {
      return res.json(saved.data()?.schedule ?? []);
    }

    // Load Firestore data
    const config = await loadConfigFromFirestore();
    const catalog = await loadCatalogFromFirestore();
    const instructors = await loadInstructorsFromFirestore();

    if (!config || !catalog.length || !instructors.length) {
      return res.status(400).json({
        error: "Missing config, catalog, or instructors in Firestore"
      });
    }

    console.log("Firestore data snapshot:", {
      config,
      catalogCount: catalog.length,
      instructorCount: instructors.length
    });

    // Generate schedule
    const schedule = generateSchedule(config, catalog, instructors);

    // Save immediately
    await db.collection("schedules").doc("current").set({
      schedule,
      updatedAt: new Date()
    });

    res.json(schedule);
  } catch (err) {
    console.error("Schedule generation failed:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// Clear saved schedule (admin use)
app.post("/clearSchedule", async (req, res) => {
  try {
    await db.collection("schedules").doc("current").delete();
    res.json({ message: "Schedule cleared" });
  } catch (err) {
    console.error("Failed to clear schedule:", err);
    res.status(500).json({ error: "Failed to clear schedule" });
  }
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error("Port already in use");
  } else {
    console.error("Server error:", err);
  }
});
