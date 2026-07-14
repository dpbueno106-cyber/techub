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
function classSlotGenerator(weeks, catalog, remainingSlots, weekUsage, generationConfig, existingSlots = []) {
    console.log("========== SLOT GENERATOR ==========");
    console.log("remainingSlots:", remainingSlots);
    console.log("weeks:", weeks.length);
    console.log("maxClassesPerWeek:", generationConfig.maxClassesPerWeek);
    console.log("categoryCaps:", generationConfig.categoryCaps);
    console.log("existingSlots:", existingSlots.length);
    const slots = [];
    const reservedKeys = new Set();
    const active = catalog.filter(c => c.isActive);
    existingSlots.forEach(slot => {
        for (let w = 0; w < slot.durationWeeks; w++) {
            reservedKeys.add(`${slot.weekNumber + w}-${slot.location}`);
        }
    });
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
            const location = cls.defaultLocations[0];
            if (isLocationReserved(week.weekNumber, location, reservedKeys)) {
                continue;
            }
            const slot = buildSlot(cls, week);
            slots.push(slot);
            for (let w = 0; w < slot.durationWeeks; w++) {
                reservedKeys.add(`${slot.weekNumber + w}-${location}`);
            }
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
    console.log("MIN_MAX generated:", slots.length);
    console.log("Remaining after MIN_MAX:", remaining);
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
    let i = 0;
    let attempts = 0;
    const maxAttempts = weeks.length * 20;
    while (foundationalCount < maxFoundational &&
        slots.length < remainingSlots &&
        attempts < maxAttempts) {
        const week = candidateWeeks[i % candidateWeeks.length];
        if (!canPlaceInWeek(week.weekNumber, weekUsage, generationConfig.maxClassesPerWeek ?? 1)) {
            i++;
            attempts++;
            continue;
        }
        const scored = foundational.map(cls => ({
            cls,
            score: scoreClass(cls, i)
        }));
        scored.sort((a, b) => b.score - a.score);
        const chosen = scored[0].score === -Infinity
            ? foundational[Math.floor(Math.random() *
                foundational.length)]
            : scored[0].cls;
        const location = chosen.defaultLocations[0];
        if (isLocationReserved(week.weekNumber, location, reservedKeys)) {
            i++;
            attempts++;
            continue;
        }
        const slot = buildSlot(chosen, week);
        slots.push(slot);
        for (let w = 0; w < slot.durationWeeks; w++) {
            reservedKeys.add(`${slot.weekNumber + w}-${location}`);
        }
        markWeekUsage(week.weekNumber, weekUsage);
        classStats[chosen.name].lastWeek = i;
        classStats[chosen.name].timesScheduled++;
        chosen.possibleInstructors?.forEach(id => {
            instructorStats[id].lastWeek = i;
            instructorStats[id].timesScheduled++;
        });
        foundationalCount++;
        i++;
        attempts++;
    }
    // -------------------------
    // Advanced fills remainder
    // -------------------------
    const remainingAfterFoundational = remaining - foundationalCount;
    let advancedCount = 0;
    let advancedIndex = 0;
    let advancedAttempts = 0;
    const maxAdvancedAttempts = weeks.length * 20;
    while (advancedCount <
        remainingAfterFoundational &&
        slots.length < remainingSlots &&
        advancedAttempts <
            maxAdvancedAttempts) {
        const week = weeks[advancedIndex % weeks.length];
        if (!canPlaceInWeek(week.weekNumber, weekUsage, generationConfig.maxClassesPerWeek ?? 1)) {
            advancedIndex++;
            advancedAttempts++;
            continue;
        }
        const scored = advanced.map(cls => ({
            cls,
            score: scoreClass(cls, advancedIndex)
        }));
        scored.sort((a, b) => b.score - a.score);
        const chosen = scored[0].score === -Infinity
            ? advanced[Math.floor(Math.random() *
                advanced.length)]
            : scored[0].cls;
        const location = chosen.defaultLocations[0];
        if (isLocationReserved(week.weekNumber, location, reservedKeys)) {
            advancedIndex++;
            advancedAttempts++;
            continue;
        }
        const slot = buildSlot(chosen, week);
        slots.push(slot);
        for (let w = 0; w < slot.durationWeeks; w++) {
            reservedKeys.add(`${slot.weekNumber + w}-${location}`);
        }
        markWeekUsage(week.weekNumber, weekUsage);
        classStats[chosen.name].lastWeek =
            advancedIndex;
        classStats[chosen.name].timesScheduled++;
        chosen.possibleInstructors?.forEach(id => {
            instructorStats[id].lastWeek =
                advancedIndex;
            instructorStats[id].timesScheduled++;
        });
        advancedCount++;
        advancedIndex++;
        advancedAttempts++;
    }
    // -------------------------
    // Debug summary (keep this)
    // -------------------------
    console.log("Non-NTO slots by category:", slots.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
    }, {}));
    console.log("Foundational generated:", foundationalCount);
    console.log("Advanced generated:", advancedCount);
    console.log("Total generated:", slots.length);
    console.log("Requested:", remainingSlots);
    return slots;
}
/* =========================
   Helpers
========================= */
function canPlaceInWeek(weekNumber, weekUsage, maxClassesPerWeek) {
    return ((weekUsage.get(weekNumber) ?? 0) <
        maxClassesPerWeek);
}
function isLocationReserved(weekNumber, location, reservedKeys) {
    return reservedKeys.has(`${weekNumber}-${location}`);
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
