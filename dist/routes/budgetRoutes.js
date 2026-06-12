"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const budgetController_1 = require("../controllers/budgetController");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authMiddleware, budgetController_1.budgetController.upsertBudget);
router.get("/", authMiddleware_1.authMiddleware, budgetController_1.budgetController.getBudget);
router.delete("/", authMiddleware_1.authMiddleware, budgetController_1.budgetController.deleteBudget);
exports.default = router;
