"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const generateSchedule_1 = require("./src/engine/generateSchedule");
const firestoreLoaders_1 = require("./src/firestoreLoaders");
const firebase_1 = require("./firebase");
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5500",
        "https://dpbueno106-cyber.github.io"
    ]
}));
// =========================
// ROUTES
// =========================
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
        //  Instructors may be empty — engine can handle this
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalog, instructors ?? []);
        res.json(schedule);
    }
    catch (err) {
        console.error("Schedule generation failed:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Failed to fetch schedule"
        });
    }
});
app.get("/catalog", async (_req, res) => {
    try {
        const snapshot = await firebase_1.db
            .collection("catalog")
            .where("isActive", "==", true)
            .get();
        res.json(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })));
    }
    catch {
        res.status(500).json({ error: "Failed to load catalog" });
    }
});
app.post("/catalog", async (req, res) => {
    try {
        const { name, category, durationWeeks, defaultLocations, frequencyMode, frequencyWeight } = req.body;
        if (!name ||
            !["NTO", "Foundational", "Advanced"].includes(category) ||
            typeof durationWeeks !== "number" ||
            !Array.isArray(defaultLocations)) {
            return res.status(400).json({ error: "Invalid catalog data" });
        }
        await firebase_1.db.collection("catalog").add({
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
    }
    catch {
        res.status(500).json({ error: "Failed to save catalog class" });
    }
});
app.post("/clearSchedule", async (_req, res) => {
    await firebase_1.db.collection("schedules").doc("current").delete();
    res.json({ message: "Schedule cleared" });
});
// =========================
// SERVER START
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
