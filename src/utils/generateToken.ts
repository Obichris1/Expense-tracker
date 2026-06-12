import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (userId: number) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "30m",
  });
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
