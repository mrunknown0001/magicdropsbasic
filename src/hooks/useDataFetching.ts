import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Enhanced data fetching hook that prevents unnecessary loading states
 * and handles the entire data fetching lifecycle properly
 */
export function useEnhancedDataFetching<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options = { 
    skipInitialFetch: false,
    cacheDuration: 60000, // 1 minute cache by default
    localStorageKey: '' // Optional cache key
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skipInitialFetch);
  const [error, setError] = useState<Error | null>(null);
  const { isAdmin, user } = useAuth();
  
  // References to track fetch state
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const dataLoadedRef = useRef(false);
  const unmountedRef = useRef(false);
  
  // Try to load from cache if available
  useEffect(() => {
    if (options.localStorageKey && !data) {
      try {
        const cached = localStorage.getItem(options.localStorageKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < options.cacheDuration) {
            console.log(`Using cached data for ${options.localStorageKey}, age: ${age}ms`);
            setData(cachedData);
            setLoading(false);
            dataLoadedRef.current = true;
          }
        }
      } catch (e) {
        console.warn('Failed to load from cache', e);
      }
    }
  }, [options.localStorageKey]);
  
  // Main fetch function
  const fetchData = useCallback(async (force = false) => {
    // Skip if already fetching
    if (fetchingRef.current && !force) {
      console.log('Already fetching data, skipping duplicate fetch');
      return;
    }
    
    // Check if we're in cooling period
    const now = Date.now();
    if (!force && lastFetchTimeRef.current && now - lastFetchTimeRef.current < 5000) {
      console.log('In cooling period, not fetching again');
      return;
    }
    
    // Skip if already loaded and not forced
    if (!force && dataLoadedRef.current && data) {
      console.log('Data already loaded, skipping fetch');
      return;
    }
    
    // Don't try to fetch without a user
    if (!user) {
      console.log('No user available, skipping fetch');
      return;
    }
    
    // Set loading state
    if (!data) {
      setLoading(true);
    }
    
    fetchingRef.current = true;
    
    try {
      console.log('Fetching data...');
      const result = await fetchFunction();
      
      // Don't update state if component unmounted
      if (unmountedRef.current) return;
      
      // Ensure we never set null/undefined data 
      if (result === null || result === undefined) {
        console.warn('Fetch function returned null/undefined data, using empty value instead');
        // Handle common data types with appropriate empty values
        if (Array.isArray(data)) {
          setData([] as unknown as T);
        } else if (typeof data === 'object' && data !== null) {
          setData({} as T);
        } else {
          setData(result); // For primitives, we still set the actual result
        }
      } else {
        setData(result);
      }
      
      setError(null);
      dataLoadedRef.current = true;
      
      // Cache in localStorage if key provided
      if (options.localStorageKey) {
        try {
          localStorage.setItem(
            options.localStorageKey, 
            JSON.stringify({ 
              data: result, 
              timestamp: Date.now() 
            })
          );
        } catch (e) {
          console.warn('Failed to cache data', e);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      if (!unmountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      lastFetchTimeRef.current = Date.now();
      fetchingRef.current = false;
      if (!unmountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction, user, data, ...dependencies]);
  
  // Initial fetch
  useEffect(() => {
    if (!options.skipInitialFetch) {
      fetchData();
    }
    
    return () => {
      unmountedRef.current = true;
    };
  }, [fetchData]);
  
  return {
    data,
    loading,
    error,
    refresh: (force = true) => fetchData(force),
    isDataLoaded: dataLoadedRef.current
  };
} 