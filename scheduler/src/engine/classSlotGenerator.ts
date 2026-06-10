import type {
  ClassDefinition,
  ClassSlot,
  WeekSlot
} from "../types.ts";

export function classSlotGenerator(
  weeks: WeekSlot[],
  catalog: ClassDefinition[],
  usedWeeks: Set<number>,
  totalClasses: number
): ClassSlot[] {

  const slots: ClassSlot[] = [];
  const active = catalog.filter(c => c.isActive);

  const minMax = active.filter(c => c.frequencyMode === "MIN_MAX");
  const weighted = active.filter(c => c.frequencyMode === "WEIGHT");

  for (const cls of minMax) {
    const min = cls.minPerYear ?? 0;

    for (let i = 0; i < min; i++) {
      const week = findNextFreeWeek(weeks, usedWeeks);
      if (!week) break;

      slots.push(buildSlot(cls, week));
      markUsed(week.weekNumber, cls.durationWeeks, usedWeeks);
    }
  }

  let remaining = totalClasses - slots.length;

  const totalWeight = weighted.reduce(
    (sum, c) => sum + (c.frequencyWeight ?? 0),
    0
  );

  for (const cls of weighted) {
    const runs = Math.round(
      ((cls.frequencyWeight ?? 0) / totalWeight) * remaining
    );

    for (let i = 0; i < runs; i++) {
      const week = findNextFreeWeek(weeks, usedWeeks);
      if (!week) break;

      slots.push(buildSlot(cls, week));
      markUsed(week.weekNumber, cls.durationWeeks, usedWeeks);
    }
  }

  return slots;
}

function findNextFreeWeek(
  weeks: WeekSlot[],
  used: Set<number>
): WeekSlot | null {
  return weeks.find(w => !w.blocked && !used.has(w.weekNumber)) || null;
}

function markUsed(
  startWeek: number,
  duration: number,
  used: Set<number>
) {
  for (let i = 0; i < duration; i++) {
    used.add(startWeek + i);
  }
}

function buildSlot(cls: ClassDefinition, week: WeekSlot): ClassSlot {
  return {
    weekNumber: week.weekNumber,
    location: cls.defaultLocations[0],
    classId: cls.id,
    className: cls.name,
    category: cls.category,
    level: cls.level,
    durationWeeks: cls.durationWeeks,
    instructorId: null
  };
}
``
