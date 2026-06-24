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
  const snapshot = await db.collection("instructors").get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Instructor, "id">)
  }));
}