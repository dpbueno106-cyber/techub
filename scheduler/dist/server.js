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
    return snapshot.docs.map((doc) => doc.data());
}
async function loadInstructorsFromFirestore() {
    const snapshot = await firebase_1.db.collection("instructors").get();
    return snapshot.docs.map((doc) => doc.data());
}
/* =========================
   ROUTES
========================= */
app.get("/schedule", async (req, res) => {
    try {
        // Return saved schedule if it exists
        const saved = await firebase_1.db.collection("schedules").doc("current").get();
        if (saved.exists) {
            return res.json(saved.data()?.schedule ?? []);
        }
        // Load Firestore data
        const config = await loadConfigFromFirestore();
        const catalog = await loadCatalogFromFirestore();
        const instructors = await loadInstructorsFromFirestore();
        if (!config || !catalog.length || !instructors.length) {
            return res.status(400).json({
                error: "Missing config, catalog, or instructors in Firestore"
            });
        }
        console.log("Firestore data snapshot:", {
            config,
            catalogCount: catalog.length,
            instructorCount: instructors.length
        });
        // Generate schedule
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalog, instructors);
        // Save immediately
        await firebase_1.db.collection("schedules").doc("current").set({
            schedule,
            updatedAt: new Date()
        });
        res.json(schedule);
    }
    catch (err) {
        console.error("Schedule generation failed:", err);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
});
// Clear saved schedule (admin use)
app.post("/clearSchedule", async (req, res) => {
    try {
        await firebase_1.db.collection("schedules").doc("current").delete();
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
const server = app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
});
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error("Port already in use");
    }
    else {
        console.error("Server error:", err);
    }
});
