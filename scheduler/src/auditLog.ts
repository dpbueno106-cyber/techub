import { db } from "../firebase";

export async function auditLog(
  userEmail: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  await db.collection("auditLogs").add({
    userEmail,
    action,
    details,
    timestamp: new Date()
  });
}
