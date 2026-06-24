"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignInstructors = assignInstructors;
const scoreInstructor_1 = require("./scoreInstructor");
function exceedsConsecutiveLimit(assignedWeeks, nextWeek, maxConsecutive) {
    const weeks = new Set(assignedWeeks);
    weeks.add(nextWeek);
    let streak = 0;
    for (let w = nextWeek; weeks.has(w); w--) {
        streak++;
        if (streak > maxConsecutive)
            return true;
    }
    return false;
}
function assignInstructors(slots, instructors, generationConfig) {
    const assignmentsByInstructor = new Map();
    instructors.forEach(i => {
        assignmentsByInstructor.set(i.id, []);
    });
    const avgAssignments = slots.length / Math.max(instructors.length, 1);
    return slots.map(slot => {
        // Skip manual overrides (future‑safe)
        if (slot.instructorId)
            return slot;
        const eligible = instructors.filter(i => {
            const canTeach = !i.canTeach || i.canTeach.includes(slot.category);
            const canBeThere = slot.location === i.homeLocation || i.canTravel;
            const assignedWeeks = assignmentsByInstructor.get(i.id) ?? [];
            const maxWeeks = generationConfig.maxConsecutiveWeeks ?? 2;
            const wouldExceed = exceedsConsecutiveLimit(assignedWeeks, slot.weekNumber, maxWeeks);
            return canTeach && canBeThere && !wouldExceed;
        });
        if (eligible.length === 0) {
            console.warn(`No eligible instructor for ${slot.className} (week ${slot.weekNumber})`);
            return slot;
        }
        const scored = eligible.map(i => {
            const weeks = assignmentsByInstructor.get(i.id) ?? [];
            return {
                instructor: i,
                score: (0, scoreInstructor_1.scoreInstructor)(i, slot, {
                    recentWeeks: weeks,
                    totalAssignments: weeks.length,
                    averageAssignments: avgAssignments
                })
            };
        });
        scored.sort((a, b) => a.score - b.score);
        const chosen = scored[0].instructor;
        assignmentsByInstructor
            .get(chosen.id)
            ?.push(slot.weekNumber);
        return {
            ...slot,
            instructorId: chosen.id
        };
    });
}
