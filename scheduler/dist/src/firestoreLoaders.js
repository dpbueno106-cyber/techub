"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfigFromFirestore = loadConfigFromFirestore;
exports.loadCatalogFromFirestore = loadCatalogFromFirestore;
exports.loadInstructorsFromFirestore = loadInstructorsFromFirestore;
exports.attachPossibleInstructors = attachPossibleInstructors;
const firebase_1 = require("../firebase");
// =========================
// GENERATION CONFIG
// =========================
async function loadConfigFromFirestore() {
    const snap = await firebase_1.db
        .collection("config")
        .doc("generation")
        .get();
    if (!snap.exists) {
        throw new Error("Generation config not found");
    }
    return snap.data();
}
// =========================
// CATALOG
// =========================
async function loadCatalogFromFirestore() {
    const snapshot = await firebase_1.db
        .collection("catalog")
        .where("isActive", "==", true)
        .get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}
// =========================
// INSTRUCTORS
// =========================
async function loadInstructorsFromFirestore() {
    const snapshot = await firebase_1.db
        .collection("instructors")
        .get();
    const instructors = snapshot.docs.map(doc => {
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
    console.log("Loaded instructors:", instructors.map(i => ({
        id: i.id,
        capabilities: i.capabilities,
        maxClasses: i.maxClasses
    })));
    return instructors;
}
function attachPossibleInstructors(catalog, instructors) {
    return catalog.map(cls => {
        const possibleInstructors = instructors
            .filter(inst => inst.capabilities?.includes(cls.name))
            .map(inst => inst.id);
        console.log(cls.name, possibleInstructors);
        return {
            ...cls,
            possibleInstructors
        };
    });
}
