import express from "express"
import { changePassword, getUser, updateUser } from "../controllers/userController"
import { authMiddleware } from "../middlewares/authMiddleware"


const router = express.Router()

router.get("/", authMiddleware, getUser)
router.put("/change-password", authMiddleware, changePassword)
router.put("/update-user", authMiddleware, updateUser)





export default router