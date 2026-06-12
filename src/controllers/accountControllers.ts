import { Request, Response } from "express";
import { prisma } from "../config/db";
import { sendError, sendSuccess } from "../utils/response";

const getAccounts = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new Error("Unauthorized - no user on request");
    }

    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return sendError(res, "User not found", 400);
    }

    // 💥 INTENTIONAL ERROR TEST
    const accounts = await prisma.account.findMany({
      where: {
        userId: userId,
      },
    });

    return sendSuccess(res, "Accounts Fetched Successfully", { accounts }, 200);
  } catch (error) {
    return sendError(res, "Something went wrong", 500, error);
  }
};

const createAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, number, amount } = req.body;

    // 1. Create account
    const account = await prisma.account.create({
      data: {
        userId,
        accountName: name,
        accountNumber: number,
        accountBalance: amount,
      },
    });

    // 2. Create initial transaction
    await prisma.transaction.create({
      data: {
        userId,
        description: `${account.accountName} (Initial Deposit)`,
        type: "income",
        status: "Completed",
        amount: amount,
        accountId : account.id,
        source: account.accountName,
      },
    });

    return sendSuccess(
      res,
      "Account created successfully",
      { data: account },
      201
    );
  } catch (error: any) {
    console.error(error);

    return sendError(res, "Failed to create account", 500, error);
  }
};

 const addMoneyToAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accountId = Number(req.params.id);
    const amount = Number(req.body.amount);

    // 1. Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
      });
    }

    // 2. Ensure account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    // 3. Update balance
    const updatedAccount = await prisma.account.update({
      where: {
        id: accountId,
      },
      data: {
        accountBalance: {
          increment: amount,
        },
        updatedAt: new Date(),
      },
    });

    // 4. Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        description: `${updatedAccount.accountName} (Deposit)`,
        type: "income",
        status: "Completed",
        amount: amount,
        accountId : account.id,
        source: updatedAccount.accountName,
      },
    });
    

    return sendSuccess(
      res,
      "Operation completed successfully",
      updatedAccount,
      200
    );
  } catch (error: any) {
    console.error(error);

    sendError(res, "Failed to add money", 500, error);
  }
};

export { getAccounts, createAccount, addMoneyToAccount};
