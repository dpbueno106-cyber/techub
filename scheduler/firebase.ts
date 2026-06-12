const admin = require("firebase-admin");

let _savedSchedule: any[] | null = null;

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
  const serviceAccount = require("./serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  db = admin.firestore();

} catch (err) {
  console.log("Using stub DB");
  db = makeStubDb();
}

export { db };