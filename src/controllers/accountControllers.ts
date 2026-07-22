// src/controllers/account.controller.ts
import { Request, Response } from "express";
import { accountService } from "../services/account.service";
import { sendSuccess, sendError } from "../utils/response";
import { AppError } from "../utils/appError";

function handleError(res: Response, error: unknown) {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }
  console.error(error);
  return sendError(res, "Something went wrong", 500);
}

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "Unauthorized", 401);

    const accounts = await accountService.getAccounts(userId);
    return sendSuccess(res, "Accounts fetched successfully", { accounts }, 200);
  } catch (error) {
    return handleError(res, error);
  }
};

export const createAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "Unauthorized", 401);

    const { name, number, amount } = req.body;
    const account = await accountService.createAccount({ userId, name, number, amount });
    return sendSuccess(res, "Account created successfully", { data: account }, 201);
  } catch (error) {
    return handleError(res, error);
  }
};

export const addMoneyToAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "Unauthorized", 401);

    const accountId = Number(req.params.id);
    const amount = Number(req.body.amount);

    const updatedAccount = await accountService.addMoneyToAccount({ userId, accountId, amount });
    return sendSuccess(res, "Operation completed successfully", updatedAccount, 200);
  } catch (error) {
    return handleError(res, error);
  }
};