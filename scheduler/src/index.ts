import express, { Request, Response } from "express";
import { generateSchedule } from "./engine/generateSchedule";
import { verifyAdmin } from "./middleware/verifyAdmin";
import {
  loadConfigFromFirestore,
  loadCatalogFromFirestore,
  loadInstructorsFromFirestore,
  attachPossibleInstructors
} from "./firestoreLoaders";
import type { Instructor } from "./types";


/* for anyone whose reading this, this entire file is dead code. however, I'm leaving it here for now because it was a useful reference for how to wire up the schedule generation code to an express endpoint. Ignore this file if your trying to make edits to the actual scheduler code. */
const app = express();
app.use(express.json());

app.get("/schedule", verifyAdmin, async (_req: Request, res: Response) => {
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
    
const catalogWithPossibleInstructors =
  attachPossibleInstructors(catalog, instructors);

    const schedule = generateSchedule(
      config,
      catalogWithPossibleInstructors,
      instructors ?? []
    );

    const instructorById = new Map<string, string>(
  (instructors ?? []).map((i: Instructor) => [
    i.id,
    i.name || i.email || "Unknown"
  ])
);

    const formattedSchedule = schedule.map(slot => ({
      ...slot,
      instructorName: slot.instructorId
        ? instructorById.get(slot.instructorId) ?? "Unknown"
        : "TBD"
    }));

    res.json(formattedSchedule);
  } catch (err) {
    console.error("Schedule generation failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch schedule"
    });
  }
});