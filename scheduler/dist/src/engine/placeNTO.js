"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeNTO = placeNTO;
function placeNTO(weeks, locations) {
    const slots = [];
    const usedWeeks = new Set();
    const availableWeeks = weeks.filter(w => !w.blocked);
    for (let month = 0; month < 12; month++) {
        // Get usable weeks for this month
        const monthWeeks = availableWeeks.filter(w => new Date(w.startDate).getMonth() === month);
        let foundPair = false;
        for (let i = 0; i < monthWeeks.length - 1; i++) {
            const week1 = monthWeeks[i];
            const week2 = monthWeeks[i + 1];
            const isConsecutive = week2.weekNumber === week1.weekNumber + 1;
            const alreadyUsed = usedWeeks.has(week1.weekNumber) ||
                usedWeeks.has(week2.weekNumber);
            if (isConsecutive && !alreadyUsed) {
                //Place NTO for BOTH locations
                locations.forEach(loc => {
                    slots.push({
                        weekNumber: week1.weekNumber,
                        location: loc,
                        classId: "NTO",
                        className: "New Technician Orientation",
                        category: "NTO",
                        durationWeeks: 2,
                        instructorId: null,
                        weekStartDate: week1.startDate, // Start on Tuesday
                        weekEndDate: week1.endDate
                    });
                });
                // Mark both weeks as used
                usedWeeks.add(week1.weekNumber);
                usedWeeks.add(week2.weekNumber);
                foundPair = true;
                break;
            }
        }
        // Safety check (important for debugging)
        if (!foundPair) {
            console.warn(`Could not place NTO for month ${month + 1}`);
        }
    }
    return { slots, usedWeeks };
}
