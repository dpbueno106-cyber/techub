import type { ClassSlot, Instructor } from "../types";
import { scoreInstructor } from "./scoreInstructor";

function exceedsConsecutiveLimit(
  assignedWeeks: number[],
  nextWeek: number,
  maxConsecutive: number
): boolean {
  const weeks = new Set(assignedWeeks);
  weeks.add(nextWeek);

  let streak = 1;

  // check backward
  for (let w = nextWeek - 1; weeks.has(w); w--) {
    streak++;
  }

  // check forward
  for (let w = nextWeek + 1; weeks.has(w); w++) {
    streak++;
  }

  return streak > maxConsecutive;
}

export function assignInstructors(
  slots: ClassSlot[],
  instructors: Instructor[],
  generationConfig: {
    maxConsecutiveWeeks: number;
  }
): ClassSlot[] {
  const assignmentsByInstructor = new Map<string, number[]>();

  instructors.forEach(i => {
    assignmentsByInstructor.set(i.id, []);
  });

  const avgAssignments =
    slots.length / Math.max(instructors.length, 1);

  return slots.map(slot => {
    // Skip manual overrides
    if (slot.instructorId) {
      return slot;
    }

    const eligible = instructors.filter(i => {
      const allowedByClass =
        !slot.possibleInstructors ||
        slot.possibleInstructors.includes(i.id);

      const canTeach =
        !i.capabilities ||
        i.capabilities.includes(slot.category);

      const canBeThere =
        slot.location === i.homeLocation ||
        i.canTravel;

      const assignedWeeks =
        assignmentsByInstructor.get(i.id) ?? [];

      const hasConflict =
        assignedWeeks.includes(slot.weekNumber);

      const wouldExceed =
        exceedsConsecutiveLimit(
          assignedWeeks,
          slot.weekNumber,
          generationConfig.maxConsecutiveWeeks ?? 2
        );

      const underMaxClasses =
        assignedWeeks.length <
        (i.maxClasses ?? Number.MAX_SAFE_INTEGER);

      return (
        allowedByClass &&
        canTeach &&
        canBeThere &&
        !hasConflict &&
        !wouldExceed &&
        underMaxClasses
      );
    });

    if (eligible.length === 0) {
      console.warn(
        `No eligible instructor for ${slot.className} (week ${slot.weekNumber})`
      );

      return slot;
    }

    const scored = eligible.map(i => {
      const weeks =
        assignmentsByInstructor.get(i.id) ?? [];

      return {
        instructor: i,
        score: scoreInstructor(i, slot, {
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