import { PostgrestError } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  UNKNOWN = 'unknown',
}

/**
 * Standard error object structure
 */
export interface StandardError {
  message: string;
  category: ErrorCategory;
  originalError?: any;
  code?: string;
  status?: number;
  retryable: boolean;
}

/**
 * Options for error handling
 */
export interface ErrorHandlingOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  throwError?: boolean;
}

/**
 * Default options for error handling
 */
const defaultOptions: ErrorHandlingOptions = {
  showToast: true,
  logToConsole: true,
  throwError: false,
};

/**
 * Error handling service for standardized error responses
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  /**
   * Get the singleton instance of ErrorHandler
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Categorize an error based on its properties
   */
  private categorizeError(error: any): ErrorCategory {
    if (!navigator.onLine) {
      return ErrorCategory.NETWORK;
    }

    if (error instanceof PostgrestError) {
      const code = error.code;
      
      // Authentication errors
      if (code === '401' || code === 'PGRST301') {
        return ErrorCategory.AUTHENTICATION;
      }
      
      // Authorization errors
      if (code === '403' || code === 'PGRST302') {
        return ErrorCategory.AUTHORIZATION;
      }
      
      // Validation errors
      if (code === '400' || code === 'PGRST102') {
        return ErrorCategory.VALIDATION;
      }
      
      // Database errors
      if (code?.startsWith('23') || code?.startsWith('42')) {
        return ErrorCategory.DATABASE;
      }
    }
    
    // Network errors
    if (error instanceof TypeError && error.message.includes('network')) {
      return ErrorCategory.NETWORK;
    }
    
    // Authentication errors
    if (error?.message?.toLowerCase().includes('auth') || 
        error?.message?.toLowerCase().includes('login') ||
        error?.message?.toLowerCase().includes('session')) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryable(category: ErrorCategory): boolean {
    return [
      ErrorCategory.NETWORK,
      ErrorCategory.DATABASE,
    ].includes(category);
  }

  /**
   * Get a user-friendly error message
   */
  private getUserFriendlyMessage(error: any, category: ErrorCategory): string {
    if (error?.message) {
      // Clean up error message for display
      let message = error.message
        .replace(/^error:/i, '')
        .replace(/^Error:/i, '')
        .trim();
      
      // Capitalize first letter
      message = message.charAt(0).toUpperCase() + message.slice(1);
      
      return message;
    }
    
    // Default messages by category
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication error. Please sign in again.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.VALIDATION:
        return 'Invalid data provided. Please check your input and try again.';
      case ErrorCategory.DATABASE:
        return 'Database error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }

  /**
   * Handle an error with standardized processing
   */
  public handleError(error: any, options?: ErrorHandlingOptions): StandardError {
    const opts = { ...defaultOptions, ...options };
    const category = this.categorizeError(error);
    const retryable = this.isRetryable(category);
    const message = this.getUserFriendlyMessage(error, category);
    
    const standardError: StandardError = {
      message,
      category,
      originalError: error,
      retryable,
      code: error?.code,
      status: error?.status,
    };
    
    // Log to console if enabled
    if (opts.logToConsole) {
      console.error(`[${category.toUpperCase()}] ${message}`, error);
    }
    
    // Show toast if enabled
    if (opts.showToast) {
      toast.error(message);
    }
    
    // Dispatch error event for global handling
    window.dispatchEvent(new CustomEvent('app-error', { 
      detail: standardError 
    }));
    
    // Throw error if enabled
    if (opts.throwError) {
      throw standardError;
    }
    
    return standardError;
  }

  /**
   * Handle a specific error with authentication issues
   */
  public handleAuthError(error: any, options?: ErrorHandlingOptions): StandardError {
    const opts = { ...defaultOptions, ...options };
    const standardError = this.handleError(error, { ...opts, showToast: false });
    
    // For auth errors, we might want to redirect to login
    if (standardError.category === ErrorCategory.AUTHENTICATION) {
      // Show a specific toast for auth errors
      if (opts.showToast) {
        toast.error('Your session has expired. Please sign in again.');
      }
      
      // Dispatch auth-error event for handling in AuthContext
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: standardError 
      }));
    } else {
      // Show regular toast for non-auth errors
      if (opts.showToast) {
        toast.error(standardError.message);
      }
    }
    
    return standardError;
  }

  /**
   * Create a retry function with exponential backoff
   */
  public createRetryFunction<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): () => Promise<T> {
    return async (): Promise<T> => {
      let retries = 0;
      let lastError: any;
      
      while (retries < maxRetries) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          
          const standardError = this.handleError(error, { 
            showToast: retries === maxRetries - 1, // Only show toast on final retry
            throwError: false,
          });
          
          // Don't retry if error is not retryable
          if (!standardError.retryable) {
            break;
          }
          
          // Exponential backoff
          const delay = initialDelay * Math.pow(2, retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retries++;
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
    };
  }
}

// Export a singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Higher-order function to wrap async functions with standardized error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: ErrorHandlingOptions
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      errorHandler.handleError(error, options);
      throw error;
    }
  };
}
