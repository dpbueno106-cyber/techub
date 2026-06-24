"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const generateSchedule_1 = require("./src/engine/generateSchedule");
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
// Handle preflight requests
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});
/* =========================
   TYPE GUARDS
========================= */
function toFrequencyMode(value) {
    // Map Firestore semantics to engine semantics
    if (value === "recurring")
        return "WEIGHT";
    if (value === "once")
        return "MIN_MAX";
    // Default behavior if missing
    return "WEIGHT";
}
function isClassCategory(value) {
    return (value === "NTO" ||
        value === "Foundational" ||
        value === "Advanced");
}
function isLocation(value) {
    return value === "IN" || value === "MI";
}
/**
 * IMPORTANT:
 * We infer the level type from ClassDefinition itself.
 * This avoids referencing a non‑existent ClassLevel symbol.
 */
function isValidLevel(value) {
    return typeof value === "number";
}
/* =========================
   FIRESTORE LOADERS
========================= */
async function loadConfigFromFirestore() {
    const snap = await firebase_1.db.collection("config").doc("current").get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    if (!data ||
        typeof data.year !== "number" ||
        typeof data.totalClasses !== "number" ||
        !Array.isArray(data.holidays)) {
        return null;
    }
    return data;
}
async function loadCatalogFromFirestore() {
    const snapshot = await firebase_1.db.collection("catalog").get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        if (typeof data.name !== "string" ||
            !isClassCategory(data.category) ||
            !isValidLevel(data.level) ||
            typeof data.durationWeeks !== "number" ||
            !isLocation(data.location)) {
            throw new Error(`Invalid catalog entry: ${doc.id}`);
        }
        return {
            id: doc.id,
            name: data.name,
            category: data.category,
            level: data.level,
            durationWeeks: data.durationWeeks,
            location: data.location,
            instructorRequired: Boolean(data.instructorRequired),
            defaultLocations: Array.isArray(data.defaultLocations)
                ? data.defaultLocations.filter(isLocation)
                : [data.location],
            frequencyMode: toFrequencyMode(data.frequencyMode),
            isActive: data.isActive !== false
        };
    });
}
async function loadInstructorsFromFirestore() {
    const snapshot = await firebase_1.db.collection("instructors").get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        if (typeof data.name !== "string" ||
            !isLocation(data.homeLocation) ||
            typeof data.canTravel !== "boolean") {
            throw new Error(`Invalid instructor entry: ${doc.id}`);
        }
        return {
            id: doc.id,
            name: data.name,
            homeLocation: data.homeLocation,
            canTravel: data.canTravel
        };
    });
}
/* =========================
   ROUTES
========================= */
app.get("/schedule", async (_req, res) => {
    try {
        const saved = await firebase_1.db.collection("schedules").doc("current").get();
        if (saved.exists) {
            return res.json(saved.data()?.schedule ?? []);
        }
        const config = await loadConfigFromFirestore();
        const catalog = await loadCatalogFromFirestore();
        const instructors = await loadInstructorsFromFirestore();
        if (!config || !catalog.length || !instructors.length) {
            return res.status(400).json({
                error: "Missing config, catalog, or instructors in Firestore"
            });
        }
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalog, instructors);
        await firebase_1.db.collection("schedules").doc("current").set({
            schedule,
            updatedAt: new Date()
        });
        await firebase_1.db.collection("scheduleHistory").add({
            schedule,
            source: "generated",
            createdAt: new Date()
        });
        res.json(schedule);
    }
    catch (err) {
        console.error("Schedule generation failed:", err);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
});
app.post("/saveSchedule", async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: "Invalid schedule payload" });
        }
        await firebase_1.db.collection("schedules").doc("current").set({
            schedule: req.body,
            updatedAt: new Date()
        });
        await firebase_1.db.collection("scheduleHistory").add({
            schedule: req.body,
            source: "manual-save",
            createdAt: new Date()
        });
        res.json({ message: "Schedule saved successfully" });
    }
    catch (err) {
        console.error("Failed to save schedule:", err);
        res.status(500).json({ error: "Failed to save schedule" });
    }
});
app.get("/catalog", async (req, res) => {
    try {
        const snapshot = await firebase_1.db
            .collection("catalog")
            .where("isActive", "==", true)
            .get();
        const catalog = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(catalog);
    }
    catch (err) {
        console.error("Failed to load catalog:", err);
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
    catch (err) {
        console.error("Catalog save failed:", err);
        res.status(500).json({ error: "Failed to save catalog class" });
    }
});
app.post("/clearSchedule", async (_req, res) => {
    try {
        await firebase_1.db.collection("schedules").doc("current").delete();
        await firebase_1.db.collection("scheduleHistory").add({
            action: "cleared",
            createdAt: new Date()
        });
        res.json({ message: "Schedule cleared" });
    }
    catch (err) {
        console.error("Failed to clear schedule:", err);
        res.status(500).json({ error: "Failed to clear schedule" });
    }
});
/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
