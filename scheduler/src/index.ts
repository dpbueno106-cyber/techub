import { generateSchedule } from "./engine/generateSchedule";
import { ClassDefinition } from "./types";

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

const schedule = generateSchedule(config, catalog);
console.log(schedule);
``
