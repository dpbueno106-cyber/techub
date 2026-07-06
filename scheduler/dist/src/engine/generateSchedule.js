"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchedule = generateSchedule;
const balanceLocations_1 = require("./balanceLocations");
const buildWeeks_1 = require("./buildWeeks");
const placeNTO_1 = require("./placeNTO");
const classSlotGenerator_1 = require("./classSlotGenerator");
const assignInstructors_1 = require("./assignInstructors");
function generateSchedule(generationConfig, catalog, instructors) {
    // 1. Build calendar weeks
    const weeks = (0, buildWeeks_1.buildWeeks)(generationConfig.year);
    // 2. Initialize schedule state
    let slots = [];
    // 3. Place NTO (additive, optional)
    if (generationConfig.nto.enabled) {
        const ntoResult = (0, placeNTO_1.placeNTO)(slots, weeks, generationConfig.nto.locations);
        slots = ntoResult.slots;
    }
    // 4. Determine remaining capacity
    const ntoCount = slots.length;
    const reservedForNonNTO = Math.max(generationConfig.totalClasses - ntoCount, 0);
    const weekUsage = new Map();
    slots.forEach(slot => {
        weekUsage.set(slot.weekNumber, (weekUsage.get(slot.weekNumber) ?? 0) + 1);
    });
    const nonNTOSlots = (0, classSlotGenerator_1.classSlotGenerator)(weeks, catalog, reservedForNonNTO, weekUsage, generationConfig);
    slots = [...slots, ...nonNTOSlots];
    // Debug visibility (keep this)
    console.log("Slots by category:", slots.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
    }, {}));
    // 6. Balance locations
    const balanced = (0, balanceLocations_1.balanceLocations)(slots);
    // 7. Assign instructors
    const assigned = (0, assignInstructors_1.assignInstructors)(balanced, instructors, generationConfig);
    // 8. Final sort
    return assigned.sort((a, b) => a.weekNumber === b.weekNumber
        ? a.location.localeCompare(b.location)
        : a.weekNumber - b.weekNumber);
}
