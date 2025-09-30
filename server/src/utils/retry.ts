/**
 * Retry an operation with exponential backoff
 * @param operation The operation to retry
 * @param maxRetries Maximum number of retries
 * @param delay Initial delay in milliseconds
 * @returns The result of the operation
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If not the first attempt, log that we're retrying
      if (attempt > 0) {
        console.log(`[RETRY] Attempt ${attempt}/${maxRetries} for operation`);
      }
      
      const result = await operation();
      
      // If we succeeded after a retry, log it
      if (attempt > 0) {
        console.log(`[RETRY] Operation succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      };
      
      // Don't retry if we've reached the maximum number of retries
      if (attempt === maxRetries) {
        console.error(`[RETRY] All ${maxRetries} retry attempts failed:`, errorDetails);
        break;
      }
      
      // Don't retry for certain error types
      if (error.response?.status === 400 || // Bad request
          error.response?.status === 401 || // Unauthorized
          error.response?.status === 403 || // Forbidden
          error.response?.status === 422 || // Validation error
          error.code === 'ECONNABORTED' || // Timeout
          (error.response?.data?.error === 'NO_NUMBERS') // No numbers available - specific to SMS API
        ) {
        console.error(`[RETRY] Not retrying due to error type:`, errorDetails);
        break;
      }
      
      // Wait with exponential backoff before retrying
      const waitTime = delay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}
