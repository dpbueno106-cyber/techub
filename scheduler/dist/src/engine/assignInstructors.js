"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignInstructors = assignInstructors;
const scoreInstructor_1 = require("./scoreInstructor");
function assignInstructors(slots, instructors) {
    const assignmentsByInstructor = new Map();
    // Initialize tracking
    instructors.forEach(i => {
        assignmentsByInstructor.set(i.id, []);
    });
    return slots.map(slot => {
        // Skip if already manually assigned (future-safe)
        if (slot.instructorId)
            return slot;
        const eligible = instructors.filter(i => {
            const canTeach = !i.canTeach || i.canTeach.includes(slot.category);
            const canBeThere = slot.location === i.homeLocation || i.canTravel;
            if (!i.canTeach) {
                console.warn(`Instructor ${i.name} has no canTeach defined — allowing all categories`);
            }
            return canTeach && canBeThere;
        });
        if (eligible.length === 0) {
            console.warn(`No eligible instructor for ${slot.className} week ${slot.weekNumber}`);
            return slot;
        }
        const avgAssignments = slots.length / instructors.length;
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
        // Track assignment
        assignmentsByInstructor
            .get(chosen.id)
            ?.push(slot.weekNumber);
        return {
            ...slot,
            instructorId: chosen.id
        };
    });
}
