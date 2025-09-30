"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSimple = exports.authenticate = void 0;
const supabase_1 = require("../lib/supabase");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Middleware to authenticate API requests using Supabase JWT
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header missing or invalid' });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            console.error('Auth verification failed:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        // Add user to request object
        req.user = {
            id: user.id,
            email: user.email
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
/**
 * Legacy authenticate function for backwards compatibility
 * (Used by routes that don't need user extraction)
 */
const authenticateSimple = (req, res, next) => {
    // Allow all requests to proceed
    next();
};
exports.authenticateSimple = authenticateSimple;
