import { db } from "../firebase";
import type {
  ScheduleConfig,
  ClassDefinition,
  Instructor
} from "./types";

// =========================
// CONFIG
// =========================
export async function loadConfigFromFirestore(): Promise<ScheduleConfig | null> {
  const snap = await db.collection("config").doc("current").get();
  if (!snap.exists) return null;

  return snap.data() as ScheduleConfig;
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