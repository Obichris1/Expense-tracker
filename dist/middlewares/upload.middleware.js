"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptUpload = void 0;
const multer_1 = __importDefault(require("multer"));
exports.receiptUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter(req, file, cb) {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Unsupported file type"));
        }
    },
});
