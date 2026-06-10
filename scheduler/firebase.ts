// Prefer real Firestore when service account is present, otherwise use an in-memory stub
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let _savedSchedule: any[] | null = null;

function makeStubDb() {
  return {
    collection() {
      return {
        doc() {
          return {
            async get() {
              return { exists: _savedSchedule !== null, data: () => ({ schedule: _savedSchedule }) };
            },
            async set(payload: any) {
              _savedSchedule = payload.schedule ?? payload;
              return Promise.resolve();
            }
          };
        }
      };
    }
  };
}

let db: any;

try {
  // try to load service account and firebase-admin; fall back on stub if not present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require("firebase-admin");
  const serviceAccount = require("./serviceAccountKey.json");

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
} catch (err) {
  db = makeStubDb();
}

export { db };

