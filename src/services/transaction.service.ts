import { Prisma, TransactionCategory } from '@prisma/client';
import { prisma } from '../config/db';
import { inngest } from '../inngest/index';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAi = new GoogleGenAI({
  apiKey,
});

// ✅ Custom error so the controller can map it to the right HTTP status
export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const getMonthName = (monthIndex: number) => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return months[monthIndex];
};

const RECEIPT_PROMPT = `You are a receipt data extraction expert. Analyze this receipt and extract all available data.
Return ONLY a valid JSON object with this structure:
{
  "merchant": "Store or restaurant name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM or null",
  "currency": "Currency symbol",
  "payment_method": "Cash/Card/etc or null",
  "category": "Overall receipt category (e.g. Dining, Groceries, Transport)",
  "line_items": [
    {
      "name": "Item name",
      "quantity": 1,
      "unit_price": 0.00,
      "amount": 0.00,
      "category": "Item category"
    }
  ],
  "totals": {
    "subtotal": 0.00,
    "tax": 0.00,
    "discount": 0.00,
    "total": 0.00
  },
  "expense_categories": [
    { "category": "Category name", "amount": 0.00 }
  ],
  "notes": "Loyalty points, order numbers, or any extra info"
}
Only include fields visible on the receipt. Group line items into expense_categories by type.`;

interface LineItem {
  name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  category: string;
}

interface ReceiptData {
  merchant: string;
  date: string;
  time: string | null;
  currency: string;
  payment_method: string | null;
  category: string;
  line_items: LineItem[];
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
  expense_categories: { category: string; amount: number }[];
  notes: string | null;
}

// ✅ Helper function to update budget spent
const updateBudgetSpent = async (userId: number, amount: number, type: 'add' | 'subtract') => {
  try {
    const budget = await prisma.budget.findUnique({
      where: { userId },
    });

    if (!budget) {
      // No budget set, skip update
      return null;
    }

    const currentSpent = budget.spent.toNumber();
    const amountNum = typeof amount === 'number' ? amount : Number(amount);

    const newSpent = type === 'add'
      ? currentSpent + amountNum
      : Math.max(0, currentSpent - amountNum);

    const updatedBudget = await prisma.budget.update({
      where: { userId },
      data: {
        spent: new Prisma.Decimal(newSpent),
      },
    });

    // Check if budget exceeded and send alert if needed
    if (newSpent > budget.amount.toNumber()) {
      const now = new Date();
      const lastAlert = budget.lastAlertSent;

      // Send alert only once per day
      if (!lastAlert || (now.getTime() - lastAlert.getTime()) > 24 * 60 * 60 * 1000) {
        await prisma.budget.update({
          where: { userId },
          data: {
            lastAlertSent: now,
          },
        });

        // TODO: Implement email/notification service here
        console.log(`⚠️ Budget Alert: User ${userId} has exceeded their budget!`);
        console.log(`Budget: ₦${budget.amount.toNumber()}, Spent: ₦${newSpent}`);
      }
    }

    return updatedBudget;
  } catch (error) {
    console.error('Error updating budget spent:', error);
    return null;
  }
};

interface GetTransactionsParams {
  userId: number;
  page: number;
  limit: number;
  df?: string;
  dt?: string;
  search: string;
}

const getTransactions = async ({ userId, page, limit, df, dt, search }: GetTransactionsParams) => {
  const offset = (page - 1) * limit;

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const startDate = df ? new Date(df) : sevenDaysAgo;
  const endDate = dt ? new Date(dt) : new Date();

  const where = {
    userId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    ...(search && {
      OR: [
        {
          description: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          status: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          source: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      take: limit,
      skip: offset,
      where,
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return { data, limit, total, totalPages };
};

interface AddTransactionParams {
  userId: number;
  accountId: number;
  amount: number | string;
  description: string;
  source: string;
  category: TransactionCategory;
  type: string;
}

const addTransaction = async ({
  userId,
  accountId,
  amount,
  description,
  source,
  category,
  type,
}: AddTransactionParams) => {
  if (!description || !amount || !type) {
    throw new ServiceError("Please enter all required fields", 403);
  }

  if (Number(amount) <= 0) {
    throw new ServiceError("Enter a valid amount", 403);
  }

  // Normalize type — default to expense
  const transactionType: "income" | "expense" =
    type === "income" ? "income" : "expense";

  const accountInfo = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!accountInfo) {
    throw new ServiceError("Account not found", 404);
  }

  // Only check balance for expenses
  if (transactionType === "expense") {
    if (
      accountInfo.accountBalance.lte(new Prisma.Decimal(0)) ||
      accountInfo.accountBalance.lt(new Prisma.Decimal(amount))
    ) {
      throw new ServiceError("Insufficient balance", 400);
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const amountDecimal = new Prisma.Decimal(amount);

    // Credit for income, debit for expense
    await tx.account.update({
      where: { id: accountId },
      data: {
        accountBalance:
          transactionType === "income"
            ? { increment: amountDecimal }
            : { decrement: amountDecimal },
      },
    });

    return tx.transaction.create({
      data: {
        userId,
        description,
        type: transactionType,
        status: "Completed",
        amount: amountDecimal,
        source,
        accountId,
        category: category || "OTHER",
      },
    });
  });

  await inngest.send({
    name: "transaction/created",
    data: {
      transactionId: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: Number(transaction.amount),
    },
  });

  // Only update budget spent for expenses (not income/salary)
  if (transactionType === "expense") {
    await updateBudgetSpent(userId, Number(amount), "add");
  }

  return transaction;
};

interface TransferMoneyParams {
  userId: number;
  from_account: string;
  to_account: string;
  amount: number | string;
}

const transferMoneyToAccount = async ({
  userId,
  from_account,
  to_account,
  amount,
}: TransferMoneyParams) => {
  if (!from_account || !to_account || !amount) {
    throw new ServiceError("Provide required fields", 400);
  }

  const amountDecimal = new Prisma.Decimal(amount);

  if (amountDecimal.lte(0)) {
    throw new ServiceError("Amount must be greater than 0", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const fromAccount = await tx.account.findUnique({
      where: { accountNumber: from_account },
    });

    const toAccount = await tx.account.findUnique({
      where: { accountNumber: to_account },
    });

    if (!fromAccount || !toAccount) {
      throw new ServiceError("Account information not found.", 404);
    }

    if (fromAccount.accountBalance.lt(amountDecimal)) {
      throw new ServiceError("Insufficient account balance.", 400);
    }

    // debit sender
    await tx.account.update({
      where: { accountNumber: from_account },
      data: {
        accountBalance: {
          decrement: amountDecimal,
        },
      },
    });

    // credit receiver
    await tx.account.update({
      where: { accountNumber: to_account },
      data: {
        accountBalance: {
          increment: amountDecimal,
        },
      },
    });

    const description = `Transfer (${fromAccount.accountName} → ${toAccount.accountName})`;

    // sender transaction (expense)
    const senderTx = await tx.transaction.create({
      data: {
        userId,
        description,
        type: "expense",
        status: "Completed",
        amount: amountDecimal,
        source: fromAccount.accountName,
        accountId: fromAccount.id,
        category: "TRANSFER",
      },
    });

    // receiver transaction (income)
    const receiverTx = await tx.transaction.create({
      data: {
        userId,
        description: `Received (${fromAccount.accountName} → ${toAccount.accountName})`,
        type: "income",
        status: "Completed",
        amount: amountDecimal,
        source: toAccount.accountName,
        accountId: toAccount.id,
        category: "TRANSFER",
      },
    });

    return { senderTx, receiverTx };
  });

  // 🔥 Emit BOTH events AFTER commit
  await inngest.send([
    {
      name: "transaction/created",
      data: {
        transactionId: result.senderTx.id,
        userId,
        type: "expense",
        amount: Number(amountDecimal),
      },
    },
    {
      name: "transaction/created",
      data: {
        transactionId: result.receiverTx.id,
        userId,
        type: "income",
        amount: Number(amountDecimal),
      },
    },
  ]);

  await updateBudgetSpent(userId, Number(amount), "add");

  return result;
};

const getDashboardInformation = async (userId: number) => {
  // ✅ 1. Group totals (income vs expense)
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true },
  });

  const totalIncome =
    grouped.find((t) => t.type === "income")?._sum.amount?.toNumber() || 0;

  const totalExpense =
    grouped.find((t) => t.type === "expense")?._sum.amount?.toNumber() || 0;

  const availableBalance = totalIncome - totalExpense;

  // ✅ 2. Monthly aggregation
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const monthly = await prisma.transaction.groupBy({
    by: ["type", "createdAt"],
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: { amount: true },
  });

  const chartData = new Array(12).fill(null).map((_, index) => {
    const monthData = monthly.filter(
      (item) => new Date(item.createdAt).getMonth() === index
    );

    const income =
      monthData
        .filter((m) => m.type === "income")
        .reduce((acc, curr) => acc + (curr._sum.amount?.toNumber() || 0), 0) || 0;

    const expense =
      monthData
        .filter((m) => m.type === "expense")
        .reduce((acc, curr) => acc + (curr._sum.amount?.toNumber() || 0), 0) || 0;

    return {
      label: getMonthName(index),
      income,
      expense,
    };
  });

  // ✅ 3. Last transactions
  const lastTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    take: 5,
  });

  // ✅ 4. Last accounts
  const lastAccount = await prisma.account.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    take: 4,
  });

  // ✅ 5. Get budget information
  const budget = await prisma.budget.findUnique({
    where: { userId },
  });

  let budgetData = null;
  if (budget) {
    const percentageSpent = (budget.spent.toNumber() / budget.amount.toNumber()) * 100;
    budgetData = {
      id: budget.id,
      name: budget.name,
      amount: budget.amount.toNumber(),
      spent: budget.spent.toNumber(),
      remaining: budget.amount.toNumber() - budget.spent.toNumber(),
      percentageSpent: Math.round(percentageSpent * 100) / 100,
      lastAlertSent: budget.lastAlertSent,
    };
  }

  return {
    availableBalance,
    totalIncome,
    totalExpense,
    chartData,
    lastTransactions,
    lastAccount,
    budget: budgetData,
  };
};

const deleteTransaction = async (userId: number, transactionId: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new ServiceError("Transaction not found", 404);
  }

  if (transaction.userId !== userId) {
    throw new ServiceError("Unauthorized to delete this transaction", 403);
  }

  const transactionType = transaction.type;
  const transactionAmount = transaction.amount.toNumber();
  const accountId = transaction.accountId;

  // Delete transaction and update account balance
  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({
      where: { id: transactionId },
    });

    const account = await tx.account.findUnique({
      where: { id: accountId },
    });

    if (account) {
      const currentBalance = account.accountBalance.toNumber();
      const newBalance = transactionType === 'income'
        ? currentBalance - transactionAmount
        : currentBalance + transactionAmount;

      await tx.account.update({
        where: { id: accountId },
        data: {
          accountBalance: new Prisma.Decimal(newBalance),
        },
      });
    }
  });

  // ✅ Update budget if it was an expense
  if (transactionType === 'expense') {
    await updateBudgetSpent(userId, transactionAmount, 'subtract');
  }
};

interface UpdateTransactionParams {
  userId: number;
  transactionId: number;
  amount?: number | string;
  description?: string;
  source?: string;
  type?: 'income' | 'expense';
  category?: TransactionCategory;
}

const updateTransaction = async ({
    userId,
    transactionId,
    amount,
    description,
    source,
    type,
    category,
  }: UpdateTransactionParams) => {
    const oldTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
  
    if (!oldTransaction) {
      throw new ServiceError("Transaction not found", 404);
    }
  
    if (oldTransaction.userId !== userId) {
      throw new ServiceError("Unauthorized to update this transaction", 403);
    }
  
    const oldAmount = oldTransaction.amount.toNumber();
    const oldType = oldTransaction.type;
    const newAmount = amount !== undefined ? Number(amount) : oldAmount;
    const newType = type || oldType;
  
    // Update transaction and account balance
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
          ...(description !== undefined && { description }),
          ...(source !== undefined && { source }),
          ...(type !== undefined && { type }),
          ...(category !== undefined && { category }),
        },
      });
  
      // ...rest unchanged

    // If amount or type changed, update account balance
    if (amount !== undefined || type !== undefined) {
      const account = await tx.account.findUnique({
        where: { id: oldTransaction.accountId },
      });

      if (account) {
        let currentBalance = account.accountBalance.toNumber();

        // Reverse old transaction
        if (oldType === 'income') {
          currentBalance -= oldAmount;
        } else {
          currentBalance += oldAmount;
        }

        // Apply new transaction
        if (newType === 'income') {
          currentBalance += newAmount;
        } else {
          currentBalance -= newAmount;
        }

        await tx.account.update({
          where: { id: oldTransaction.accountId },
          data: {
            accountBalance: new Prisma.Decimal(currentBalance),
          },
        });
      }
    }
  });

  // ✅ Update budget if needed
  if (amount !== undefined || type !== undefined) {
    if (oldType === 'expense') {
      await updateBudgetSpent(userId, oldAmount, 'subtract');
    }

    if (newType === 'expense') {
      await updateBudgetSpent(userId, newAmount, 'add');
    }
  }
};

const scanReceipt = async (file: Express.Multer.File): Promise<ReceiptData> => {
  if (!file?.buffer) {
    throw new ServiceError("File buffer missing. Ensure multer uses memoryStorage.", 400);
  }

  const base64Data = file.buffer.toString("base64");
  const mimeType = file.mimetype;

  const response = await genAi.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: RECEIPT_PROMPT },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
  });

  const rawText = response.text ?? "";
  const cleaned = rawText.replace(/```json|```/gi, "").trim();

  return JSON.parse(cleaned);
};

export {
  updateBudgetSpent,
  getTransactions,
  addTransaction,
  transferMoneyToAccount,
  getDashboardInformation,
  deleteTransaction,
  updateTransaction,
  scanReceipt,
  type LineItem,
  type ReceiptData,
};