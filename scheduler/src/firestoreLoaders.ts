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

  const userSnapshot = await db
    .collection("instructors")
    .where("role", "==", "instructor")
    .get();

  const instructors: Instructor[] = [];

  for (const userDoc of userSnapshot.docs) {

    const userData = userDoc.data();

    const instructorDoc = await db
      .collection("instructors")
      .doc(userDoc.id)
      .get();

    const instructorData = instructorDoc.exists
      ? instructorDoc.data()
      : {};

    instructors.push({
  id: userDoc.id,
  email: userData.email,
  name: userData.name ?? userData.email,

  capabilities: instructorData?.capabilities ?? [],
  availability: instructorData?.availability ?? [],
  maxClasses: instructorData?.maxClasses ?? 2,

  homeLocation: instructorData?.homeLocation ?? "IN",
  canTravel: instructorData?.canTravel ?? []
});
  }
  console.log(instructors);
  return instructors;
}




export function attachPossibleInstructors(
  catalog: ClassDefinition[],
  instructors: Instructor[]
): ClassDefinition[] {

  return catalog.map(cls => {

    const possibleInstructors = instructors
      .filter(inst =>
        inst.capabilities?.includes(cls.category)
      )
      .map(inst => inst.id);

    return {
      ...cls,
      possibleInstructors
    };
  });
}