import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// For development, we'll use a pass-through middleware instead of actual rate limiting
const passThroughMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Basic rate limiter for all API endpoints - disabled in development
export const apiLimiter = isDevelopment ? passThroughMiddleware : rateLimit({
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
export const rentLimiter = isDevelopment ? passThroughMiddleware : rateLimit({
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
