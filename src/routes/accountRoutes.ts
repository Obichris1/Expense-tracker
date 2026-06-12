import express from "express"
import { addMoneyToAccount, createAccount, getAccounts } from "../controllers/accountControllers"
import { authMiddleware } from "../middlewares/authMiddleware"


const router = express.Router()


router.get("/", authMiddleware, getAccounts)
router.post("/", authMiddleware, createAccount)
router.put("/:id/deposit", authMiddleware, addMoneyToAccount);


export default router