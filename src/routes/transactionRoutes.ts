import express, { Request, Response } from "express"

import { authMiddleware } from "../middlewares/authMiddleware"
import { getTransactions,getDashboardInformation, addTransactions, transferMoneyToAccount, ScanReceipt } from "../controllers/transactionControllers"
import { receiptUpload } from "../middlewares/upload.middleware"


const router = express.Router()

router.get("/", authMiddleware, getTransactions)
router.get("/dashboard", authMiddleware, getDashboardInformation)
router.post("/add-transaction/:accountId", authMiddleware, addTransactions)
router.post("/transfer-money", authMiddleware, transferMoneyToAccount)
router.post("/scan-receipt", authMiddleware, receiptUpload.single("receipt"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const result = await ScanReceipt(req.file);
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      return res.status(500).json({ error: message });
    }
  })



export default router