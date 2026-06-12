"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        let token;
        // 1️⃣ Check Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
        // 2️⃣ Fallback to HTTP-only cookie
        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: Authentication token missing",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log(decoded);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token",
        });
    }
};
exports.authMiddleware = authMiddleware;
