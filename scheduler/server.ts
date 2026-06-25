import express from "express";
import cors from "cors";
import { generateSchedule } from "./src/engine/generateSchedule";
import {
  loadConfigFromFirestore,
  loadCatalogFromFirestore,
  loadInstructorsFromFirestore
} from "./src/firestoreLoaders";
import { db } from "./firebase";

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

// =========================
// ROUTES
// =========================
app.delete("/catalog/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection("catalog").doc(id).update({
      isActive: false
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete catalog item", err);
    res.status(500).json({ error: "Failed to remove course" });
  }
});
app.get("/schedule", async (_req, res) => {
  try {
    const config = await loadConfigFromFirestore();
    const catalog = await loadCatalogFromFirestore();
    const instructors = await loadInstructorsFromFirestore();

    if (!config) {
      return res.status(404).json({
        error: "Generation config not found"
      });
    }

    if (!catalog.length) {
      return res.status(400).json({
        error: "Catalog is empty"
      });
    }

    //  Instructors may be empty — engine can handle this
    const schedule = generateSchedule(
      config,
      catalog,
      instructors ?? []
    );

    res.json(schedule);
  } catch (err) {
    console.error("Schedule generation failed:", err);

    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch schedule"
    });
  }
});

app.get("/schedule/load", async (req, res) => {
  const year = req.query.year;
  const doc = await db.collection("schedules").doc(String(year)).get();

  if (!doc.exists) {
    return res.json({ slots: [] });
  }

  res.json(doc.data());
});

app.post("/schedule/save", async (req, res) => {
  const { year, slots } = req.body;

  await db.collection("schedules").doc(String(year)).set({
    year,
    slots,
    updatedAt: new Date()
  });

  res.json({ success: true });
});

app.get("/catalog", async (_req, res) => {
  try {
    const snapshot = await db
      .collection("catalog")
      .where("isActive", "==", true)
      .get();

    res.json(
      snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to load catalog" });
  }
});

app.post("/catalog", async (req, res) => {
  try {
    const {
      name,
      category,
      durationWeeks,
      defaultLocations,
      frequencyMode,
      frequencyWeight
    } = req.body;

    if (
      !name ||
      !["NTO", "Foundational", "Advanced"].includes(category) ||
      typeof durationWeeks !== "number" ||
      !Array.isArray(defaultLocations)
    ) {
      return res.status(400).json({ error: "Invalid catalog data" });
    }

    await db.collection("catalog").add({
      name,
      category,
      durationWeeks,
      defaultLocations,
      frequencyMode,
      frequencyWeight,
      isActive: true,
      createdAt: new Date()
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save catalog class" });
  }
});

app.post("/clearSchedule", async (_req, res) => {
  await db.collection("schedules").doc("current").delete();
  res.json({ message: "Schedule cleared" });
});

// =========================
// SERVER START
// =========================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});