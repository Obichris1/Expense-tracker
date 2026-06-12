"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (response, message, data, statusCode = 200) => {
    return response.status(statusCode).json({
        success: true,
        message,
        data
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 500, error) => {
    return res.status(statusCode).json({
        success: false,
        message,
        error: error instanceof Error ? error.message : error,
    });
};
exports.sendError = sendError;
