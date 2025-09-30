/**
 * Enhanced fetch utilities with built-in loading state management
 * 
 * These utilities ensure that loading states are properly managed across
 * the entire application, preventing stuck loading indicators and providing
 * consistent error handling.
 */
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

/**
 * Generate a unique operation ID for tracking fetch operations
 */
export const generateOperationId = (): string => {
  return `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Dispatch a fetch event with an optional operation ID
 */
export const dispatchFetchEvent = (
  action: 'start' | 'end',
  operationId?: string
): void => {
  window.dispatchEvent(
    new CustomEvent(`fetch-${action}`, operationId ? { detail: { operationId } } : undefined)
  );
};

/**
 * Type for options used in loading-aware fetch operations
 */
export interface LoadingOptions {
  errorMessage?: string;
  successMessage?: string;
  timeoutMs?: number;
  silent?: boolean;
  retries?: number;
  retryDelay?: number;
}

/**
 * Wrap a function with loading state management
 * 
 * @param fn The function to wrap
 * @param options Configuration options
 * @returns The result of the function
 */
export async function withLoading<T>(
  fn: () => Promise<T>,
  options: LoadingOptions = {}
): Promise<T> {
  const {
    errorMessage = 'Operation failed',
    successMessage,
    timeoutMs = 15000,
    silent = false
  } = options;

  // Generate a unique operation ID to track this specific operation
  const operationId = generateOperationId();
  
  // Set up a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Dispatch fetch-start event
  dispatchFetchEvent('start', operationId);

  try {
    // Race the function against the timeout
    const result = await Promise.race([fn(), timeoutPromise]);
    
    // Show success message if provided
    if (successMessage && !silent) {
      toast.success(successMessage);
    }
    
    return result;
  } catch (error) {
    // Log the error
    console.error('Operation failed:', error);
    
    // Show error message
    if (!silent) {
      const message = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : errorMessage;
      
      toast.error(message);
    }
    
    // Re-throw the error to allow proper handling by the caller
    throw error;
  } finally {
    // Always dispatch fetch-end event
    dispatchFetchEvent('end', operationId);
  }
}

/**
 * Type for Supabase query results
 */
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: any;
}

/**
 * Perform a Supabase query with loading state management
 * 
 * @param queryFn Function that returns a Supabase query
 * @param options Configuration options
 * @returns The result of the query
 */
export async function queryWithLoading<T>(
  queryFn: () => Promise<SupabaseQueryResult<T>>,
  options: LoadingOptions = {}
): Promise<T | null> {
  const {
    errorMessage = 'Query failed',
    successMessage,
    timeoutMs = 15000,
    silent = false,
    retries = 1,
    retryDelay = 1000
  } = options;

  try {
    return await withLoading(
      async () => {
        let lastError: any = null;
        
        // Try the query with retries
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            // If this isn't the first attempt, wait before retrying
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
            
            // Execute the query
            const { data, error } = await queryFn();
            
            // If there's an error, throw it
            if (error) {
              lastError = error;
              console.warn(`Query attempt ${attempt + 1}/${retries + 1} failed:`, error);
              continue; // Try again
            }
            
            // Return the data (which might be null)
            // Special handling for count queries which return { data: count, error: null }
            if (data && typeof data === 'object' && 'data' in data && 'error' in data) {
              const customResult = data as unknown as { data: T, error: any };
              if (customResult.error === null) {
                return customResult.data;
              }
            }
            
            return data;
          } catch (error) {
            lastError = error;
            console.warn(`Query attempt ${attempt + 1}/${retries + 1} failed with exception:`, error);
            
            // Continue to the next retry unless this is the last attempt
            if (attempt < retries) {
              continue;
            }
          }
        }
        
        // If we get here, all attempts failed
        throw lastError || new Error(errorMessage);
      },
      { errorMessage, successMessage, timeoutMs, silent }
    );
  } catch (error) {
    // Return null on error, after the error has been handled by withLoading
    console.error('Query failed completely:', error);
    return null;
  }
}

/**
 * Perform a Supabase mutation with loading state management
 * 
 * @param mutationFn Function that returns a Supabase mutation
 * @param options Configuration options
 * @returns The result of the mutation
 */
export async function mutateWithLoading<T>(
  mutationFn: () => Promise<SupabaseQueryResult<T>>,
  options: LoadingOptions = {}
): Promise<T | null> {
  const {
    errorMessage = 'Operation failed',
    successMessage = 'Operation successful',
    timeoutMs = 15000,
    silent = false
  } = options;

  try {
    return await withLoading(
      async () => {
        const { data, error } = await mutationFn();
        
        if (error) {
          throw error;
        }
        
        return data;
      },
      { errorMessage, successMessage, timeoutMs, silent }
    );
  } catch (error) {
    // Return null on error, after the error has been handled by withLoading
    return null;
  }
}

/**
 * React hook to refresh data automatically when the connection is restored
 * 
 * @param refreshFn Function to call to refresh data
 */
export function useAutoRefresh(refreshFn: () => void): void {
  useEffect(() => {
    const handleReconnect = () => {
      console.log('🔄 Auto-refreshing data after reconnection');
      refreshFn();
    };
    
    // Listen for reconnection events
    window.addEventListener('supabase-reconnect', handleReconnect);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('supabase-reconnect', handleReconnect);
    };
  }, [refreshFn]);
}
