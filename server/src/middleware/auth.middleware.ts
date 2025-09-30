import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';

dotenv.config();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Middleware to authenticate API requests using Supabase JWT
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

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
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Legacy authenticate function for backwards compatibility
 * (Used by routes that don't need user extraction)
 */
export const authenticateSimple = (req: Request, res: Response, next: NextFunction) => {
  // Allow all requests to proceed
  next();
};
