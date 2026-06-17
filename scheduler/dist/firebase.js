"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
//  Initialize Firebase Admin
(0, app_1.initializeApp)({
    credential: (0, app_1.applicationDefault)()
});
//  Firestore instance
const db = (0, firestore_1.getFirestore)();
exports.db = db;
