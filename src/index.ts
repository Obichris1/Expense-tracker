
import * as  dotenv from "dotenv"
import express from "express"
import authRoutes from "./routes/authRoutes"
import cookieParser = require("cookie-parser")
import cors from 'cors'
import routes from "./routes"

import { serve } from "inngest/express";
import {inngest } from "./inngest"
import { functions } from "./inngest/functions"

// require("./cron/cron")


 dotenv.config()

 process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});


const app = express()
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  })
);  
app.use(express.json())

app.use("/api-v1", routes)

app.use("/api/inngest", serve({ client: inngest, functions }));

// 404 handler 
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
  

