const admin = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { cert } = require("firebase-admin/app");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: cert(serviceAccount),
});

const UID = "QSulHdeDRNUbiAPjQ016qxrDhrv1"; // your UID

async function setAdmin() {
  await getAuth().setCustomUserClaims(UID, {
    admin: true,
  });

  console.log("Admin claim set successfully");
  process.exit(0);
}

setAdmin().catch(err => {
  console.error("Failed to set admin claim:", err);
  process.exit(1);
});