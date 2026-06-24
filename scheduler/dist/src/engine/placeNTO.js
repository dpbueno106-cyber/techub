"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeNTO = placeNTO;
/**
 * Injects NTO (New Technician Orientation) slots into an existing schedule.
 * NTO is additive: it does NOT replace existing slots.
 *
 * Rules:
 * - One 2-week NTO per month
 * - Must use consecutive, unblocked weeks
 * - Reserves both weeks so other classes do not overlap
 * - Places NTO for all provided locations
 */
function placeNTO(existingSlots, weeks, locations) {
    // Start with existing schedule
    const slots = [...existingSlots];
    const usedWeeks = new Set();
    // Track weeks already occupied by existing slots
    for (const slot of existingSlots) {
        usedWeeks.add(slot.weekNumber);
        // If the slot spans multiple weeks, reserve those too
        for (let i = 1; i < slot.durationWeeks; i++) {
            usedWeeks.add(slot.weekNumber + i);
        }
    }
    const availableWeeks = weeks.filter(w => !w.blocked);
    for (let month = 0; month < 12; month++) {
        const monthWeeks = availableWeeks.filter(w => new Date(w.startDate).getMonth() === month);
        let placedForMonth = false;
        for (let i = 0; i < monthWeeks.length - 1; i++) {
            const week1 = monthWeeks[i];
            const week2 = monthWeeks[i + 1];
            const consecutive = week2.weekNumber === week1.weekNumber + 1;
            const alreadyUsed = usedWeeks.has(week1.weekNumber) ||
                usedWeeks.has(week2.weekNumber);
            if (consecutive && !alreadyUsed) {
                // Place NTO for each location
                for (const location of locations) {
                    slots.push({
                        classId: "NTO",
                        className: "New Technician Orientation",
                        category: "NTO",
                        location,
                        weekNumber: week1.weekNumber,
                        weekStartDate: week1.startDate,
                        weekEndDate: week2.endDate,
                        durationWeeks: 2,
                        instructorId: null
                    });
                }
                // Reserve both weeks
                usedWeeks.add(week1.weekNumber);
                usedWeeks.add(week2.weekNumber);
                placedForMonth = true;
                break;
            }
        }
        if (!placedForMonth) {
            console.warn(`placeNTO: Could not place NTO for month ${month + 1}`);
        }
    }
    return { slots, usedWeeks };
}
