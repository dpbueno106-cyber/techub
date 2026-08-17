import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export async function verifyAdmin(
  req: any,
  res: any,
  next: any
) {
  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header"
      });
    }

    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );

    const decoded =
      await getAuth()
        .verifyIdToken(token);

    

const userDoc = await getFirestore()
  .collection("users")
  .doc(decoded.uid)
  .get();

if (
  userDoc.data()?.role !== "admin"
) {
  return res.status(403).json({
    error: "Admin access required"
  });
}

    req.user = decoded;

    next();

  } catch (err) {

    console.error(
      "Auth failed:",
      err
    );

    return res.status(401).json({
      error: "Unauthorized"
    });
  }
}