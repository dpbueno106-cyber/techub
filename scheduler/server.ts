import express from "express";
import cors from "cors";

import { config, catalog, instructors } from "./src/data";
import { generateSchedule } from "./src/engine/generateSchedule";
import { db } from "./firebase";

const app = express();

/*const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://techub-9gis.onrender.com";

app.use(express.json());
*/
// 🔹 Helper
function addInstructorNames(schedule: any[]) {
  return schedule.map(slot => {
    const instructor = instructors.find(i => i.id === slot.instructorId);

    const namedRecommended = slot.recommendedInstructors?.map((item: any) => {
      const id = typeof item === "string" ? item : item.id;
      const found = instructors.find(i => i.id === id);

      return {
        ...(typeof item === "string" ? { id } : item),
        name: found?.name || id
      };
    });

    return {
      ...slot,
      instructorName: instructor?.name ?? slot.instructorName ?? null,
      recommendedInstructors: namedRecommended ?? slot.recommendedInstructors
    };
  });
}

// 🔹 Routes
app.get("/schedule", async (req, res) => {
  try {
    const doc = await db.collection("schedules").doc("current").get();

    if (doc.exists) {
      return res.json(addInstructorNames(doc.data()?.schedule ?? []));
    }

    const schedule = generateSchedule(config, catalog, instructors);
    res.json(addInstructorNames(schedule));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

app.get("/catalog", (req, res) => res.json(catalog));
app.get("/instructors", (req, res) => res.json(instructors));

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
``