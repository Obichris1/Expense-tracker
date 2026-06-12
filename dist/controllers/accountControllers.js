"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMoneyToAccount = exports.createAccount = exports.getAccounts = void 0;
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
const getAccounts = async (req, res) => {
    try {
        if (!req.user) {
            throw new Error("Unauthorized - no user on request");
        }
        const userId = req.user.userId;
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return (0, response_1.sendError)(res, "User not found", 400);
        }
        // 💥 INTENTIONAL ERROR TEST
        const accounts = await db_1.prisma.account.findMany({
            where: {
                userId: userId,
            },
        });
        return (0, response_1.sendSuccess)(res, "Accounts Fetched Successfully", { accounts }, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Something went wrong", 500, error);
    }
};
exports.getAccounts = getAccounts;
const createAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, number, amount } = req.body;
        // 1. Create account
        const account = await db_1.prisma.account.create({
            data: {
                userId,
                accountName: name,
                accountNumber: number,
                accountBalance: amount,
            },
        });
        // 2. Create initial transaction
        await db_1.prisma.transaction.create({
            data: {
                userId,
                description: `${account.accountName} (Initial Deposit)`,
                type: "income",
                status: "Completed",
                amount: amount,
                accountId: account.id,
                source: account.accountName,
            },
        });
        return (0, response_1.sendSuccess)(res, "Account created successfully", { data: account }, 201);
    }
    catch (error) {
        console.error(error);
        return (0, response_1.sendError)(res, "Failed to create account", 500, error);
    }
};
exports.createAccount = createAccount;
const addMoneyToAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = Number(req.params.id);
        const amount = Number(req.body.amount);
        // 1. Validate amount
        if (amount <= 0) {
            return res.status(400).json({
                message: "Invalid amount",
            });
        }
        // 2. Ensure account belongs to user
        const account = await db_1.prisma.account.findFirst({
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
        const updatedAccount = await db_1.prisma.account.update({
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
        const transaction = await db_1.prisma.transaction.create({
            data: {
                userId: userId,
                description: `${updatedAccount.accountName} (Deposit)`,
                type: "income",
                status: "Completed",
                amount: amount,
                accountId: account.id,
                source: updatedAccount.accountName,
            },
        });
        return (0, response_1.sendSuccess)(res, "Operation completed successfully", updatedAccount, 200);
    }
    catch (error) {
        console.error(error);
        (0, response_1.sendError)(res, "Failed to add money", 500, error);
    }
};
exports.addMoneyToAccount = addMoneyToAccount;
