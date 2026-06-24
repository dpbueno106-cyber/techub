"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classSlotGenerator = classSlotGenerator;
/**
 * Generates non-NTO class slots while respecting:
 * - Reserved weeks (usedWeeks)
 * - Category caps (config-driven)
 * - WEIGHT distribution within category
 * - MIN_MAX guarantees
 */
function classSlotGenerator(weeks, catalog, usedWeeks, remainingSlots, generationConfig) {
    const slots = [];
    const active = catalog.filter(c => c.isActive);
    // -------------------------
    // Split by frequency mode
    // -------------------------
    const minMax = active.filter(c => c.frequencyMode === "MIN_MAX");
    const weighted = active.filter(c => c.frequencyMode === "WEIGHT");
    // -------------------------
    // Place MIN_MAX classes
    // -------------------------
    for (const cls of minMax) {
        const min = cls.minPerYear ?? 0;
        for (let i = 0; i < min; i++) {
            const week = findNextFreeWeek(weeks, usedWeeks);
            if (!week)
                break;
            slots.push(buildSlot(cls, week));
            markUsed(week.weekNumber, cls.durationWeeks, usedWeeks);
        }
    }
    // Remaining capacity after MIN_MAX
    let remaining = remainingSlots - slots.length;
    if (remaining <= 0) {
        console.warn("No remaining capacity after MIN_MAX placement");
        return slots;
    }
    // -------------------------
    // Category split (WEIGHT)
    // -------------------------
    const foundational = weighted.filter(c => c.category === "Foundational");
    const advanced = weighted.filter(c => c.category === "Advanced");
    // -------------------------
    // Foundational cap (config-driven)
    // -------------------------
    const foundationalCap = generationConfig.categoryCaps.Foundational;
    const maxFoundational = Math.floor(remaining * foundationalCap);
    let foundationalCount = 0;
    const foundationalWeight = foundational.reduce((sum, c) => sum + (c.frequencyWeight ?? 0), 0);
    for (const cls of foundational) {
        if (foundationalCount >= maxFoundational)
            break;
        const desiredRuns = Math.round(((cls.frequencyWeight ?? 0) / foundationalWeight) *
            maxFoundational);
        const runs = Math.max(1, desiredRuns);
        for (let i = 0; i < runs && foundationalCount < maxFoundational; i++) {
            const week = findNextFreeWeek(weeks, usedWeeks);
            if (!week)
                break;
            slots.push(buildSlot(cls, week));
            markUsed(week.weekNumber, cls.durationWeeks, usedWeeks);
            foundationalCount++;
        }
    }
    // -------------------------
    // Advanced fills remainder
    // -------------------------
    const remainingAfterFoundational = remaining - foundationalCount;
    const advancedWeight = advanced.reduce((sum, c) => sum + (c.frequencyWeight ?? 0), 0);
    for (const cls of advanced) {
        const desiredRuns = Math.round(((cls.frequencyWeight ?? 0) / advancedWeight) *
            remainingAfterFoundational);
        const runs = Math.max(1, desiredRuns);
        for (let i = 0; i < runs; i++) {
            const week = findNextFreeWeek(weeks, usedWeeks);
            if (!week)
                break;
            slots.push(buildSlot(cls, week));
            markUsed(week.weekNumber, cls.durationWeeks, usedWeeks);
        }
    }
    // -------------------------
    // Debug summary (keep this)
    // -------------------------
    console.log("Non-NTO slots by category:", slots.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
    }, {}));
    return slots;
}
/* =========================
   Helpers
========================= */
function findNextFreeWeek(weeks, used) {
    return (weeks.find(w => !w.blocked && !used.has(w.weekNumber)) ||
        null);
}
function markUsed(startWeek, duration, used) {
    for (let i = 0; i < duration; i++) {
        used.add(startWeek + i);
    }
}
function buildSlot(cls, week) {
    return {
        weekNumber: week.weekNumber,
        location: cls.defaultLocations[0],
        classId: cls.id,
        className: cls.name,
        category: cls.category,
        durationWeeks: cls.durationWeeks,
        instructorId: null,
        weekStartDate: week.startDate,
        weekEndDate: week.endDate
    };
}
