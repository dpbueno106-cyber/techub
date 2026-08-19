"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generateSchedule_1 = require("./engine/generateSchedule");
const verifyAdmin_1 = require("./middleware/verifyAdmin");
const firestoreLoaders_1 = require("./firestoreLoaders");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/schedule", verifyAdmin_1.verifyAdmin, async (_req, res) => {
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
        const catalogWithPossibleInstructors = (0, firestoreLoaders_1.attachPossibleInstructors)(catalog, instructors);
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalogWithPossibleInstructors, instructors ?? []);
        const instructorById = new Map((instructors ?? []).map((i) => [
            i.id,
            i.name || i.email || "Unknown"
        ]));
        const formattedSchedule = schedule.map(slot => ({
            ...slot,
            instructorName: slot.instructorId
                ? instructorById.get(slot.instructorId) ?? "Unknown"
                : "TBD"
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
