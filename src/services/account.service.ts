// src/services/account.service.ts
import { prisma } from "../config/db";
import { AppError } from "../utils/appError";

interface CreateAccountInput {
  userId: number;
  name: string;
  number: string;
  amount: number;
}

interface AddMoneyInput {
  userId: number;
  accountId: number;
  amount: number;
}

export const accountService = {
  async getAccounts(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 400);

    const accounts = await prisma.account.findMany({ where: { userId } });
    return accounts;
  },

  async createAccount({ userId, name, number, amount }: CreateAccountInput) {
    const existingAccount  = await prisma.account.findUnique({ where: { accountNumber: number } });
    if (existingAccount) throw new AppError("This account number has been used before.", 400);

    
    const account = await prisma.account.create({
      data: {
        userId,
        accountName: name,
        accountNumber: number,
        accountBalance: amount,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        description: `${account.accountName} (Initial Deposit)`,
        type: "income",
        status: "Completed",
        amount,
        accountId: account.id,
        source: account.accountName,
      },
    });

    return account;
  },

  async addMoneyToAccount({ userId, accountId, amount }: AddMoneyInput) {
    if (amount <= 0)
      throw new AppError("Amount must be greater than zero", 400);

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new AppError("Account not found", 404);

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        accountBalance: { increment: amount },
        updatedAt: new Date(),
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        description: `${updatedAccount.accountName} (Deposit)`,
        type: "income",
        status: "Completed",
        amount,
        accountId: account.id,
        source: updatedAccount.accountName,
      },
    });

    return updatedAccount;
  },
};
