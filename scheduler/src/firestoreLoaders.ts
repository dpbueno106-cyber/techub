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

  const config = snap.data() as GenerationConfig;

  // Cheap visibility for exactly the kind of "why isn't NTO generating"
  // debugging we just went through — this prints what the engine will
  // actually receive, straight from Firestore, every time a schedule
  // is generated.
  console.log("Loaded generation config:", {
    year: config.year,
    totalClasses: config.totalClasses,
    maxClassesPerWeek: config.maxClassesPerWeek,
    nto: config.nto
  });

  return config;
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
    .collection("instructors")
    .get();

  const instructors: Instructor[] = snapshot.docs.map(doc => {
  const data = doc.data();

  return {
    id: doc.id,
    email: data.email ?? "",
    name: data.name ?? data.email ?? doc.id,

    capabilities: data.capabilities ?? [],
    availability: data.availability ?? [],
    maxClasses: data.maxClasses ?? 20,

    homeLocation: data.homeLocation ?? "IN",
    canTravel: data.canTravel ?? false
  };
});

console.log(
  "Loaded instructors:",
  instructors.map(i => ({
    id: i.id,
    capabilities: i.capabilities,
    maxClasses: i.maxClasses
  }))
);


  return instructors;
}




export function attachPossibleInstructors(
  catalog: ClassDefinition[],
  instructors: Instructor[]
): ClassDefinition[] {

  return catalog.map(cls => {

    const possibleInstructors = instructors
  .filter(inst =>
    inst.capabilities?.includes(cls.name)
  )
  .map(inst => inst.id);
  console.log(
  cls.name,
  possibleInstructors
);
    return {
      ...cls,
      possibleInstructors
    };
  });
}