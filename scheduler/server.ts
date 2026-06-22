import express from "express";
import cors from "cors";
import { generateSchedule } from "./src/engine/generateSchedule";
import { db } from "./firebase";

import type {
  ScheduleConfig,
  ClassDefinition,
  ClassCategory,
  Location,
  Instructor
} from "./src/types";

const app = express();
app.disable("x-powered-by");
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
   TYPE GUARDS
========================= */
function toFrequencyMode(value: unknown): "WEIGHT" | "MIN_MAX" {
  // Map Firestore semantics to engine semantics
  if (value === "recurring") return "WEIGHT";
  if (value === "once") return "MIN_MAX";

  // Default behavior if missing
  return "WEIGHT";
}
function isClassCategory(value: unknown): value is ClassCategory {
  return (
    value === "technical" ||
    value === "safety" ||
    value === "onboarding" ||
    value === "product" ||
    value === "other"
  );
}

function isLocation(value: unknown): value is Location {
  return value === "IN" || value === "MI";
}

/**
 * IMPORTANT:
 * We infer the level type from ClassDefinition itself.
 * This avoids referencing a non‑existent ClassLevel symbol.
 */
function isValidLevel(
  value: unknown
): value is ClassDefinition["level"] {
  return typeof value === "number";
}

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

async function loadCatalogFromFirestore(): Promise<ClassDefinition[]> {
  const snapshot = await db.collection("catalog").get();

  return snapshot.docs.map(doc => {
    const data = doc.data();

    if (
      typeof data.name !== "string" ||
      !isClassCategory(data.category) ||
      !isValidLevel(data.level) ||
      typeof data.durationWeeks !== "number" ||
      !isLocation(data.location)
    ) {
      throw new Error(`Invalid catalog entry: ${doc.id}`);
    }

    return {
      id: doc.id,
      name: data.name,
      category: data.category,
      level: data.level,
      durationWeeks: data.durationWeeks,
      location: data.location,
      instructorRequired: Boolean(data.instructorRequired),

      defaultLocations: Array.isArray(data.defaultLocations)
        ? data.defaultLocations.filter(isLocation)
        : [data.location],

      frequencyMode: toFrequencyMode(data.frequencyMode),

      isActive: data.isActive !== false
    };
  });
}

async function loadInstructorsFromFirestore(): Promise<Instructor[]> {
  const snapshot = await db.collection("instructors").get();

  return snapshot.docs.map(doc => {
    const data = doc.data();

    if (
      typeof data.name !== "string" ||
      !isLocation(data.homeLocation) ||
      typeof data.canTravel !== "boolean"
    ) {
      throw new Error(`Invalid instructor entry: ${doc.id}`);
    }

    return {
      id: doc.id,
      name: data.name,
      homeLocation: data.homeLocation,
      canTravel: data.canTravel
    };
  });
}

/* =========================
   ROUTES
========================= */

app.get("/schedule", async (_req, res) => {
  try {
    const saved = await db.collection("schedules").doc("current").get();
    if (saved.exists) {
      return res.json(saved.data()?.schedule ?? []);
    }

    const config = await loadConfigFromFirestore();
    const catalog = await loadCatalogFromFirestore();
    const instructors = await loadInstructorsFromFirestore();

    if (!config || !catalog.length || !instructors.length) {
      return res.status(400).json({
        error: "Missing config, catalog, or instructors in Firestore"
      });
    }

    const schedule = generateSchedule(config, catalog, instructors);

    await db.collection("schedules").doc("current").set({
      schedule,
      updatedAt: new Date()
    });

    await db.collection("scheduleHistory").add({
      schedule,
      source: "generated",
      createdAt: new Date()
    });

    res.json(schedule);
  } catch (err) {
    console.error("Schedule generation failed:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

app.post("/saveSchedule", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid schedule payload" });
    }

    await db.collection("schedules").doc("current").set({
      schedule: req.body,
      updatedAt: new Date()
    });

    await db.collection("scheduleHistory").add({
      schedule: req.body,
      source: "manual-save",
      createdAt: new Date()
    });

    res.json({ message: "Schedule saved successfully" });
  } catch (err) {
    console.error("Failed to save schedule:", err);
    res.status(500).json({ error: "Failed to save schedule" });
  }
});

app.post("/clearSchedule", async (_req, res) => {
  try {
    await db.collection("schedules").doc("current").delete();

    await db.collection("scheduleHistory").add({
      action: "cleared",
      createdAt: new Date()
    });

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
