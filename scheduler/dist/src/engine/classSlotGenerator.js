"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classSlotGenerator = classSlotGenerator;
function classSlotGenerator(weeks, catalog, usedWeeks, totalClasses) {
    const slots = [];
    const active = catalog.filter(c => c.isActive);
    const minMax = active.filter(c => c.frequencyMode === "MIN_MAX");
    const weighted = active.filter(c => c.frequencyMode === "WEIGHT");
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
    let remaining = totalClasses - slots.length;
    const totalWeight = weighted.reduce((sum, c) => sum + (c.frequencyWeight ?? 0), 0);
    for (const cls of weighted) {
        const runs = Math.round(((cls.frequencyWeight ?? 0) / totalWeight) * remaining);
        for (let i = 0; i < runs; i++) {
            const week = findNextFreeWeek(weeks, usedWeeks);
            if (!week)
                break;
            slots.push(buildSlot(cls, week));
            markUsed(week.weekNumber, cls.durationWeeks, usedWeeks);
        }
    }
    return slots;
}
function findNextFreeWeek(weeks, used) {
    return weeks.find(w => !w.blocked && !used.has(w.weekNumber)) || null;
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
``;
