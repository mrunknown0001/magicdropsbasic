/**
 * Utility for retrying failed API operations with exponential backoff and timeout handling
 * 
 * @param operation - The async operation to retry
 * @param retries - Number of retry attempts (default: 3)
 * @param delay - Initial delay in milliseconds (default: 1000)
 * @param backoff - Multiplier for delay on each retry (default: 2)
 * @param timeout - Timeout in milliseconds before aborting the operation (default: 8000)
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoff = 2,
  timeout = 8000
): Promise<T> => {
  // Create an AbortController to handle timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('Operation timed out');
  }, timeout);
  
  try {
    // Wrap the operation in a timeout-aware promise
    const operationWithTimeout = async (): Promise<T> => {
      try {
        // Check if already aborted
        if (controller.signal.aborted) {
          throw new Error('Operation aborted: ' + controller.signal.reason);
        }
        
        // Run the operation
        return await operation();
      } catch (error) {
        // Check if aborted during operation
        if (controller.signal.aborted) {
          throw new Error('Operation aborted: ' + controller.signal.reason);
        }
        throw error;
      }
    };
    
    return await operationWithTimeout();
  } catch (error) {
    if (retries <= 0 || (error instanceof Error && error.message.includes('aborted'))) {
      console.error('❌ Operation failed after all retry attempts or timed out', error);
      // Ensure fetch-end is dispatched for timed out operations
      window.dispatchEvent(new CustomEvent('fetch-end'));
      throw error;
    }
    
    console.log(`⏱️ Retrying operation in ${delay}ms, ${retries} retries left`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryOperation(operation, retries - 1, delay * backoff, backoff, timeout);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Dispatches fetch events for global loading indicator
 * 
 * @param action - 'start' or 'end' to indicate fetch status
 */
export const dispatchFetchEvent = (action: 'start' | 'end') => {
  window.dispatchEvent(new CustomEvent(`fetch-${action}`));
};

/**
 * Wrapper for fetch operations that dispatches events for loading indicators
 * with timeout protection
 * 
 * @param fetchFn - The fetch function to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 8000)
 */
export const withLoadingIndicator = async <T>(
  fetchFn: () => Promise<T>,
  timeoutMs = 8000
): Promise<T> => {
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  // Dispatch start event
  dispatchFetchEvent('start');
  
  try {
    // Race the fetch function against the timeout
    const result = await Promise.race([fetchFn(), timeoutPromise]);
    return result as T;
  } catch (error) {
    console.error('Operation failed or timed out:', error);
    throw error;
  } finally {
    // Always dispatch end event in finally block
    dispatchFetchEvent('end');
  }
};

/**
 * Safely executes an operation with proper loading state management
 * Use this for operations that might affect UI state
 * 
 * @param operation - The operation to execute
 * @param errorHandler - Optional custom error handler
 */
export const safeOperation = async <T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | undefined> => {
  return withLoadingIndicator(async () => {
    try {
      return await operation();
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        console.error('Operation failed:', error);
      }
      return undefined;
    }
  });
};
