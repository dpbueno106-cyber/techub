"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeNTO = placeNTO;
/**
 * Injects NTO (New Technician Orientation) slots into an existing schedule.
 * NTO is additive: it does NOT replace existing slots.
 *
 * Rules:
 * - One 2-week NTO per month
 * - Week 1 must start in the month
 * - Week 2 must be the immediately following week (DST-safe)
 * - Reserves both weeks so other classes do not overlap
 * - Places NTO for all provided locations
 */
function placeNTO(existingSlots, weeks, locations) {
    const slots = [...existingSlots];
    const usedWeeks = new Set();
    // Reserve weeks already occupied by existing slots
    for (const slot of existingSlots) {
        for (let i = 0; i < slot.durationWeeks; i++) {
            usedWeeks.add(slot.weekNumber + i);
        }
    }
    // Only consider unblocked weeks
    const availableWeeks = weeks.filter(w => !w.blocked);
    // Sort weeks chronologically once
    const sortedWeeks = [...availableWeeks].sort((a, b) => new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime());
    // Attempt to place one NTO per month
    for (let month = 0; month < 12; month++) {
        const monthWeeks = sortedWeeks.filter(w => new Date(w.startDate).getMonth() === month);
        let placedForMonth = false;
        for (const week1 of monthWeeks) {
            const d1 = new Date(week1.startDate);
            const week2 = sortedWeeks.find(w => {
                const d2 = new Date(w.startDate);
                const diffDays = (d2.getTime() - d1.getTime()) /
                    (1000 * 60 * 60 * 24);
                // DST-safe definition of "next week"
                return diffDays >= 6 && diffDays <= 8;
            });
            if (!week2)
                continue;
            const alreadyUsed = usedWeeks.has(week1.weekNumber) ||
                usedWeeks.has(week2.weekNumber);
            if (alreadyUsed)
                continue;
            // Place NTO for all locations
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
            usedWeeks.add(week1.weekNumber);
            usedWeeks.add(week2.weekNumber);
            placedForMonth = true;
            break;
        }
        if (!placedForMonth) {
            console.warn(`placeNTO: Could not place NTO for month ${month + 1}`);
        }
    }
    return { slots, usedWeeks };
}
