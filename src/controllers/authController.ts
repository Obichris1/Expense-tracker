import * as jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { cookieOptions } from "../utils/cookieOptions";
import { sendSuccess, sendError } from "../utils/response";

export async function register(req: Request, res: Response) {
  try {
    const { firstName,lastName, email, password } = req.body;

    // check if user exists

    const userExist = await prisma.user.findUnique({
      where: { email: email },
    });

    if (userExist) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const saltedRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltedRounds);

    const newUser = await prisma.user.create({
      data: {

         firstName,
         lastName,
        email: email,
        password: hashedPassword,
      },
    });
    sendSuccess(
      res,
      "User created Successfully",
      newUser,

      201
    );
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Something went wrong"
    );
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, "Invalid Credentials",  400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Email or password is invalid" });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshToken },
    });

    // Set cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // return res.status(200).json({
    //   status: "success",
    //   data: {
    //     id: user.id,
    //     email,
    //     // optional: you can omit sending tokens in response if using cookies
    //   },
    //   message: "User logged in successfully",
    // });

    sendSuccess(
      res,
      "User logged in successfully",
      { id: user.id, email },

      201
    );
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Something went wrong"
    );
  }
}

export async function logout(req: Request, res: Response) {
  res.cookie("accessToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({
    status: "success",
    message: "User logged out successfully",
  });
}


export const getUser = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  return sendSuccess(res, "fetched", req.user, 200);
};


export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
      userId: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user.id);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ message: "Access token refreshed" });
  } catch {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};



