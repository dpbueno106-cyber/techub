import { generateSchedule } from "./engine/generateSchedule.ts";
import type { ClassDefinition } from "./types.ts";

const config = {
  year: 2026,
  totalClasses: 147,
  holidays: ["2026-01-01", "2026-07-04", "2026-12-25"]
};

const catalog: ClassDefinition[] = [
  {
    id: "basic",
    name: "Basic Hydraulics",
    category: "MFC",
    level: "Foundational",
    durationWeeks: 1,
    defaultLocations: ["IN", "MI"],
    frequencyMode: "WEIGHT",
    frequencyWeight: 10,
    isActive: true
  },
  {
    id: "advanced",
    name: "Advanced Hydraulics",
    category: "MFC",
    level: "Advanced",
    durationWeeks: 1,
    defaultLocations: ["IN", "MI"],
    frequencyMode: "WEIGHT",
    frequencyWeight: 4,
    isActive: true
  }
];
const instructors = [
  { id: "aaron", name: "Aaron", homeLocation: "IN" as const, canTravel: true },
  { id: "jesse", name: "Jesse", homeLocation: "MI" as const, canTravel: true },
  { id: "marc", name: "Marc", homeLocation: "MI" as const, canTravel: true },
  { id: "leon", name: "Leon", homeLocation: "IN" as const, canTravel: true },
  { id: "mike", name: "Mike", homeLocation: "IN" as const, canTravel: false },
  { id: "brandon", name: "Brandon", homeLocation: "MI" as const, canTravel: true },
  { id: "brad", name: "Brad", homeLocation: "MI" as const, canTravel: true },
  { id: "graham", name: "Graham", homeLocation: "MI" as const, canTravel: true },
  { id: "kalob", name: "Kalob", homeLocation: "MI" as const, canTravel: true }
];

const schedule = generateSchedule(config, catalog, instructors);

const instructorById = new Map(instructors.map(i => [i.id, i.name]));
const formattedSchedule = schedule.map(slot => ({
  week: slot.weekNumber,
  classId: slot.classId,
  className: slot.className,
  location: slot.location,
  instructorId: slot.instructorId,
  instructorName: slot.instructorId
    ? instructorById.get(slot.instructorId) ?? slot.instructorId
    : "TBD",
  durationWeeks: slot.durationWeeks,
  category: slot.category,
  level: slot.level
}));

console.table(formattedSchedule);

