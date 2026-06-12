"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const accountControllers_1 = require("../controllers/accountControllers");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authMiddleware, accountControllers_1.getAccounts);
router.post("/", authMiddleware_1.authMiddleware, accountControllers_1.createAccount);
router.put("/:id/deposit", authMiddleware_1.authMiddleware, accountControllers_1.addMoneyToAccount);
exports.default = router;
//# sourceMappingURL=accountRoutes.js.map