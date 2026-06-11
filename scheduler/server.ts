import express, { type Request, type Response, type NextFunction } from "express";
import { config, catalog, instructors } from "./src/data.ts";
import { generateSchedule } from "./src/engine/generateSchedule.ts";
import { db } from "./firebase.ts";

const app = express();
const PORT = 3000;

//  Middleware
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

function addInstructorNames(schedule: any[]) {
  return schedule.map(slot => {
    const instructorMap = new Map(instructors.map(i => [i.id, i.name]));
    const instructor = instructorMap.get(slot.instructorId);
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
//let savedSchedule: any[] = [];

app.get("/catalog", (req, res) => {
  res.json(catalog);
});

app.get("/instructors", (req, res) => {
  res.json(instructors);
});

app.post("/saveSchedule", async (req, res) => {
  try {

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Invalid schedule format" });
  }

  await db.collection("schedules").doc("current").set({
     schedule: req.body,
     updatedAt: new Date() 
    });
    res.json({ message: "Schedule saved successfully" });

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