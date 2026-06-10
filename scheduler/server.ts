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
  { id: "afa", name: "Applied Failure Analysis", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "multitool", name: "MultiTool Plus Diagnostic Platform", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "electrical-i", name: "Electrical Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 10, isActive: true },
  { id: "electrical-ii", name: "Advanced Electrical", category: "MFC", level: "Advanced", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "engines-1", name: "Diesel Engine Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 9, isActive: true },
  { id: "intro-to-emission", name: "Tier 4 Final Emissions Systems", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "epg-1", name: "Electrical Power Generation Fundamentals: Core System", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 6, isActive: true },
  { id: "common-rail-fuel-systems", name: "Common Rail Fuel Systems Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "heui-fuel-systems", name: "HEUI Fuel Systems Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "ac-train-cert-mac", name: "Mobile Air Conditioning with Section 609 Certification", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 6, isActive: true },
  { id: "hydraulic-1", name: "Hydraulic Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 10, isActive: true },
  { id: "hydraulic-ii", name: "Advanced Hydraulics", category: "MFC", level: "Advanced", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "sos-interpretation", name: "SOS Interpretation Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "general-maintenance", name: "General Maintenance", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 9, isActive: true },
  { id: "contamination-control", name: "Contamination Control", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "cornerstone-training", name: "Navigating Technical Training in Cornerstone", category: "NTO", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 4, isActive: true },
  { id: "channel-1-usage", name: "Navigating Channel 1 Platform", category: "NTO", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 4, isActive: true },
  { id: "new-hire-technician-onboarding", name: "New Hire Technician Onboarding", category: "NTO", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 10, isActive: true },
  { id: "new-product-introduction", name: "Product Introduction", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 6, isActive: true },
  { id: "product-recognition", name: "Product Identification Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 6, isActive: true },
  { id: "powertrain-1", name: "Powertrain Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 9, isActive: true },
  { id: "electric-drive", name: "Electric Drive Systems", category: "MFC", level: "Advanced", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "basic-machine-operation", name: "Basic Machine Movement and Pre-Operation Safety", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "seals-gaskets", name: "Seals & Gaskets Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 6, isActive: true },
  { id: "sis-2-0", name: "System Information System (SIS) 2.0 Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "service-report", name: "Service Report Writing Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "technology-1", name: "Technology Fundamentals", category: "DEV", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "command", name: "CAT Command Remote Control Systems", category: "DEV", level: "Advanced", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 5, isActive: true },
  { id: "team-dynamics", name: "Team Dynamics", category: "DEV", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 4, isActive: true },
  { id: "mfc-ops", name: "MacAllister Family Companies Operations", category: "DEV", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 4, isActive: true },
  { id: "troubleshooting-1", name: "Troubleshooting Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true },
  { id: "troubleshooting-2", name: "Advanced Troubleshooting", category: "MFC", level: "Advanced", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 7, isActive: true },
  { id: "welding-metal-handling", name: "Welding & Metal Handling Fundamentals", category: "MFC", level: "Foundational", durationWeeks: 1, defaultLocations: ["IN", "MI"], frequencyMode: "WEIGHT", frequencyWeight: 8, isActive: true }
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