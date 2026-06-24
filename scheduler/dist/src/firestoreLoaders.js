"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfigFromFirestore = loadConfigFromFirestore;
exports.loadCatalogFromFirestore = loadCatalogFromFirestore;
exports.loadInstructorsFromFirestore = loadInstructorsFromFirestore;
const firebase_1 = require("../firebase");
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
    const snapshot = await firebase_1.db.collection("instructors").get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}
