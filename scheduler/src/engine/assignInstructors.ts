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
function getCoveredWeeks(
  slot: ClassSlot
): number[] {
  return Array.from(
    { length: slot.durationWeeks },
    (_, index) =>
      slot.weekNumber + index
  );
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
    if (
  slot.locked &&
  slot.instructorId
) {
  return slot;
}
      console.log(
  "INSTRUCTORS",
  instructors.map(i => ({
    id: i.id,
    capabilities: i.capabilities,
    homeLocation: i.homeLocation,
    canTravel: i.canTravel,
    maxClasses: i.maxClasses
  }))
);

console.log("SLOT", {
  className: slot.className,
  category: slot.category,
  location: slot.location
});

    const eligible = instructors.filter(i => {
      const allowedByClass =true
      console.log({
  className: slot.className,
  capabilities: i.capabilities,
  result: i.capabilities.includes(slot.className)
});
      const normalizedClass =
  slot.className.trim().toLowerCase();

const canTeach =
  (i.capabilities ?? []).some(
    cap =>
      cap.trim().toLowerCase() ===
      normalizedClass
  );

      const canBeThere =
        slot.location === i.homeLocation ||
        i.canTravel;

      const assignedWeeks =
        assignmentsByInstructor.get(i.id) ?? [];

      const occupiedWeeks =
  assignmentsByInstructor.get(i.id) ?? [];

const coveredWeeks =
  getCoveredWeeks(slot);

const hasConflict =
  coveredWeeks.some(week =>
    occupiedWeeks.includes(week)
  );

      
const wouldExceed =
  coveredWeeks.some(week =>
    exceedsConsecutiveLimit(
      assignedWeeks,
      week,
      generationConfig.maxConsecutiveWeeks ?? 2
    )
  );


      const underMaxClasses =
        assignedWeeks.length <
        (i.maxClasses ?? Number.MAX_SAFE_INTEGER);
          if (!canTeach) {
  console.log(
    "Cannot teach",
    i.id,
    slot.className,
    i.capabilities
  );
}

console.log("FILTER CHECK", {
  instructor: i.id,
  className: slot.className,

  allowedByClass,
  canTeach,
  canBeThere,
  hasConflict,
  wouldExceed,
  underMaxClasses
});


      return (
        allowedByClass &&
        canTeach &&
        canBeThere &&
        !hasConflict &&
        !wouldExceed &&
        underMaxClasses
      );
    });
console.log(
  "ELIGIBLE",
  slot.className,
  eligible.map(i => i.id)
);
    if (eligible.length === 0) {
      console.warn(
        `No eligible instructor for ${slot.className} (week ${slot.weekNumber})`
      );
        console.log(
  "NO ELIGIBLE",
  slot.className,
  slot.possibleInstructors
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

    scored.sort((a, b) => {
  const scoreDiff = a.score - b.score;

  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const aAssignments =
    assignmentsByInstructor.get(a.instructor.id)?.length ?? 0;

  const bAssignments =
    assignmentsByInstructor.get(b.instructor.id)?.length ?? 0;

  return aAssignments - bAssignments;
});

    const chosen = scored[0].instructor;
  console.log(
  "ASSIGNED",
  slot.className,
  "=>",
  chosen.id
);
    const coveredWeeks =
  getCoveredWeeks(slot);

assignmentsByInstructor
  .get(chosen.id)
  ?.push(...coveredWeeks);

    return {
      ...slot,
      instructorId: chosen.id
    };
  });
}