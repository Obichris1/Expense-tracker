import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { cookieOptions } from "../utils/cookieOptions";
import { sendSuccess, sendError } from "../utils/response";
import { AppError } from "../utils/appError";

function handleError(res: Response, error: unknown) {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }
  return sendError(
    res,
    error instanceof Error ? error.message : "Something went wrong"
  );
}

export async function register(req: Request, res: Response) {
  try {
    const { firstName, lastName, email, password } = req.body;

    const newUser = await authService.register({
      firstName,
      lastName,
      email,
      password,
    });

    return sendSuccess(res, "User created successfully", newUser, 201);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.login({
      email,
      password,
    });

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // 200: login doesn't create a resource
    return sendSuccess(res, "User logged in successfully", user, 200);
  } catch (error) {
    return handleError(res, error);
  }
}
  
export async function logout(req: Request, res: Response) {
  try {
    const expired = { httpOnly: true, expires: new Date(0) };
    res.cookie("accessToken", "", expired);
    res.cookie("refreshToken", "", expired);

    return sendSuccess(res, "User logged out successfully", null, 200);
  } catch (error) {
    return handleError(res, error);
  }
}

export function getUser(req: Request, res: Response) {
  if (!req.user) {
    return sendError(res, "Unauthorized", 401);
  }
  return sendSuccess(res, "fetched", req.user, 200);
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const newAccessToken = await authService.refreshAccessToken(
      req.cookies?.refreshToken
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });

    return sendSuccess(res, "Access token refreshed", null, 200);
  } catch (error) {
    return handleError(res, error);
  }
}