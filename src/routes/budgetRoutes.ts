import express from "express"
import { authMiddleware } from "../middlewares/authMiddleware"
import { getBudget,upsertBudget,deleteBudget } from "../controllers/budgetController"



const router = express.Router()

router.post("/", authMiddleware, upsertBudget);
router.get("/", authMiddleware, getBudget);
router.delete("/", authMiddleware, deleteBudget);



export default router