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
exports.refreshToken = exports.getUser = void 0;
exports.register = register;
exports.login = login;
exports.logout = logout;
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../config/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateToken_1 = require("../utils/generateToken");
const cookieOptions_1 = require("../utils/cookieOptions");
const response_1 = require("../utils/response");
async function register(req, res) {
    try {
        const { firstName, lastName, email, password } = req.body;
        // check if user exists
        const userExist = await db_1.prisma.user.findUnique({
            where: { email: email },
        });
        if (userExist) {
            return res
                .status(400)
                .json({ message: "User with this email already exists" });
        }
        const saltedRounds = 10;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltedRounds);
        const newUser = await db_1.prisma.user.create({
            data: {
                firstName,
                lastName,
                email: email,
                password: hashedPassword,
            },
        });
        (0, response_1.sendSuccess)(res, "User created Successfully", newUser, 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, error instanceof Error ? error.message : "Something went wrong");
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return (0, response_1.sendError)(res, "Invalid Credentials", 400);
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Email or password is invalid" });
        }
        const accessToken = (0, generateToken_1.generateAccessToken)(user.id);
        const refreshToken = (0, generateToken_1.generateRefreshToken)(user.id);
        // Store refresh token in DB
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: refreshToken },
        });
        // Set cookies
        res.cookie("accessToken", accessToken, cookieOptions_1.cookieOptions);
        res.cookie("refreshToken", refreshToken, cookieOptions_1.cookieOptions);
        // return res.status(200).json({
        //   status: "success",
        //   data: {
        //     id: user.id,
        //     email,
        //     // optional: you can omit sending tokens in response if using cookies
        //   },
        //   message: "User logged in successfully",
        // });
        (0, response_1.sendSuccess)(res, "User logged in successfully", { id: user.id, email }, 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, error instanceof Error ? error.message : "Something went wrong");
    }
}
async function logout(req, res) {
    res.cookie("accessToken", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({
        status: "success",
        message: "User logged out successfully",
    });
}
const getUser = (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    return (0, response_1.sendSuccess)(res, "fetched", req.user, 200);
};
exports.getUser = getUser;
const refreshToken = async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) {
        return res.status(401).json({ message: "Refresh token missing" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await db_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }
        const newAccessToken = (0, generateToken_1.generateAccessToken)(user.id);
        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 15 * 60 * 1000,
        });
        return res.json({ message: "Access token refreshed" });
    }
    catch {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
};
exports.refreshToken = refreshToken;
