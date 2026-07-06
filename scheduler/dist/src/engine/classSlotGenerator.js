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
function classSlotGenerator(weeks, catalog, remainingSlots, weekUsage, generationConfig) {
    const slots = [];
    const active = catalog.filter(c => c.isActive);
    // -------------------------
    // Split by frequency mode
    // -------------------------
    const minMax = active.filter(c => c.frequencyMode === "MIN_MAX");
    const weighted = active.filter(c => c.frequencyMode === "WEIGHT");
    const classStats = {};
    const instructorStats = {};
    active.forEach(cls => {
        classStats[cls.name] = {
            lastWeek: -Infinity,
            timesScheduled: 0
        };
    });
    catalog.forEach(cls => {
        cls.possibleInstructors?.forEach(id => {
            if (!instructorStats[id]) {
                instructorStats[id] = {
                    lastWeek: -Infinity,
                    timesScheduled: 0
                };
            }
        });
    });
    function minSpacingWeeks(cls) {
        if (cls.category === "NTO")
            return 4;
        if (cls.durationWeeks >= 2)
            return 3;
        return 2;
    }
    function instructorPenalty(cls, weekIndex) {
        if (!cls.possibleInstructors?.length)
            return 0;
        let penalty = 0;
        for (const id of cls.possibleInstructors) {
            const stats = instructorStats[id];
            if (!stats)
                continue;
            const spacing = weekIndex - stats.lastWeek;
            // Too soon → strong penalty
            if (spacing < 2)
                penalty += 20;
            // Overuse → gradual penalty
            penalty += stats.timesScheduled * 3;
        }
        return penalty;
    }
    function getWeekUsage(weekNumber, weekUsage) {
        return weekUsage.get(weekNumber) ?? 0;
    }
    function getLeastUsedWeeks(weeks, weekUsage) {
        return [...weeks]
            .filter(w => !w.blocked)
            .sort((a, b) => (weekUsage.get(a.weekNumber) ?? 0) -
            (weekUsage.get(b.weekNumber) ?? 0));
    }
    function scoreClass(cls, weekIndex) {
        const stats = classStats[cls.name];
        const spacing = weekIndex - stats.lastWeek;
        // Hard block if too soon
        if (spacing < minSpacingWeeks(cls)) {
            return -Infinity;
        }
        let score = 0;
        // Frequency importance
        score += (cls.frequencyWeight ?? 1) * 10;
        // Reward waiting
        score += spacing * 3;
        // Penalize overuse
        score -= stats.timesScheduled * 5;
        score -= instructorPenalty(cls, weekIndex);
        return score;
    }
    // -------------------------
    // Place MIN_MAX classes
    // -------------------------
    for (const cls of minMax) {
        const min = cls.minPerYear ?? 0;
        for (let i = 0; i < min; i++) {
            const weekIndex = weeks.findIndex((w, idx) => !w.blocked &&
                canPlaceInWeek(w.weekNumber, weekUsage, generationConfig.maxClassesPerWeek ?? 1) &&
                scoreClass(cls, idx) !== -Infinity);
            const week = weekIndex >= 0 ? weeks[weekIndex] : null;
            if (!week)
                break;
            slots.push(buildSlot(cls, week));
            markWeekUsage(week.weekNumber, weekUsage);
            classStats[cls.name].lastWeek = weekIndex;
            classStats[cls.name].timesScheduled++;
            cls.possibleInstructors?.forEach(id => {
                instructorStats[id].lastWeek = weekIndex;
                instructorStats[id].timesScheduled++;
            });
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
    const candidateWeeks = getLeastUsedWeeks(weeks, weekUsage);
    for (let i = 0; i < weeks.length && foundationalCount < maxFoundational; i++) {
        if (!foundational.length)
            break;
        if (!canPlaceInWeek(weeks[i].weekNumber, weekUsage, generationConfig.maxClassesPerWeek ?? 1))
            continue;
        const scored = foundational.map(cls => ({
            cls,
            score: scoreClass(cls, i)
        }));
        scored.sort((a, b) => b.score - a.score);
        const chosen = scored[0].score === -Infinity
            ? foundational[Math.floor(Math.random() * foundational.length)]
            : scored[0].cls;
        const week = candidateWeeks[i];
        slots.push(buildSlot(chosen, week));
        markWeekUsage(week.weekNumber, weekUsage);
        classStats[chosen.name].lastWeek = i;
        classStats[chosen.name].timesScheduled++;
        chosen.possibleInstructors?.forEach(id => {
            instructorStats[id].lastWeek = i;
            instructorStats[id].timesScheduled++;
        });
        foundationalCount++;
    }
    // -------------------------
    // Advanced fills remainder
    // -------------------------
    const remainingAfterFoundational = remaining - foundationalCount;
    let advancedCount = 0;
    for (let i = 0; i < weeks.length && advancedCount < remainingAfterFoundational; i++) {
        if (!advanced.length)
            break;
        if (!canPlaceInWeek(weeks[i].weekNumber, weekUsage, generationConfig.maxClassesPerWeek ?? 1))
            continue;
        const scored = advanced.map(cls => ({
            cls,
            score: scoreClass(cls, i)
        }));
        scored.sort((a, b) => b.score - a.score);
        const chosen = scored[0].score === -Infinity
            ? advanced[Math.floor(Math.random() * advanced.length)]
            : scored[0].cls;
        const week = weeks[i];
        slots.push(buildSlot(chosen, week));
        markWeekUsage(week.weekNumber, weekUsage);
        classStats[chosen.name].lastWeek = i;
        classStats[chosen.name].timesScheduled++;
        chosen.possibleInstructors?.forEach(id => {
            instructorStats[id].lastWeek = i;
            instructorStats[id].timesScheduled++;
        });
        advancedCount++;
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
function canPlaceInWeek(weekNumber, weekUsage, maxClassesPerWeek) {
    return ((weekUsage.get(weekNumber) ?? 0) <
        maxClassesPerWeek);
}
function markWeekUsage(weekNumber, weekUsage) {
    weekUsage.set(weekNumber, (weekUsage.get(weekNumber) ?? 0) + 1);
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
        weekEndDate: week.endDate,
        possibleInstructors: cls.possibleInstructors
    };
}
