import { useState, useEffect, useCallback, useRef } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase, supabaseAdmin, isSessionValid } from './supabase';
import toast from 'react-hot-toast';

/**
 * Standard response type for all data fetching operations
 */
export interface DataResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
  lastFetchTime: number | null;
}

/**
 * Options for data fetching
 */
export interface FetchOptions {
  /** Whether to use the admin client instead of the regular client */
  useAdmin?: boolean;
  /** Whether to show error toasts automatically */
  showErrorToasts?: boolean;
  /** Whether to show success toasts automatically */
  showSuccessToasts?: boolean;
  /** Whether to fetch data automatically on mount */
  fetchOnMount?: boolean;
  /** Dependencies array for refetching when values change */
  dependencies?: any[];
  /** Initial data to use before fetching */
  initialData?: any;
  /** Maximum age of data before considered stale (in milliseconds) */
  maxDataAge?: number;
  /** Caching key to use for localStorage data persistence */
  cacheKey?: string;
}

/**
 * Default options for data fetching
 */
const defaultOptions: FetchOptions = {
  useAdmin: false,
  showErrorToasts: true,
  showSuccessToasts: false,
  fetchOnMount: true,
  dependencies: [],
  initialData: null,
  maxDataAge: 2 * 60 * 1000, // 2 minutes
};

/**
 * Create a data fetching hook with standardized loading, error handling, and refetching
 * 
 * @param fetchFn Function that performs the actual data fetching
 * @param options Options for data fetching behavior
 * @returns A standardized data response object
 */
export function createFetchHook<T>(
  fetchFn: (client: typeof supabase | typeof supabaseAdmin) => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: FetchOptions
): () => DataResponse<T> {
  const opts = { ...defaultOptions, ...options };
  
  return () => {
    const [data, setData] = useState<T | null>(opts.initialData || null);
    const [error, setError] = useState<PostgrestError | Error | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    
    // Refs to avoid stale closures in event listeners
    const dataRef = useRef<T | null>(null);
    const fetchInProgressRef = useRef<boolean>(false);
    const lastFetchTimeRef = useRef<number | null>(null);
    
    // Keep refs in sync with state
    useEffect(() => {
      dataRef.current = data;
      lastFetchTimeRef.current = lastFetchTime;
    }, [data, lastFetchTime]);
    
    // Load cached data if available
    useEffect(() => {
      if (opts.cacheKey) {
        try {
          const cachedData = localStorage.getItem(`data_cache_${opts.cacheKey}`);
          if (cachedData) {
            const { data: parsedData, timestamp } = JSON.parse(cachedData);
            // Check if cache is still fresh
            const now = Date.now();
            const dataAge = now - timestamp;
            
            if (dataAge < (opts.maxDataAge || defaultOptions.maxDataAge!)) {
              console.log(`Using cached data for ${opts.cacheKey}, age: ${Math.round(dataAge / 1000)}s`);
              setData(parsedData);
              setLastFetchTime(timestamp);
              // If cache is older than half the max age, do a background refresh
              if (dataAge > (opts.maxDataAge || defaultOptions.maxDataAge!) / 2) {
                console.log('Cache is getting stale, refreshing in background');
                setTimeout(() => fetchData(), 0);
              }
            } else {
              console.log(`Cached data for ${opts.cacheKey} is stale (${Math.round(dataAge / 1000)}s old)`);
            }
          }
        } catch (err) {
          console.error('Error loading cached data:', err);
        }
      }
    }, []);
    
    const fetchData = useCallback(async () => {
      // Prevent multiple simultaneous fetches
      if (fetchInProgressRef.current) {
        console.log('Fetch already in progress, skipping duplicate request');
        return;
      }
      
      // Check for session validity before fetching
      const sessionValid = await isSessionValid();
      if (!sessionValid) {
        console.error('Session invalid, cannot fetch data');
        setError(new Error('Session invalid'));
        return;
      }
      
      fetchInProgressRef.current = true;
      setLoading(true);
      setError(null);
      
      try {
        // Dispatch event for loading indicator
        window.dispatchEvent(new CustomEvent('fetch-start'));
        
        const client = opts.useAdmin ? supabaseAdmin : supabase;
        const { data: fetchedData, error: fetchError } = await fetchFn(client);
        
        if (fetchError) {
          setError(fetchError);
          if (opts.showErrorToasts) {
            toast.error(`Error fetching data: ${fetchError.message}`);
          }
          console.error('Error fetching data:', fetchError);
        } else {
          const timestamp = Date.now();
          setData(fetchedData);
          setLastFetchTime(timestamp);
          
          // Cache the data if cacheKey is provided
          if (opts.cacheKey && fetchedData) {
            try {
              localStorage.setItem(`data_cache_${opts.cacheKey}`, JSON.stringify({
                data: fetchedData,
                timestamp
              }));
            } catch (err) {
              console.error('Error caching data:', err);
            }
          }
          
          if (opts.showSuccessToasts) {
            toast.success('Data fetched successfully');
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        if (opts.showErrorToasts) {
          toast.error(`Error: ${error.message}`);
        }
        console.error('Error in data fetching:', error);
      } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
        // Dispatch event for loading indicator
        window.dispatchEvent(new CustomEvent('fetch-end'));
      }
    }, [opts.useAdmin, ...(opts.dependencies || [])]);
    
    // Set up event listeners for session and visibility events
    useEffect(() => {
      // Handler for when session is recovered
      const handleSessionRecovery = () => {
        console.log('Session recovered, refreshing data');
        fetchData();
      };
      
      // Handler for visibility change - DISABLED to prevent unwanted refreshes
      const handleVisibilityChange = () => {
        // This functionality is now disabled to prevent unwanted loading states
        if (document.visibilityState === 'visible') {
          console.log('Tab became visible, but NOT refreshing data automatically');
          
          // Only refresh if data is extremely stale (over 30 minutes old)
          if (lastFetchTimeRef.current) {
            const now = Date.now();
            const dataAge = now - lastFetchTimeRef.current;
            const extremeStaleness = 30 * 60 * 1000; // 30 minutes
            
            if (dataAge > extremeStaleness) {
              console.log(`Data is extremely stale (${Math.round(dataAge / 1000)}s old), refreshing`);
              fetchData();
            } else {
              console.log(`Data is still usable (${Math.round(dataAge / 1000)}s old), keeping as is`);
            }
          }
        }
      };
      
      // Listen for session recovery events
      window.addEventListener('session-recovery-successful', handleSessionRecovery);
      
      // Listen for visibility change to refresh stale data when tab becomes active
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Listen for specific refresh request
      window.addEventListener('visibility-change-refresh', fetchData);
      
      return () => {
        window.removeEventListener('session-recovery-successful', handleSessionRecovery);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('visibility-change-refresh', fetchData);
      };
    }, [fetchData]);
    
    // Fetch on mount if enabled
    useEffect(() => {
      if (opts.fetchOnMount) {
        fetchData();
      }
    }, [fetchData]);
    
    return {
      data,
      error,
      loading,
      refetch: fetchData,
      lastFetchTime,
    };
  };
}

/**
 * Create a data mutation hook with standardized loading and error handling
 * 
 * @param mutationFn Function that performs the actual data mutation
 * @param options Options for data mutation behavior
 * @returns A standardized mutation function with loading and error states
 */
export function createMutationHook<T, P>(
  mutationFn: (client: typeof supabase | typeof supabaseAdmin, params: P) => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: FetchOptions
) {
  const opts = { ...defaultOptions, ...options };
  
  return () => {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<PostgrestError | Error | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    
    const mutate = async (params: P): Promise<{ data: T | null; error: PostgrestError | Error | null }> => {
      // Check for session validity before mutating
      const sessionValid = await isSessionValid();
      if (!sessionValid) {
        const sessionError = new Error('Session invalid, cannot perform operation');
        setError(sessionError);
        if (opts.showErrorToasts) {
          toast.error('Your session has expired. Please refresh the page and try again.');
        }
        return { data: null, error: sessionError };
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Dispatch event for loading indicator
        window.dispatchEvent(new CustomEvent('fetch-start'));
        
        const client = opts.useAdmin ? supabaseAdmin : supabase;
        const { data: mutatedData, error: mutationError } = await mutationFn(client, params);
        
        if (mutationError) {
          setError(mutationError);
          if (opts.showErrorToasts) {
            toast.error(`Error: ${mutationError.message}`);
          }
          console.error('Error in mutation:', mutationError);
          return { data: null, error: mutationError };
        } else {
          setData(mutatedData);
          if (opts.showSuccessToasts) {
            toast.success('Operation completed successfully');
          }
          
          // If there's a cache key, invalidate related cached data
          if (opts.cacheKey) {
            localStorage.removeItem(`data_cache_${opts.cacheKey}`);
          }
          
          return { data: mutatedData, error: null };
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        if (opts.showErrorToasts) {
          toast.error(`Error: ${error.message}`);
        }
        console.error('Error in mutation:', error);
        return { data: null, error };
      } finally {
        setLoading(false);
        // Dispatch event for loading indicator
        window.dispatchEvent(new CustomEvent('fetch-end'));
      }
    };
    
    return {
      mutate,
      data,
      error,
      loading,
    };
  };
}

/**
 * Create a real-time subscription hook with standardized error handling
 * 
 * @param subscriptionFn Function that sets up the real-time subscription
 * @param options Options for subscription behavior
 * @returns A standardized subscription with data, error, and loading states
 */
export function createSubscriptionHook<T>(
  subscriptionFn: (client: typeof supabase | typeof supabaseAdmin, callback: (payload: T) => void) => {
    unsubscribe: () => void;
  },
  options?: FetchOptions
) {
  const opts = { ...defaultOptions, ...options };
  
  return () => {
    const [data, setData] = useState<T | null>(opts.initialData || null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    
    useEffect(() => {
      setLoading(true);
      
      try {
        const client = opts.useAdmin ? supabaseAdmin : supabase;
        const { unsubscribe } = subscriptionFn(client, (payload) => {
          setData(payload);
          setLoading(false);
        });
        
        return () => {
          unsubscribe();
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        if (opts.showErrorToasts) {
          toast.error(`Subscription error: ${error.message}`);
        }
        console.error('Error in subscription:', error);
        setLoading(false);
      }
    }, [opts.useAdmin, ...(opts.dependencies || [])]);
    
    return {
      data,
      error,
      loading,
    };
  };
}
