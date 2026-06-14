"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const express_2 = require("inngest/express");
const inngest_1 = require("./inngest");
const functions_1 = require("./inngest/functions");
dotenv.config();
// =========================
// ENVIRONMENT SETUP
// =========================
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 3000;
const CLIENT_URL = NODE_ENV === "production"
    ? process.env.CLIENT_URL
    : "http://localhost:3001";
// =========================
// ERROR HANDLERS
// =========================
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
});
// =========================
// APP SETUP
// =========================
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
}));
app.use(express_1.default.json());
// =========================
// ROUTES
// =========================
app.use("/api-v1", routes_1.default);
app.use("/api/inngest", (0, express_2.serve)({ client: inngest_1.inngest, functions: functions_1.functions }));
// =========================
// HEALTH CHECK (GOOD FOR PROD)
// =========================
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        environment: NODE_ENV,
    });
});
// =========================
// 404 HANDLER
// =========================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});
// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`CORS enabled for: ${CLIENT_URL}`);
});
