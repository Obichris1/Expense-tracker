import { CookieOptions } from "express"

export const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite:
      process.env.NODE_ENV !== "development"
        ? "none"
        : "lax",
    maxAge: 15 * 60 * 1000,
  };