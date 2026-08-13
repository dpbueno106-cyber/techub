"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = verifyAdmin;
const auth_1 = require("firebase-admin/auth");
async function verifyAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: "Missing authorization header"
            });
        }
        const token = authHeader.replace("Bearer ", "");
        const decoded = await (0, auth_1.getAuth)()
            .verifyIdToken(token);
        if (!decoded.admin) {
            return res.status(403).json({
                error: "Admin access required"
            });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error("Auth failed:", err);
        return res.status(401).json({
            error: "Unauthorized"
        });
    }
}
