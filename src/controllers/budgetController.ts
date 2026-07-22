import { Request, Response } from "express";
import { budgetService } from "../services/budget.service";
import { sendSuccess, sendError } from "../utils/response";
import { AppError } from "../utils/appError";

function handleError(res: Response, error: unknown) {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }
  console.error(error);
  return sendError(res, "Internal server error", 500);
}

export async function upsertBudget(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const { name, amount } = req.body;

    const { budget, created } = await budgetService.upsertBudget({
      userId,
      name,
      amount,
    });

    return sendSuccess(
      res,
      created ? "Budget created successfully" : "Budget updated successfully",
      budget,
      created ? 201 : 200
    );
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getBudget(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const budget = await budgetService.getBudget(userId);

    return sendSuccess(res, "Budget fetched successfully", budget, 200);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteBudget(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    await budgetService.deleteBudget(userId);

    return sendSuccess(res, "Budget deleted successfully", null, 200);
  } catch (error) {
    return handleError(res, error);
  }
}