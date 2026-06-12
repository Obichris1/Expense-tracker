"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./authRoutes"));
const accountRoutes_1 = __importDefault(require("./accountRoutes"));
const transactionRoutes_1 = __importDefault(require("./transactionRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const budgetRoutes_1 = __importDefault(require("./budgetRoutes"));
const router = express_1.default.Router();
router.use("/auth", authRoutes_1.default);
router.use("/user", userRoutes_1.default);
router.use("/accounts", accountRoutes_1.default);
router.use("/transactions", transactionRoutes_1.default);
router.use("/budget", budgetRoutes_1.default);
exports.default = router;
