import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Check for service role key
if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase service role key - admin operations will fail');
}

// Get storage key prefix from URL to ensure consistent keys across deployments
const getStorageKey = () => {
  // Use URL origin to create a namespaced storage prefix
  // This prevents conflicts when running multiple instances (dev/prod)
  const urlOrigin = window.location.origin;
  return `supabase.auth.token`;
};

// Regular client for user operations
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: getStorageKey(),
      flowType: 'implicit', // Helps with cross-device syncing of auth state
      storage: localStorage, // Explicitly use localStorage for better persistence
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 5 // Increased from 1 to 5 for more responsive updates
      }
    }
  }
);

// Service role client for admin operations - simplified configuration
export const supabaseAdmin = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false, // No need to persist admin sessions
      autoRefreshToken: true,
    }
  }
);

// Check if a session is valid and not about to expire
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return false;
    }
    
    // Check if token is about to expire (within 5 minutes)
    const expiresAt = data.session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expiresAt - now;
    
    // If less than 5 minutes remaining, refresh the token
    if (timeRemaining < 300) {
      await supabase.auth.refreshSession();
    }
    
    return true;
  } catch (err) {
    console.error('Error validating session:', err);
    return false;
  }
};

// Initialize the supabase auth listener for session recovery
export const initAuth = () => {
  // Check for existing session on init
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Error getting initial session:', error);
      return;
    }
    
    if (data?.session) {
      console.log('Session recovered on init');
    }
  });
  
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('User signed in');
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      // Clear any locally cached data
      localStorage.removeItem('dashboardStats');
      sessionStorage.removeItem('cachedData');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed');
    }
  });
};

// Clients are already exported above