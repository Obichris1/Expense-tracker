"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieOptions = void 0;
exports.cookieOptions = {
    httpOnly: true,
    secure: true, // MUST be true in production
    sameSite: "none", // REQUIRED for cross-site frontend/backend
    maxAge: 15 * 60 * 1000,
};
