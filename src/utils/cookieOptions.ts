import { CookieOptions } from "express"

export const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: true,        // MUST be true in production
    sameSite: "none",    // REQUIRED for cross-site frontend/backend
    maxAge: 30 * 60 * 1000,
  };