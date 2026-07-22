import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/response';
import * as transactionService from '../services/transaction.service';
import { ServiceError } from '../services/transaction.service';

// ✅ Maps a ServiceError to its intended status code, falls back to 500
const handleServiceError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof ServiceError) {
    return sendError(res, error.message, error.statusCode, error);
  }
  return sendError(res, fallbackMessage, 500, error);
};

const getQueryString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  return undefined;
};

const getQueryNumber = (value: unknown): number | undefined => {
  if (typeof value === "string") {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const page = getQueryNumber(req.query.page) ?? 1;
    const limit = getQueryNumber(req.query.limit) ?? 10;
    const df = getQueryString(req.query.df);
    const dt = getQueryString(req.query.dt);
    const search = getQueryString(req.query.s) || "";

    const result = await transactionService.getTransactions({
      userId,
      page,
      limit,
      df,
      dt,
      search,
    });

    return sendSuccess(res, "Transactions fetched successfully", result, 200);
  } catch (error) {
    return handleServiceError(res, error, "Failed to fetch transactions");
  }
};

const addTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;
    const { amount, description, source, category, type } = req.body;

    await transactionService.addTransaction({
      userId,
      accountId: Number(accountId),
      amount,
      description,
      source,
      category,
      type,
    });

    return sendSuccess(res, "Transaction successful", {}, 200);
  } catch (error) {
    return handleServiceError(res, error, "Failed to add transaction");
  }
};

const transferMoneyToAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { from_account, to_account, amount } = req.body;

    await transactionService.transferMoneyToAccount({
      userId,
      from_account,
      to_account,
      amount,
    });

    return sendSuccess(res, "Transfer Successful", {}, 200);
  } catch (error) {
    return handleServiceError(res, error, "Transaction Failed");
  }
};

const getDashboardInformation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const dashboard = await transactionService.getDashboardInformation(userId);

    return sendSuccess(res, "Dashboard fetched successfully", dashboard, 200);
  } catch (error) {
    return handleServiceError(res, error, "Failed to fetch dashboard");
  }
};

const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { transactionId } = req.params;

    await transactionService.deleteTransaction(userId, Number(transactionId));

    return sendSuccess(res, "Transaction deleted successfully", {}, 200);
  } catch (error) {
    return handleServiceError(res, error, "Failed to delete transaction");
  }
};

const updateTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { transactionId } = req.params;
    const { amount, description, source, type, category } = req.body;

    await transactionService.updateTransaction({
      userId,
      transactionId: Number(transactionId),
      amount,
      description,
      source,
      type,
      category,
    });

    return sendSuccess(res, "Transaction updated successfully", {}, 200);
  } catch (error) {
    return handleServiceError(res, error, "Failed to update transaction");
  }
};

// ✅ Thin wrapper kept for compatibility — pass the multer file straight to the service
const ScanReceipt = transactionService.scanReceipt;

export {
  getTransactions,
  addTransactions,
  transferMoneyToAccount,
  getDashboardInformation,
  deleteTransaction,
  updateTransaction,
  ScanReceipt,
};