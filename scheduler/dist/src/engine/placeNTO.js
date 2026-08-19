"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeNTO = placeNTO;
function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}
/*
 * Rules:
 * - The first NTO block starts on/after config.startDate
 * - Subsequent blocks are targeted config.frequencyMonths apart
 * - Each block is config.weeks consecutive weeks (DST-safe adjacency)
 * - Skips actual holiday/blocked weeks (these come from placeHolidays,
 *   not from other classes)
 * - Avoids overlapping a PREVIOUS NTO occurrence with a new one
 * - Places NTO for all provided locations
 */
function placeNTO(existingSlots, weeks, locations, config) {
    const slots = [...existingSlots];
    const usedWeeks = new Set();
    const blockLength = Math.max(1, config?.weeks ?? 2);
    const frequencyMonths = Math.max(1, config?.frequencyMonths ?? 1);
    // Only consider unblocked weeks (actual holidays), sorted chronologically.
    const sortedWeeks = [...weeks]
        .filter(w => !w.blocked)
        .sort((a, b) => new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime());
    if (sortedWeeks.length === 0 || !config?.startDate) {
        console.warn("placeNTO: No available weeks or no start date configured; skipping NTO generation.");
        return { slots, usedWeeks };
    }
    const scheduleYear = new Date(sortedWeeks[0].startDate).getFullYear();
    let targetDate = new Date(`${config.startDate}T00:00:00`);
    let occurrence = 0;
    // Walk forward by frequencyMonths from startDate for as long as we're
    // still inside the scheduled year, placing one NTO block per stop.
    while (targetDate.getFullYear() <= scheduleYear) {
        if (targetDate.getFullYear() === scheduleYear) {
            // This occurrence may use any starting week from targetDate up to
            // (but not including) the NEXT occurrence's target date.
            const windowEnd = addMonths(targetDate, frequencyMonths);
            const searchStartIndex = sortedWeeks.findIndex(w => new Date(w.startDate).getTime() >=
                targetDate.getTime());
            let placed = false;
            let sawConsecutiveOption = false;
            if (searchStartIndex >= 0) {
                for (let idx = searchStartIndex; idx < sortedWeeks.length; idx++) {
                    const candidateStart = new Date(sortedWeeks[idx].startDate).getTime();
                    if (candidateStart >= windowEnd.getTime()) {
                        break;
                    }
                    const block = sortedWeeks.slice(idx, idx + blockLength);
                    const isConsecutive = block.length === blockLength &&
                        block.every((w, i) => {
                            if (i === 0)
                                return true;
                            const diffDays = (new Date(w.startDate).getTime() -
                                new Date(block[i - 1].startDate).getTime()) /
                                (1000 * 60 * 60 * 24);
                            // DST-safe definition of "the immediately following week"
                            return diffDays >= 6 && diffDays <= 8;
                        });
                    if (!isConsecutive) {
                        continue;
                    }
                    sawConsecutiveOption = true;
                    // Only check against OTHER NTO occurrences, not other classes.
                    const overlapsExistingNTO = block.some(w => usedWeeks.has(w.weekNumber));
                    if (overlapsExistingNTO) {
                        continue;
                    }
                    const firstWeek = block[0];
                    const lastWeek = block[block.length - 1];
                    for (const location of locations) {
                        slots.push({
                            classId: "NTO",
                            className: "New Technician Orientation",
                            category: "NTO",
                            location,
                            weekNumber: firstWeek.weekNumber,
                            weekStartDate: firstWeek.startDate,
                            weekEndDate: lastWeek.endDate,
                            durationWeeks: blockLength,
                            instructorId: null
                        });
                    }
                    block.forEach(w => usedWeeks.add(w.weekNumber));
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                if (searchStartIndex < 0) {
                    console.warn(`placeNTO: No available (non-holiday) week on/after ${targetDate.toISOString().slice(0, 10)} for occurrence ${occurrence + 1}.`);
                }
                else if (!sawConsecutiveOption) {
                    console.warn(`placeNTO: Could not find ${blockLength} consecutive non-holiday weeks between ${targetDate.toISOString().slice(0, 10)} and ${windowEnd.toISOString().slice(0, 10)} (occurrence ${occurrence + 1}).`);
                }
                else {
                    console.warn(`placeNTO: Every candidate week between ${targetDate.toISOString().slice(0, 10)} and ${windowEnd.toISOString().slice(0, 10)} overlaps a previous NTO occurrence; skipping occurrence ${occurrence + 1}.`);
                }
            }
        }
        occurrence++;
        targetDate = addMonths(targetDate, frequencyMonths);
    }
    return { slots, usedWeeks };
}
