"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const data_1 = require("./src/data");
const generateSchedule_1 = require("./src/engine/generateSchedule");
const firebase_1 = require("./firebase");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5500",
        "https://your-frontend.netlify.app"
    ]
}));
app.use(express_1.default.json());
// 🔹 Helper
function addInstructorNames(schedule) {
    return schedule.map(slot => {
        const instructor = data_1.instructors.find(i => i.id === slot.instructorId);
        const namedRecommended = slot.recommendedInstructors?.map((item) => {
            const id = typeof item === "string" ? item : item.id;
            const found = data_1.instructors.find(i => i.id === id);
            return {
                ...(typeof item === "string" ? { id } : item),
                name: found?.name || id
            };
        });
        return {
            ...slot,
            instructorName: instructor?.name ?? slot.instructorName ?? null,
            recommendedInstructors: namedRecommended ?? slot.recommendedInstructors
        };
    });
}
// 🔹 Routes
app.get("/schedule", async (req, res) => {
    try {
        const doc = await firebase_1.db.collection("schedules").doc("current").get();
        if (doc.exists) {
            return res.json(addInstructorNames(doc.data()?.schedule ?? []));
        }
        const schedule = (0, generateSchedule_1.generateSchedule)(data_1.config, data_1.catalog, data_1.instructors);
        res.json(addInstructorNames(schedule));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
});
app.get("/catalog", (req, res) => res.json(data_1.catalog));
app.get("/instructors", (req, res) => res.json(data_1.instructors));
app.post("/saveSchedule", async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: "Invalid schedule format" });
        }
        await firebase_1.db.collection("schedules").doc("current").set({
            schedule: req.body,
            updatedAt: new Date()
        });
        res.json({ message: "Schedule saved successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save schedule" });
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
``;
