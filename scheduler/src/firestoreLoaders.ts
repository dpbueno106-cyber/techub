import { db } from "../firebase";
import type {
  ClassDefinition,
  Instructor,
  GenerationConfig
} from "./types";

// =========================
// GENERATION CONFIG
// =========================

export async function loadConfigFromFirestore(): Promise<GenerationConfig> {
  const snap = await db
    .collection("config")
    .doc("generation")
    .get();

  if (!snap.exists) {
    throw new Error("Generation config not found");
  }

  return snap.data() as GenerationConfig;
}

// =========================
// CATALOG
// =========================

export async function loadCatalogFromFirestore(): Promise<ClassDefinition[]> {
  const snapshot = await db
    .collection("catalog")
    .where("isActive", "==", true)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<ClassDefinition, "id">)
  }));
}

// =========================
// INSTRUCTORS
// =========================

export async function loadInstructorsFromFirestore(): Promise<Instructor[]> {
  const snapshot = await db
    .collection("users")
    .where("role", "==", "instructor")
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Instructor, "id">)
  }));
}




export function attachPossibleInstructors(
  catalog: ClassDefinition[],
  instructors: Instructor[]
): ClassDefinition[] {
  return catalog.map(cls => {
    // Match by level OR category (choose one)
    const possible = instructors
      .filter(i =>
        i.canTeach?.includes(cls.category)
      )
      .map(i => i.id);

    return {
      ...cls,
      possibleInstructors: possible.length ? possible : undefined
    };
  });
}