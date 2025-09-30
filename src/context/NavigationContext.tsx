import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationContextType {
  previousPath: string | null;
  currentPath: string;
  isNewNavigation: (path?: string) => boolean;
  triggerRefresh: () => void;
  lastRefreshTimestamp: number;
  navigateAndTrack: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(location.pathname);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number>(Date.now());
  
  // Keep a ref to track if this is an initial page load
  const isInitialLoadRef = useRef(true);
  // Track if a navigation is in progress to prevent duplicate events
  const navigationInProgressRef = useRef(false);
  // Keep a cache of already checked paths to avoid infinite refresh loops
  const navigationCheckedPaths = useRef(new Set<string>());
  // Track last visited admin path for refresh handling
  const lastAdminPathRef = useRef<string | null>(null);

  // Save navigation state to sessionStorage to persist across refreshes
  const saveNavigationState = () => {
    try {
      sessionStorage.setItem('previousPath', previousPath || '');
      sessionStorage.setItem('currentPath', currentPath);
      sessionStorage.setItem('lastRefreshTimestamp', lastRefreshTimestamp.toString());
      
      // Store admin path separately to retain it on refresh
      if (currentPath.startsWith('/admin/')) {
        sessionStorage.setItem('lastAdminPath', currentPath);
      }
    } catch (error) {
      console.error('Failed to save navigation state to sessionStorage:', error);
    }
  };

  // Load navigation state from sessionStorage on initial mount
  useEffect(() => {
    try {
      if (isInitialLoadRef.current) {
        const storedPreviousPath = sessionStorage.getItem('previousPath');
        const storedCurrentPath = sessionStorage.getItem('currentPath');
        const storedTimestamp = sessionStorage.getItem('lastRefreshTimestamp');
        const storedAdminPath = sessionStorage.getItem('lastAdminPath');

        if (storedPreviousPath) {
          setPreviousPath(storedPreviousPath === '' ? null : storedPreviousPath);
        }
        
        // Only use stored currentPath if it doesn't match the actual current path
        // This ensures we respect any direct navigation to a URL
        if (storedCurrentPath && storedCurrentPath !== location.pathname) {
          setCurrentPath(storedCurrentPath);
        }
        
        if (storedTimestamp) {
          setLastRefreshTimestamp(parseInt(storedTimestamp, 10));
        }
        
        // Store the last admin path in the ref
        if (storedAdminPath) {
          lastAdminPathRef.current = storedAdminPath;
        }
        
        isInitialLoadRef.current = false;
      }
    } catch (error) {
      console.error('Failed to load navigation state from sessionStorage:', error);
    }
  }, [location.pathname]);

  // Update paths when location changes
  useEffect(() => {
    if (!navigationInProgressRef.current && location.pathname !== currentPath) {
      navigationInProgressRef.current = true;
      setPreviousPath(currentPath);
      setCurrentPath(location.pathname);
      
      // Track admin paths
      if (location.pathname.startsWith('/admin/')) {
        lastAdminPathRef.current = location.pathname;
        sessionStorage.setItem('lastAdminPath', location.pathname);
      }
      
      // Trigger a refresh when navigating to a new path
      setLastRefreshTimestamp(Date.now());
      
      // Dispatch a navigation event that components can listen for
      window.dispatchEvent(new CustomEvent('navigation-change', {
        detail: {
          from: currentPath,
          to: location.pathname
        }
      }));
      
      // Update sessionStorage
      saveNavigationState();
      
      // Reset the navigation in progress flag after a short delay
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 50);
    }
  }, [location.pathname, currentPath]);

  // Listen for browser refresh events and save state before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveNavigationState();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [previousPath, currentPath, lastRefreshTimestamp]);

  // Check if the current navigation is new (returning to a view)
  const isNewNavigation = (path?: string): boolean => {
    // Get the path to check
    const checkPath = path || currentPath;
    
    // Special handling for admin dashboard
    if (checkPath.startsWith('/admin/')) {
      // Check if we're refreshing the admin dashboard - use exact path match
      // instead of just checking for /admin/ prefix
      const exactPathMatch = previousPath === checkPath;
      return !exactPathMatch;
    }
    
    // Keep a cache of already checked paths to avoid infinite refresh loops
    if (!navigationCheckedPaths.current.has(checkPath)) {
      console.log(`First time checking navigation to ${checkPath}`);
      navigationCheckedPaths.current.add(checkPath);
      // If this is the first check for this path, consider it a new navigation
    return previousPath !== checkPath;
    }
    
    // If we've already checked this path during this render cycle,
    // only report it as a new navigation if it's not the current path
    return previousPath !== checkPath && currentPath !== checkPath;
  };

  // Manually trigger a refresh
  const triggerRefresh = () => {
    setLastRefreshTimestamp(Date.now());
  };
  
  // Navigate to a path and track it properly
  const navigateAndTrack = (path: string) => {
    if (path !== currentPath) {
      // Save state before navigating
      setPreviousPath(currentPath);
      setCurrentPath(path);
      setLastRefreshTimestamp(Date.now());
      
      // Track admin paths
      if (path.startsWith('/admin/')) {
        lastAdminPathRef.current = path;
      }
      
      // Update session storage immediately before navigation
      try {
        sessionStorage.setItem('previousPath', currentPath);
        sessionStorage.setItem('currentPath', path);
        sessionStorage.setItem('lastRefreshTimestamp', Date.now().toString());
        
        if (path.startsWith('/admin/')) {
          sessionStorage.setItem('lastAdminPath', path);
        }
      } catch (error) {
        console.warn('Failed to save navigation state:', error);
      }
      
      // Use replace: true for dashboard redirects to prevent back navigation issues
      if (path.includes('/dashboard') || path === '/') {
        navigate(path, { replace: true });
      } else {
        navigate(path);
      }
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        previousPath,
        currentPath,
        isNewNavigation,
        triggerRefresh,
        lastRefreshTimestamp,
        navigateAndTrack
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationProvider;
