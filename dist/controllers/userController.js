"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.changePassword = changePassword;
exports.updateUser = updateUser;
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function getUser(req, res) {
    try {
        const userId = req.user.userId;
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return (0, response_1.sendError)(res, "User not found", 404);
        }
        const { password, ...safeUser } = user;
        return (0, response_1.sendSuccess)(res, "User Found", safeUser, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error instanceof Error ? error.message : "Something went wrong");
    }
}
async function changePassword(req, res) {
    try {
        const userId = req.user.userId;
        const { oldPassword, newPassword, confirmPassword } = req.body;
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return (0, response_1.sendError)(res, "User not found", 404);
        }
        // 1. check old password against DB
        const isMatchOldPassword = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatchOldPassword) {
            return (0, response_1.sendError)(res, "Old password is incorrect", 400);
        }
        // 2. prevent same password reuse
        if (oldPassword === newPassword) {
            return (0, response_1.sendError)(res, "New password must be different", 400);
        }
        // 3. confirm password check
        if (newPassword !== confirmPassword) {
            return (0, response_1.sendError)(res, "Passwords do not match", 400);
        }
        // 4. hash new password
        const newHashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // 5. update user
        await db_1.prisma.user.update({
            where: { id: userId },
            data: { password: newHashedPassword }
        });
        return (0, response_1.sendSuccess)(res, "Password updated successfully", null, 200);
    }
    catch (error) {
        return (0, response_1.sendError)(res, "Something went wrong", 500);
    }
}
async function updateUser(req, res) {
    try {
        const userId = req.user.userId;
        const { firstName, lastName, contact, country, currency } = req.body;
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return (0, response_1.sendError)(res, "User not found", 400);
        }
        const updatedUser = await db_1.prisma.user.update({
            where: { id: userId }, data: { firstName, lastName, contact, country, currency }
        });
        return (0, response_1.sendSuccess)(res, "User updated successfully", updateUser, 200);
    }
    catch (error) {
    }
}
