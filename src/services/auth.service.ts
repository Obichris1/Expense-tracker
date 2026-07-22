import * as jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { AppError } from "../utils/appError";

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const SALT_ROUNDS = 10;

export const authService = {
  async register({ firstName, lastName, email, password }: RegisterInput) {
    const userExist = await prisma.user.findUnique({ where: { email } });

    if (userExist) {
      throw new AppError("User with this email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
      // Never return the password hash to the client
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

    return newUser;
  },

  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("Invalid credentials", 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 400);
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Persist refresh token so it can be validated/revoked later
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    };
  },

  async refreshAccessToken(token: string | undefined) {
    if (!token) {
      throw new AppError("Refresh token missing", 401);
    }

    let decoded: { userId: number };
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
        userId: number;
      };
    } catch {
      throw new AppError("Invalid refresh token", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== token) {
      throw new AppError("Invalid refresh token", 403);
    }

    return generateAccessToken(user.id);
  },
};