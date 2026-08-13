"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
const firebase_1 = require("../firebase");
async function auditLog(userEmail, action, details = {}) {
    await firebase_1.db.collection("auditLogs").add({
        userEmail,
        action,
        details,
        timestamp: new Date()
    });
}
