"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanReceipt = exports.updateTransaction = exports.deleteTransaction = exports.getDashboardInformation = exports.transferMoneyToAccount = exports.addTransactions = exports.getTransactions = void 0;
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const response_1 = require("../utils/response");
const index_1 = require("../inngest/index");
const genai_1 = require("@google/genai");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined");
}
const genAi = new genai_1.GoogleGenAI({
    apiKey,
});
const getMonthName = (monthIndex) => {
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
// ✅ Helper function to update budget spent
const updateBudgetSpent = async (userId, amount, type) => {
    try {
        const budget = await db_1.prisma.budget.findUnique({
            where: { userId },
        });
        console.log("budgetttttttt is", budget);
        if (!budget) {
            // No budget set, skip update
            return null;
        }
        const currentSpent = budget.spent.toNumber();
        const amountNum = typeof amount === 'number' ? amount : Number(amount);
        const newSpent = type === 'add'
            ? currentSpent + amountNum
            : Math.max(0, currentSpent - amountNum);
        const updatedBudget = await db_1.prisma.budget.update({
            where: { userId },
            data: {
                spent: new client_1.Prisma.Decimal(newSpent),
            },
        });
        // Check if budget exceeded and send alert if needed
        if (newSpent > budget.amount.toNumber()) {
            const now = new Date();
            const lastAlert = budget.lastAlertSent;
            // Send alert only once per day
            if (!lastAlert || (now.getTime() - lastAlert.getTime()) > 24 * 60 * 60 * 1000) {
                await db_1.prisma.budget.update({
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
    }
    catch (error) {
        console.error('Error updating budget spent:', error);
        return null;
    }
};
const getTransactions = async (req, res) => {
    try {
        const { df, dt, s } = req.query;
        const userId = req.user.userId;
        const getQueryString = (value) => {
            if (typeof value === "string")
                return value;
            return undefined;
        };
        const getQueryNumber = (value) => {
            if (typeof value === "string") {
                const num = Number(value);
                return isNaN(num) ? undefined : num;
            }
            return undefined;
        };
        const page = getQueryNumber(req.query.page) ?? 1;
        const limit = getQueryNumber(req.query.limit) ?? 10;
        const offset = (page - 1) * limit;
        const dfString = getQueryString(df);
        const dtString = getQueryString(dt);
        const search = getQueryString(s) || "";
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const startDate = dfString ? new Date(dfString) : sevenDaysAgo;
        const endDate = dtString ? new Date(dtString) : new Date();
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
                            mode: client_1.Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        status: {
                            contains: search,
                            mode: client_1.Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        source: {
                            contains: search,
                            mode: client_1.Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            }),
        };
        const [query, total] = await Promise.all([
            db_1.prisma.transaction.findMany({
                take: limit,
                skip: offset,
                where,
                orderBy: { createdAt: "desc" },
            }),
            db_1.prisma.transaction.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return (0, response_1.sendSuccess)(res, "Transactions fetched successfully", {
            data: query,
            limit,
            total,
            totalPages,
        }, 200);
    }
    catch (error) {
        (0, response_1.sendError)(res, "Failed to fetch transactions", 500, error);
    }
};
exports.getTransactions = getTransactions;
const addTransactions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accountId } = req.params;
        const { amount, description, source, category } = req.body;
        console.log("accountId param:", accountId);
        console.log("converted:", Number(accountId));
        if (!description || !amount) {
            return (0, response_1.sendError)(res, "Please enter all required fields", 403);
        }
        if (Number(amount) <= 0) {
            return (0, response_1.sendError)(res, "Enter a valid amount", 403);
        }
        const accountInfo = await db_1.prisma.account.findUnique({
            where: { id: Number(accountId) },
        });
        if (!accountInfo) {
            return (0, response_1.sendError)(res, "Account not found", 404);
        }
        if (accountInfo.accountBalance.lte(new client_1.Prisma.Decimal(0)) ||
            accountInfo.accountBalance.lt(new client_1.Prisma.Decimal(amount))) {
            return (0, response_1.sendError)(res, "Insufficient balance", 400);
        }
        // ✅ Proceed with transaction logic and budget update
        const transaction = await db_1.prisma.$transaction(async (tx) => {
            const amountDecimal = new client_1.Prisma.Decimal(amount);
            // Deduct balance
            await tx.account.update({
                where: { id: Number(accountId) },
                data: {
                    accountBalance: {
                        decrement: amountDecimal,
                    },
                },
            });
            // Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    description,
                    type: "expense",
                    status: "Completed",
                    amount: amountDecimal,
                    source,
                    accountId: Number(accountId),
                    category: category || "OTHER",
                },
            });
            return transaction; // ✅ IMPORTANT
        });
        console.log("🔥 BEFORE SEND");
        await index_1.inngest.send({
            name: "transaction/created",
            data: {
                transactionId: transaction.id,
                userId: transaction.userId,
                type: transaction.type,
                amount: Number(transaction.amount),
            },
        });
        console.log("🔥 AFTER SEND");
        // ✅ Update budget spent (outside the transaction to avoid blocking)
        await updateBudgetSpent(userId, Number(amount), 'add');
        console.log("Transaction completed successfully");
        return (0, response_1.sendSuccess)(res, "Transaction successful", {}, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Failed to add transaction", 500, error);
    }
};
exports.addTransactions = addTransactions;
const transferMoneyToAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { from_account, to_account, amount } = req.body;
        if (!from_account || !to_account || !amount) {
            return (0, response_1.sendError)(res, "Provide required fields", 400);
        }
        const amountDecimal = new client_1.Prisma.Decimal(amount);
        if (amountDecimal.lte(0)) {
            return (0, response_1.sendError)(res, "Amount must be greater than 0", 400);
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const fromAccount = await tx.account.findUnique({
                where: { accountNumber: from_account },
            });
            const toAccount = await tx.account.findUnique({
                where: { accountNumber: to_account },
            });
            if (!fromAccount || !toAccount) {
                throw new Error("Account information not found.");
            }
            if (fromAccount.accountBalance.lt(amountDecimal)) {
                throw new Error("Insufficient account balance.");
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
        await index_1.inngest.send([
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
        await updateBudgetSpent(userId, amount, "add");
        return (0, response_1.sendSuccess)(res, "Transfer Successful", {}, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Transaction Failed", 500, error);
    }
};
exports.transferMoneyToAccount = transferMoneyToAccount;
const getDashboardInformation = async (req, res) => {
    try {
        const userId = req.user.userId;
        // ✅ 1. Group totals (income vs expense)
        const grouped = await db_1.prisma.transaction.groupBy({
            by: ["type"],
            where: { userId },
            _sum: { amount: true },
        });
        const totalIncome = grouped.find((t) => t.type === "income")?._sum.amount?.toNumber() || 0;
        const totalExpense = grouped.find((t) => t.type === "expense")?._sum.amount?.toNumber() || 0;
        const availableBalance = totalIncome - totalExpense;
        // ✅ 2. Monthly aggregation
        const year = new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        const monthly = await db_1.prisma.transaction.groupBy({
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
        const data = new Array(12).fill(null).map((_, index) => {
            const monthData = monthly.filter((item) => new Date(item.createdAt).getMonth() === index);
            const income = monthData
                .filter((m) => m.type === "income")
                .reduce((acc, curr) => acc + (curr._sum.amount?.toNumber() || 0), 0) || 0;
            const expense = monthData
                .filter((m) => m.type === "expense")
                .reduce((acc, curr) => acc + (curr._sum.amount?.toNumber() || 0), 0) || 0;
            return {
                label: getMonthName(index),
                income,
                expense,
            };
        });
        // ✅ 3. Last transactions
        const lastTransactions = await db_1.prisma.transaction.findMany({
            where: { userId },
            orderBy: { id: "desc" },
            take: 5,
        });
        // ✅ 4. Last accounts
        const lastAccount = await db_1.prisma.account.findMany({
            where: { userId },
            orderBy: { id: "desc" },
            take: 4,
        });
        // ✅ 5. Get budget information
        const budget = await db_1.prisma.budget.findUnique({
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
        return (0, response_1.sendSuccess)(res, "Dashboard fetched successfully", {
            availableBalance,
            totalIncome,
            totalExpense,
            chartData: data,
            lastTransactions,
            lastAccount,
            budget: budgetData, // ✅ Include budget in dashboard response
        }, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Failed to fetch dashboard", 500, error);
    }
};
exports.getDashboardInformation = getDashboardInformation;
// ✅ NEW: Delete transaction with budget update
const deleteTransaction = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { transactionId } = req.params;
        const transaction = await db_1.prisma.transaction.findUnique({
            where: { id: Number(transactionId) },
        });
        if (!transaction) {
            return (0, response_1.sendError)(res, "Transaction not found", 404);
        }
        if (transaction.userId !== userId) {
            return (0, response_1.sendError)(res, "Unauthorized to delete this transaction", 403);
        }
        const transactionType = transaction.type;
        const transactionAmount = transaction.amount.toNumber();
        const accountId = transaction.accountId;
        // Delete transaction and update account balance
        await db_1.prisma.$transaction(async (tx) => {
            // Delete the transaction
            await tx.transaction.delete({
                where: { id: Number(transactionId) },
            });
            // Reverse the account balance change
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
                        accountBalance: new client_1.Prisma.Decimal(newBalance),
                    },
                });
            }
        });
        // ✅ Update budget if it was an expense
        if (transactionType === 'expense') {
            await updateBudgetSpent(userId, transactionAmount, 'subtract');
        }
        return (0, response_1.sendSuccess)(res, "Transaction deleted successfully", {}, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Failed to delete transaction", 500, error);
    }
};
exports.deleteTransaction = deleteTransaction;
// ✅ NEW: Update transaction with budget adjustment
const updateTransaction = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { transactionId } = req.params;
        const { amount, description, source, type, category } = req.body;
        const oldTransaction = await db_1.prisma.transaction.findUnique({
            where: { id: Number(transactionId) },
        });
        if (!oldTransaction) {
            return (0, response_1.sendError)(res, "Transaction not found", 404);
        }
        if (oldTransaction.userId !== userId) {
            return (0, response_1.sendError)(res, "Unauthorized to update this transaction", 403);
        }
        const oldAmount = oldTransaction.amount.toNumber();
        const oldType = oldTransaction.type;
        const newAmount = amount !== undefined ? Number(amount) : oldAmount;
        const newType = type || oldType;
        // Update transaction and account balance
        await db_1.prisma.$transaction(async (tx) => {
            // Update the transaction
            await tx.transaction.update({
                where: { id: Number(transactionId) },
                data: {
                    ...(amount !== undefined && { amount: new client_1.Prisma.Decimal(amount) }),
                    ...(description && { description }),
                    ...(source && { source }),
                    ...(type && { type }),
                    ...(category && { category }),
                },
            });
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
                    }
                    else {
                        currentBalance += oldAmount;
                    }
                    // Apply new transaction
                    if (newType === 'income') {
                        currentBalance += newAmount;
                    }
                    else {
                        currentBalance -= newAmount;
                    }
                    await tx.account.update({
                        where: { id: oldTransaction.accountId },
                        data: {
                            accountBalance: new client_1.Prisma.Decimal(currentBalance),
                        },
                    });
                }
            }
        });
        // ✅ Update budget if needed
        if (amount !== undefined || type !== undefined) {
            // Reverse old expense from budget
            if (oldType === 'expense') {
                await updateBudgetSpent(userId, oldAmount, 'subtract');
            }
            // Add new expense to budget
            if (newType === 'expense') {
                await updateBudgetSpent(userId, newAmount, 'add');
            }
        }
        return (0, response_1.sendSuccess)(res, "Transaction updated successfully", {}, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Failed to update transaction", 500, error);
    }
};
exports.updateTransaction = updateTransaction;
const ScanReceipt = async (file) => {
    if (!file?.buffer) {
        throw new Error("File buffer missing. Ensure multer uses memoryStorage.");
    }
    console.log("biffer issss", file.buffer);
    const base64Data = file.buffer.toString("base64");
    // console.log(base64Data);
    const mimeType = file.mimetype;
    console.log(mimeType);
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
    console.log("response is", response);
    const rawText = response.text ?? "";
    const cleaned = rawText.replace(/```json|```/gi, "").trim();
    console.log("AI raw response", rawText);
    console.log("AI cleaned response", cleaned);
    return JSON.parse(cleaned);
};
exports.ScanReceipt = ScanReceipt;
