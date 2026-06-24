"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWeeks = buildWeeks;
function buildWeeks(year) {
    const weeks = [];
    // Start on Jan 1, local time
    const date = new Date(year, 0, 1);
    date.setHours(0, 0, 0, 0);
    // Move to first Monday
    while (date.getDay() !== 1) {
        date.setDate(date.getDate() + 1);
    }
    let weekNumber = 1;
    while (date.getFullYear() === year) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 4); // Friday
        weeks.push({
            weekNumber,
            startDate: startDate.toLocaleDateString("en-CA"),
            endDate: endDate.toLocaleDateString("en-CA"),
            blocked: false
        });
        date.setDate(date.getDate() + 7);
        weekNumber++;
    }
    return weeks;
}
