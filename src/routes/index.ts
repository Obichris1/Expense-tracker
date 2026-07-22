import express from "express"
import authRoutes from "./authRoutes"
import accountRoutes from "./accountRoutes"
import transactionRoutes from "./transactionRoutes"
import userRoutes from "./userRoutes"
import budgetRoutes from "./budgetRoutes"
import agentRoutes from "./agentRoutes"



const router = express.Router()
router.use("/auth", authRoutes)
router.use("/user", userRoutes)
router.use("/accounts", accountRoutes)
router.use("/transactions", transactionRoutes)
router.use("/budget", budgetRoutes)
router.use("/agent", agentRoutes);


export default router