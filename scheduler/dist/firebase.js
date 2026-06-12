"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const admin = require("firebase-admin");
let _savedSchedule = null;
function makeStubDb() {
    return {
        collection() {
            return {
                doc() {
                    return {
                        async get() {
                            return {
                                exists: _savedSchedule !== null,
                                data: () => ({ schedule: _savedSchedule })
                            };
                        },
                        async set(payload) {
                            _savedSchedule = payload.schedule ?? payload;
                            return Promise.resolve();
                        }
                    };
                }
            };
        }
    };
}
let db;
try {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    exports.db = db = admin.firestore();
}
catch (err) {
    console.log("Using stub DB");
    exports.db = db = makeStubDb();
}
