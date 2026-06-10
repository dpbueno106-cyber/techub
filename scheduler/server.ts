import express, { type Request, type Response, type NextFunction } from "express";
import type { ClassDefinition, Instructor } from "./src/types.ts";
import { generateSchedule } from "./src/engine/generateSchedule.ts";
import { db } from "./firebase.ts";

const app = express();
const PORT = 3000;

//  Middleware
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

//  Mock data (temporary)
const config = {
  year: 2026,
  totalClasses: 147,
  holidays: []
};

const catalog: ClassDefinition[] = [
  {
    id: "basic",
    name: "Basic Hydraulics",
    category: "MFC",
    level: "Foundational",
    durationWeeks: 1,
    defaultLocations: ["IN", "MI"],
    frequencyMode: "WEIGHT",
    frequencyWeight: 10,
    isActive: true
  }
];

const instructors: Instructor[] = [
  { id: "aaron", name: "Aaron", homeLocation: "IN", canTravel: true },
  { id: "jesse", name: "Jesse", homeLocation: "MI", canTravel: true },
  { id: "marc", name: "Marc", homeLocation: "MI", canTravel: true },
  { id: "leon", name: "Leon", homeLocation: "IN", canTravel: true },
  { id: "mike", name: "Mike", homeLocation: "IN", canTravel: false },
  { id: "brandon", name: "Brandon", homeLocation: "MI", canTravel: true },
  { id: "brad", name: "Brad", homeLocation: "MI", canTravel: true },
  { id: "graham", name: "Graham", homeLocation: "MI", canTravel: true },
  { id: "kalob", name: "Kalob", homeLocation: "MI", canTravel: true }
];

function addInstructorNames(schedule: any[]) {
  return schedule.map(slot => {
    const instructor = instructors.find(i => i.id === slot.instructorId);
    const namedRecommended = slot.recommendedInstructors?.map((item: any) => ({
      ...item,
      name: instructors.find(i => i.id === item.id)?.name || item.id
    }));

    return {
      ...slot,
      instructorName: instructor?.name ?? slot.instructorName ?? null,
      recommendedInstructors: namedRecommended ?? slot.recommendedInstructors
    };
  });
}

// Route
app.get("/schedule", async (req, res) => {
  try {

    const doc = await db.collection("schedules").doc("current").get();

    //  If saved schedule exists → return it
    if (doc.exists) {
      return res.json(addInstructorNames(doc.data()?.schedule ?? []));
    }

    // Otherwise generate new
    const schedule = generateSchedule(config, catalog, instructors);
    res.json(addInstructorNames(schedule));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});
let savedSchedule: any[] = [];

app.post("/saveSchedule", async (req, res) => {
  try {

    await db.collection("schedules").doc("current").set({
      schedule: req.body,
      updatedAt: new Date()
    });

    res.json({ message: "Saved successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save schedule" });
  }
});

// Start server safely
const server = app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});

// Handle port-in-use cleanly
server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(" Port 3000 already running.");
    console.error(" You already have a server open — do NOT run again.");
  } else {
    console.error(err);
  }
});