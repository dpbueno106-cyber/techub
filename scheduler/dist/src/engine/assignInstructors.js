"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignInstructors = assignInstructors;
function assignInstructors(slots, instructors) {
    const instructorSchedule = new Map();
    const load = new Map();
    const lastWeekTaught = new Map();
    const consecutiveWeeks = new Map();
    const lastLocation = new Map();
    const travelChanges = new Map();
    instructors.forEach(inst => {
        instructorSchedule.set(inst.id, new Set());
        load.set(inst.id, 0);
        lastWeekTaught.set(inst.id, null);
        consecutiveWeeks.set(inst.id, 0);
        lastLocation.set(inst.id, null);
        travelChanges.set(inst.id, 0);
    });
    return slots.map(slot => {
        const eligible = instructors.filter(inst => {
            const lastWeek = lastWeekTaught.get(inst.id) ?? null;
            const weeks = instructorSchedule.get(inst.id);
            if (weeks?.has(slot.weekNumber)) {
                return false;
            }
            const consecutive = consecutiveWeeks.get(inst.id) ?? 0;
            const isConsecutive = lastWeek !== null && slot.weekNumber === lastWeek + 1;
            if (isConsecutive && consecutive >= 2) {
                return false;
            }
            if (!inst.canTravel && inst.homeLocation !== slot.location) {
                return false;
            }
            const prevLoc = lastLocation.get(inst.id);
            const willSwitch = prevLoc !== null && prevLoc !== slot.location;
            const travelCount = travelChanges.get(inst.id) ?? 0;
            const maxTravel = inst.id === "mike" ? 3 : 7;
            if (willSwitch && travelCount >= maxTravel) {
                return false;
            }
            return true;
        });
        if (eligible.length === 0) {
            return {
                ...slot,
                instructorId: null
            };
        }
        const scored = eligible.map(inst => {
            const currentLoad = load.get(inst.id) ?? 0;
            const prevLoc = lastLocation.get(inst.id);
            const travelCount = travelChanges.get(inst.id) ?? 0;
            let score = currentLoad;
            if (prevLoc !== null && prevLoc !== slot.location) {
                score += 5;
            }
            score += travelCount * 0.5;
            if (inst.homeLocation === slot.location) {
                score -= 2;
            }
            return { inst, score };
        });
        scored.sort((a, b) => a.score - b.score);
        const chosen = scored[0].inst; //not using ranked here because we want to assign the best available, not just the best overall; i can change if needed
        const ranked = scored.sort((a, b) => a.score - b.score);
        instructorSchedule.get(chosen.id)?.add(slot.weekNumber);
        load.set(chosen.id, (load.get(chosen.id) ?? 0) + 1);
        const lastWeek = lastWeekTaught.get(chosen.id) ?? null;
        const isConsecutive = lastWeek !== null && slot.weekNumber === lastWeek + 1;
        consecutiveWeeks.set(chosen.id, isConsecutive ? (consecutiveWeeks.get(chosen.id) ?? 0) + 1 : 1);
        lastWeekTaught.set(chosen.id, slot.weekNumber);
        const prevLoc = lastLocation.get(chosen.id);
        if (prevLoc !== null && prevLoc !== slot.location) {
            travelChanges.set(chosen.id, (travelChanges.get(chosen.id) ?? 0) + 1);
        }
        lastLocation.set(chosen.id, slot.location);
        return {
            ...slot,
            instructorId: ranked[0]?.inst.id ?? null,
            recommendedInstructors: ranked.map(r => ({
                id: r.inst.id,
                score: r.score
            }))
        };
    });
}
