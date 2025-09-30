import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './ui/LoadingSpinner';

/**
 * Enhanced GlobalLoadingIndicator
 * 
 * A completely redesigned component that shows a loading indicator at the top of the screen
 * when data is being fetched. It uses a smarter detection system to prevent unnecessary
 * loading states when switching between views.
 */
const GlobalLoadingIndicator: React.FC = () => {
  // Main loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Get auth loading state from context
  const { loading: authLoading } = useAuth();
  
  // Track pending operations
  const pendingOperationsRef = useRef<number>(0);
  const operationIdsRef = useRef<Set<string>>(new Set());
  
  // Track the last path where loading was shown to prevent repeated loads
  const lastPathRef = useRef<string>('');
  const lastLoadTimeRef = useRef<number>(0);
  
  // Reference to timers for cleanup
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Clear all existing timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);
  
  // Add loading state with an optional delay
  const addLoading = useCallback((operationId?: string) => {
    // If auth is loading, don't add additional loading indicators
    if (authLoading) return;
    
    // Record the operation ID if provided
    if (operationId) {
      operationIdsRef.current.add(operationId);
    }
    
    // Increment pending operations counter
    pendingOperationsRef.current += 1;
    
    // Get current path
    const currentPath = window.location.pathname;
    
    // Check if we've shown loading for this path recently (within last 5 seconds)
    const now = Date.now();
    const pathLockTime = 5000; // 5 seconds
    const isSamePath = currentPath === lastPathRef.current;
    const isRecentLoad = now - lastLoadTimeRef.current < pathLockTime;
    
    // If we've shown loading for this path recently, don't show again
    if (isSamePath && isRecentLoad) {
      console.log(`Skipping loading indicator for ${currentPath} - shown recently`);
      return;
    }
    
    // Add a very short delay before showing loading to prevent flicker
    const timer = setTimeout(() => {
      // Only show loading if operations are still pending
      if (pendingOperationsRef.current > 0) {
        setIsLoading(true);
        lastPathRef.current = currentPath;
        lastLoadTimeRef.current = Date.now();
      }
    }, 150);
    
    timersRef.current.push(timer);
  }, [authLoading]);
  
  // Remove loading state
  const removeLoading = useCallback((operationId?: string) => {
    // If an operation ID was provided, remove it from the set
    if (operationId && operationIdsRef.current.has(operationId)) {
      operationIdsRef.current.delete(operationId);
    }
    
    // Decrement the counter, but don't go below zero
    pendingOperationsRef.current = Math.max(0, pendingOperationsRef.current - 1);
    
    // If no more pending operations, clear loading after a short delay
    if (pendingOperationsRef.current === 0) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);
      
      timersRef.current.push(timer);
    }
  }, []);
  
  // Force reset all loading states
  const forceResetLoadingState = useCallback(() => {
    console.log('🔄 Force resetting all loading states');
    clearAllTimers();
    pendingOperationsRef.current = 0;
    operationIdsRef.current.clear();
    setIsLoading(false);
    
    // Store the current path to avoid re-triggering resets when navigating between similar routes
    const currentPath = window.location.pathname;
    localStorage.setItem('lastResetPath', currentPath);
    localStorage.setItem('lastResetTime', Date.now().toString());
  }, [clearAllTimers]);
  
  // Handle route changes - use smarter path comparison
  const handleRouteChange = useCallback((newPath: string) => {
    // Skip loading if navigating between pages with shared base paths
    // Example: /admin/tasks and /admin/task/123 share the /admin base path
    const oldPathBase = lastPathRef.current.split('/').slice(0, 2).join('/');
    const newPathBase = newPath.split('/').slice(0, 2).join('/');
    
    // Skip for navigation within the same section (e.g., within admin pages)
    if (oldPathBase === newPathBase) {
      console.log(`Detected navigation within ${newPathBase} section - maintaining state`);
      return;
    }
    
    // Clear previous loading states for major navigation changes
    forceResetLoadingState();
  }, [forceResetLoadingState]);
  
  // Listen for fetch start/end events
  useEffect(() => {
    const handleFetchStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      addLoading(customEvent.detail?.operationId);
    };
    
    const handleFetchEnd = (e: Event) => {
      const customEvent = e as CustomEvent;
      removeLoading(customEvent.detail?.operationId);
    };
    
    // Listen for history changes to detect navigation
    const handleLocationChange = () => {
      const currentPath = window.location.pathname;
      
      // Skip if it's the same path we're already on
      if (currentPath === lastPathRef.current) return;
      
      handleRouteChange(currentPath);
    };
    
    // Add all event listeners
    window.addEventListener('fetch-start', handleFetchStart);
    window.addEventListener('fetch-end', handleFetchEnd);
    window.addEventListener('popstate', handleLocationChange);
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      // If tab becomes visible again, don't force reset state
      // This prevents the loading flicker when switching back to the tab
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible - maintaining loading state');
        // We intentionally do not reset loading state here to prevent flicker
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up all event listeners
    return () => {
      window.removeEventListener('fetch-start', handleFetchStart);
      window.removeEventListener('fetch-end', handleFetchEnd);
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimers();
    };
  }, [addLoading, removeLoading, handleRouteChange, clearAllTimers]);
  
  // Also react to auth loading state
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
    } else if (pendingOperationsRef.current === 0) {
      // Only remove loading if no pending operations
      setIsLoading(false);
    }
  }, [authLoading]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);
  
  // Animation variants
  const variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };
  
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loading-indicator"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 w-full z-50 flex justify-center"
        >
          <div className="bg-primary text-white px-4 py-2 rounded-b-lg flex items-center shadow-lg">
            <LoadingSpinner size="sm" /> 
            <span className="ml-2 text-sm">Laden...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingIndicator;
