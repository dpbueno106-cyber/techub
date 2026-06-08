export type Location = "IN" | "MI";
export type ClassLevel = "Foundational" | "Advanced";
export type ClassCategory = "MFC" | "HS" | "NTO" | "DEV";

export interface ScheduleConfig {
  year: number;
  totalClasses: number;
  holidays: string[];
}

export interface WeekSlot {
  weekNumber: number;
  startDate: string;
  endDate: string;
  blocked: boolean;
}

export interface ClassDefinition {
  id: string;
  name: string;

  category: ClassCategory;
  level: ClassLevel;

  durationWeeks: number;
  defaultLocations: Location[];

  frequencyMode: "WEIGHT" | "MIN_MAX";
  frequencyWeight?: number;
  minPerYear?: number;
  maxPerYear?: number;

  isActive: boolean;
}

export interface ClassSlot {
  weekNumber: number;
  location: Location;
  classId: string;
  className: string;
  category: ClassCategory;
  level: ClassLevel;
  durationWeeks: number;
  instructorId: string | null;
}
