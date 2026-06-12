import express from "express"
import { authMiddleware } from "../middlewares/authMiddleware"
import { budgetController } from "../controllers/budgetController"



const router = express.Router()

router.post("/", authMiddleware, budgetController.upsertBudget);
router.get("/", authMiddleware, budgetController.getBudget);
router.delete("/", authMiddleware, budgetController.deleteBudget);



export default router