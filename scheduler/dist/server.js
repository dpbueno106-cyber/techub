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
async function loadFixedPlacements() {
    const snap = await firebase_1.db
        .collection("fixedPlacements")
        .get();
    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}
app.post("/fixedPlacements/import", async (req, res) => {
    console.log("IMPORT BODY:", JSON.stringify(req.body, null, 2));
    try {
        console.log("IMPORT REQUEST BODY:", req.body);
        const rows = req.body;
        const catalog = await (0, firestoreLoaders_1.loadCatalogFromFirestore)();
        const placements = [];
        for (const row of rows) {
            console.log("Processing row:", row);
            const excelName = String(row["Course Name"] ?? "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
            const course = catalog.find(c => c.name
                ?.replace(/\s+/g, " ")
                .trim()
                .toLowerCase() ===
                excelName);
            console.log("Excel course:", row["Course Name"]);
            console.log("Catalog names:", catalog.map(c => c.name));
            console.log("Matched course:", course);
            if (!course) {
                console.log("NO MATCH FOUND FOR:", excelName);
                continue;
            }
            placements.push({
                className: course.name,
                weekStartDate: row["Week Start"],
                location: row["Location"],
                instructorName: row["Instructor"] || null,
                locked: true
            });
            console.log("ADDED TO PLACEMENTS ARRAY:", {
                className: course.name,
                weekStartDate: row["Week Start"],
                location: row["Location"],
                instructorName: row["Instructor"] || null
            });
        }
        console.log("PLACEMENTS TO SAVE:", placements);
        for (const placement of placements) {
            try {
                console.log("CHECKING:", placement);
                const existing = await firebase_1.db
                    .collection("fixedPlacements")
                    .where("className", "==", placement.className)
                    .where("weekStartDate", "==", placement.weekStartDate)
                    .where("location", "==", placement.location)
                    .where("instructorName", "==", placement.instructorName)
                    .get();
                console.log("MATCHES FOUND:", existing.size);
                if (!existing.empty) {
                    console.log("SKIPPING DUPLICATE:", placement);
                    continue;
                }
                console.log("SAVING:", placement);
                const docRef = await firebase_1.db
                    .collection("fixedPlacements")
                    .add(placement);
                console.log("SAVED DOC ID:", docRef.id);
            }
            catch (err) {
                console.error("SAVE FAILED:", err);
            }
        }
        const verify = await firebase_1.db
            .collection("fixedPlacements")
            .get();
        console.log("TOTAL DOCS AFTER IMPORT:", verify.size);
        console.log("FINAL PLACEMENTS COUNT:", placements.length);
        res.json({
            success: true
        });
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({
            error: "Import failed"
        });
    }
});
app.delete("/catalog/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await firebase_1.db.collection("catalog").doc(id).update({
            isActive: false
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error("Failed to delete catalog item", err);
        res.status(500).json({ error: "Failed to remove course" });
    }
});
//this is for clearing all fixed placements from the database
app.delete("/fixedPlacements", async (_req, res) => {
    const snap = await firebase_1.db
        .collection("fixedPlacements")
        .get();
    const batch = firebase_1.db.batch();
    snap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    res.json({
        success: true
    });
});
app.delete("/fixedPlacements/:id", async (req, res) => {
    try {
        await firebase_1.db
            .collection("fixedPlacements")
            .doc(req.params.id)
            .delete();
        res.json({
            success: true
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to delete placement"
        });
    }
});
app.post("/config/generation", async (req, res) => {
    try {
        await firebase_1.db
            .collection("config")
            .doc("generation")
            .set(req.body, { merge: true });
        res.json({ success: true });
    }
    catch (err) {
        console.error("Failed to save config:", err);
        res.status(500).json({
            error: "Failed to save config"
        });
    }
});
app.get("/config/generation", async (_req, res) => {
    try {
        const config = await (0, firestoreLoaders_1.loadConfigFromFirestore)();
        res.json(config);
    }
    catch (err) {
        console.error("Failed to load config:", err);
        res.status(500).json({
            error: err instanceof Error
                ? err.message
                : "Failed to load config"
        });
    }
});
app.get("/schedule", async (_req, res) => {
    try {
        const config = await (0, firestoreLoaders_1.loadConfigFromFirestore)();
        const catalog = await (0, firestoreLoaders_1.loadCatalogFromFirestore)();
        const instructors = await (0, firestoreLoaders_1.loadInstructorsFromFirestore)();
        const fixedPlacements = await loadFixedPlacements();
        console.log("FIXED PLACEMENTS LOADED:", fixedPlacements);
        console.log("Loaded fixed placements:", fixedPlacements);
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
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalog, instructors ?? [], fixedPlacements);
        res.json(schedule);
    }
    catch (err) {
        console.error("Schedule generation failed:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Failed to fetch schedule"
        });
    }
});
app.get("/fixedPlacements", async (req, res) => {
    res.json(await loadFixedPlacements());
});
app.get("/schedule/load", async (req, res) => {
    const year = req.query.year;
    const doc = await firebase_1.db.collection("schedules").doc(String(year)).get();
    if (!doc.exists) {
        return res.json({ slots: [] });
    }
    res.json(doc.data());
});
app.post("/schedule/save", async (req, res) => {
    const { year, slots } = req.body;
    await firebase_1.db.collection("schedules").doc(String(year)).set({
        year,
        slots,
        updatedAt: new Date()
    });
    res.json({ success: true });
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
