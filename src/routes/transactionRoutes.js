"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const transactionControllers_1 = require("../controllers/transactionControllers");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authMiddleware, transactionControllers_1.getTransactions);
router.get("/dashboard", authMiddleware_1.authMiddleware, transactionControllers_1.getDashboardInformation);
router.post("/add-transaction/:accountId", authMiddleware_1.authMiddleware, transactionControllers_1.addTransactions);
router.post("/transfer-money", authMiddleware_1.authMiddleware, transactionControllers_1.transferMoneyToAccount);
router.post("/scan-receipt", authMiddleware_1.authMiddleware, upload_middleware_1.receiptUpload.single("receipt"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }
        const result = await (0, transactionControllers_1.ScanReceipt)(req.file);
        return res.status(200).json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Scan failed";
        return res.status(500).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=transactionRoutes.js.map