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

app.get("/schedule", async (req, res) => {
  try {
    const config = await loadConfigFromFirestore();
    const catalog = await loadCatalogFromFirestore();
    const instructors = await loadInstructorsFromFirestore();

    if (!config || !catalog.length || !instructors.length) {
      return res.status(400).json({
        error: "Missing config, catalog, or instructors in Firestore"
      });
    }

    const schedule = generateSchedule(config, catalog, instructors);
    res.json(schedule);
  } catch (err) {
    console.error("Schedule generation failed:", err);
    console.error("FULL ERROR:", err);
res.status(500).json({
  error: err instanceof Error ? err.stack : String(err)
});
  }
});

app.get("/catalog", async (_req, res) => {
  try {
    const snapshot = await db
      .collection("catalog")
      .where("isActive", "==", true)
      .get();

    const catalog = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(catalog);
  } catch (err) {
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