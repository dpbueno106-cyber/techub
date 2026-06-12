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
    let weeks = (0, buildWeeks_1.buildWeeks)(config.year);
    weeks = (0, placeHolidays_1.placeHolidays)(weeks, config.holidays);
    const { slots: ntoSl, usedWeeks } = (0, placeNTO_1.placeNTO)(weeks, ["IN", "MI"]);
    const otherSl = (0, classSlotGenerator_1.classSlotGenerator)(weeks, catalog, usedWeeks, config.totalClasses - ntoSl.length);
    const allSl = [...ntoSl, ...otherSl];
    // Balance IN vs MI
    const balanced = (0, balanceLocations_1.balanceLocations)(allSl);
    const assigned = (0, assignInstructors_1.assignInstructors)(balanced, instructors);
    return assigned.sort((a, b) => a.weekNumber === b.weekNumber
        ? a.location.localeCompare(b.location)
        : a.weekNumber - b.weekNumber);
}
