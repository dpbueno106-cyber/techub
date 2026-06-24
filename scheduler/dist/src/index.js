"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generateSchedule_1 = require("./engine/generateSchedule");
const firestoreLoaders_1 = require("./firestoreLoaders");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/schedule", async (_req, res) => {
    try {
        const config = await (0, firestoreLoaders_1.loadConfigFromFirestore)();
        const catalog = await (0, firestoreLoaders_1.loadCatalogFromFirestore)();
        const instructors = await (0, firestoreLoaders_1.loadInstructorsFromFirestore)();
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
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalog, instructors ?? []);
        const instructorById = new Map((instructors ?? []).map((i) => [i.id, i.name]));
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
    }
    catch (err) {
        console.error("Schedule generation failed:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Failed to fetch schedule"
        });
    }
});
