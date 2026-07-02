import express from "express";
import { login, register,logout } from "../controllers/authController";



const router = express.Router();

// ✅ Correct routes
router.post("/register", register);
router.post("/login",  login);
router.post("/logout", (req, res, next) => {
  console.log("LOGOUT ROUTE HIT");
  next();
}, logout);


export default router;