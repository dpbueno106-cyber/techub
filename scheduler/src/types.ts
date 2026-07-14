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
export interface FixedPlacement {
  id?: string;
  className: string;
  weekStartDate: string;
  location: Location;
  instructorName?: string | null;
  locked?: boolean;
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
  possibleInstructors?: string[];
  isActive: boolean;
}
export interface GenerationConfig {
  year: number;
  totalClasses: number;
  maxConsecutiveWeeks: number;
  maxClassesPerWeek: number;

  categoryCaps: {
    Foundational: number;
    Advanced: number;
  };

  nto: {
    enabled: boolean;
    locations: Location[];
  };
}
export interface RecommendedInstructor {
  id: string;
  name?: string;
  score: number;
}
export type UserRole = "admin" | "instructor" | "pending";


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
  possibleInstructors?: string[];
  instructorName?: string | null;
  recommendedInstructors?: RecommendedInstructor[];
  locked?: boolean;
}

export interface Instructor {
  id: string;

  name: string;
  email: string;

  homeLocation: string;
  canTravel: boolean;

  capabilities: string[];

  availability: string[];

  maxClasses: number;
}

