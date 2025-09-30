"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rentLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// For development, we'll use a pass-through middleware instead of actual rate limiting
const passThroughMiddleware = (req, res, next) => {
    next();
};
// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
// Basic rate limiter for all API endpoints - disabled in development
exports.apiLimiter = isDevelopment ? passThroughMiddleware : (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests, please try again later.'
    }
});
// More strict rate limiter for rent endpoints - disabled in development
exports.rentLimiter = isDevelopment ? passThroughMiddleware : (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many rental requests, please try again later.'
    }
});
console.log(`Rate limiting is ${isDevelopment ? 'DISABLED' : 'ENABLED'} (${process.env.NODE_ENV} mode)`);
// Webhook endpoint doesn't need rate limiting as it's called by SMS Activate
