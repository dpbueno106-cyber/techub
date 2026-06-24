export type Location = "IN" | "MI";
export type ClassLevel = "Foundational" | "Advanced";
export type ClassCategory = "Foundational" | "Advanced" | "NTO";

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
export interface GenerationConfig {
  year: number;
  totalClasses: number;

  categoryCaps: {
    Foundational: number;
    Advanced: number;
  };

  maxConsecutiveWeeks: number;

  nto: {
    enabled: boolean;
    locations: ("IN" | "MI")[];
  };
}
export interface RecommendedInstructor {
  id: string;
  name?: string;
  score: number;
}

export interface ClassSlot {
  weekNumber: number;
  location: Location;
  classId: string;
  className: string;
  category: ClassCategory;
  durationWeeks: number;
  instructorId: string | null;
  weekStartDate: string;
  weekEndDate: string;
  instructorName?: string | null;
  recommendedInstructors?: RecommendedInstructor[];
}

export interface Instructor {
  id: string;
  name: string;
  homeLocation: Location;
  canTravel: boolean;
  canTeach?: ("Foundational" | "Advanced" | "NTO")[];
}

