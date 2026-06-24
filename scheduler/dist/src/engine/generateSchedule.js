"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchedule = generateSchedule;
const balanceLocations_1 = require("./balanceLocations");
const buildWeeks_1 = require("./buildWeeks");
const placeHolidays_1 = require("./placeHolidays");
const placeNTO_1 = require("./placeNTO");
const classSlotGenerator_1 = require("./classSlotGenerator");
const assignInstructors_1 = require("./assignInstructors");
function generateSchedule(config, catalog, instructors) {
    // 1. Build calendar weeks
    let weeks = (0, buildWeeks_1.buildWeeks)(config.year);
    weeks = (0, placeHolidays_1.placeHolidays)(weeks, config.holidays);
    // 2. Start with empty schedule
    let slots = [];
    // 3. Place NTO (additive)
    const ntoResult = (0, placeNTO_1.placeNTO)(slots, weeks, ["IN", "MI"]);
    slots = ntoResult.slots;
    const usedWeeks = ntoResult.usedWeeks;
    const ntoCount = slots.length;
    const reservedForNonNTO = Math.max(config.totalClasses - ntoCount, 0);
    // 4. Generate remaining classes
    const remainingSlots = (0, classSlotGenerator_1.classSlotGenerator)(weeks, catalog, usedWeeks, reservedForNonNTO);
    slots = [...slots, ...remainingSlots];
    //  Debug visibility (safe to keep)
    console.log("Slots by category:", slots.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
    }, {}));
    // 5. Balance locations
    const balanced = (0, balanceLocations_1.balanceLocations)(slots);
    // 6. Assign instructors
    const assigned = (0, assignInstructors_1.assignInstructors)(balanced, instructors);
    // 7. Final sort
    return assigned.sort((a, b) => a.weekNumber === b.weekNumber
        ? a.location.localeCompare(b.location)
        : a.weekNumber - b.weekNumber);
}
