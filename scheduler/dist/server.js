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
/*const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://techub-9gis.onrender.com";
*/
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5500",
        "https://dpbueno106-cyber.github.io"
    ]
}));
//  Helper
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});
async function loadConfigFromFirestore() {
    const docSnap = await firebase_1.db.collection("config").doc("current").get();
    if (!docSnap.exists)
        return null;
    return docSnap.data();
}
async function loadCatalogFromFirestore() {
    const snapshot = await firebase_1.db.collection("catalog").get();
    return snapshot.docs.map((doc) => doc.data());
}
async function loadInstructorsFromFirestore() {
    const snapshot = await firebase_1.db.collection("instructors").get();
    return snapshot.docs.map((doc) => doc.data());
}
//  Routes
app.get("/schedule", async (req, res) => {
    try {
        const doc = await firebase_1.db.collection("schedules").doc("current").get();
        //  If saved schedule exists → return it
        if (doc.exists) {
            return res.json(doc.data()?.schedule ?? []);
        }
        //  Otherwise generate from Firestore data
        const config = await loadConfigFromFirestore();
        const catalog = await loadCatalogFromFirestore();
        const instructors = await loadInstructorsFromFirestore();
        if (!config || !catalog.length || !instructors.length) {
            return res.status(400).json({
                error: "Missing config, catalog, or instructors in Firestore"
            });
        }
        //  Log loaded data for debugging
        console.log("Firestore data snapshot:", {
            config,
            catalogCount: catalog.length,
            instructorCount: instructors.length,
            sampleCatalog: catalog[0],
            sampleInstructor: instructors[0]
        });
        const schedule = (0, generateSchedule_1.generateSchedule)(config, catalog, instructors);
        //  Save it immediately
        await firebase_1.db.collection("schedules").doc("current").set({
            schedule,
            updatedAt: new Date()
        });
        res.json(schedule);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
});
app.post("/clearSchedule", async (req, res) => {
    try {
        await firebase_1.db.collection("schedules").doc("current").delete();
        res.json({ message: "Schedule cleared" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to clear schedule" });
    }
});
//  Start server (ONLY ONE)
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error("Port already in use");
    }
    else {
        console.error(err);
    }
});
