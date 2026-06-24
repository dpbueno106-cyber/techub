import express, { Request, Response } from "express";
import { generateSchedule } from "./engine/generateSchedule";
import {
  loadConfigFromFirestore,
  loadCatalogFromFirestore,
  loadInstructorsFromFirestore
} from "./firestoreLoaders";
import type { Instructor } from "./types";

const app = express();
app.use(express.json());

app.get("/schedule", async (_req: Request, res: Response) => {
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

    const schedule = generateSchedule(
      config,
      catalog,
      instructors ?? []
    );

    const instructorById = new Map<string, string>(
      (instructors ?? []).map((i: Instructor) => [i.id, i.name])
    );

    const formattedSchedule = schedule.map(slot => ({
      weekStartDate: slot.weekStartDate,
      classId: slot.classId,
      className: slot.className,
      location: slot.location,
      instructorId: slot.instructorId ?? null,
      instructorName: slot.instructorId
        ? instructorById.get(slot.instructorId) ?? "Unknown"
        : "TBD",
      durationWeeks: slot.durationWeeks,
      category: slot.category
    }));

    res.json(formattedSchedule);
  } catch (err) {
    console.error("Schedule generation failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch schedule"
    });
  }
});
