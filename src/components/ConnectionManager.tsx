import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ConnectionManagerProps {
  children?: React.ReactNode;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const { user, refreshSession } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  
  // Check initial connection state
  useEffect(() => {
    console.log('🌐 Initial connection state:', navigator.onLine ? 'online' : 'offline');
  }, []);
  
  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setIsOnline(true);
      
      // If we were previously offline, trigger data refresh
      if (wasOffline) {
        console.log('🔄 Triggering data refresh after connection restored');
        refreshData();
        setWasOffline(false);
      }
    };
    
    const handleOffline = () => {
      console.log('🌐 Connection lost');
      setIsOnline(false);
      setWasOffline(true);
      
      toast.error('Connection lost. Trying to reconnect...', {
        id: 'connection-lost',
        duration: 3000
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [wasOffline]);
  
  // Check Supabase connection status periodically
  useEffect(() => {
    let mounted = true;
    
    const checkConnection = async () => {
      if (!mounted || !user) return;
      
      try {
        // Ping Supabase to check connectivity
        const { error } = await supabase.from('_health_check').select('*').limit(1);
        
        if (error) {
          console.log('⚠️ Supabase connection error:', error.message);
          
          // If we're online but can't reach Supabase, try to reconnect
          if (isOnline) {
            reconnectToSupabase();
          }
        } else {
          // Reset reconnect count if successful
          reconnectCountRef.current = 0;
        }
      } catch (err) {
        console.error('Failed to check Supabase connection:', err);
        
        if (isOnline) {
          reconnectToSupabase();
        }
      }
    };
    
    // Check connection every 60 seconds
    const intervalId = setInterval(checkConnection, 60000);
    
    // Initial check
    checkConnection();
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [isOnline, user]);
  
  // Function to reconnect to Supabase
  const reconnectToSupabase = async () => {
    if (reconnectCountRef.current >= 3) {
      console.log('⚠️ Maximum reconnection attempts reached');
      
      toast.error('Having trouble connecting to the server. Please refresh the page.', {
        id: 'max-reconnects',
        duration: 5000
      });
      
      return;
    }
    
    console.log('🔄 Reconnecting Supabase');
    reconnectCountRef.current += 1;
    
    try {
      if (refreshSession) {
        await refreshSession();
      }
      
      // Trigger data refresh after reconnection
      refreshData();
      
      toast.success('Connection restored', {
        id: 'connection-restored',
        duration: 3000
      });
    } catch (err) {
      console.error('Failed to reconnect:', err);
      
      // Exponential backoff for retries (5s, 10s, 20s)
      const delay = Math.pow(2, reconnectCountRef.current) * 5000;
      
      console.log(`Will try again in ${delay / 1000} seconds`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(reconnectToSupabase, delay);
    }
  };
  
  // Function to refresh data after reconnection
  const refreshData = () => {
    console.log('🔄 Triggering data refresh');
    
    // Dispatch event that other components can listen for
    const reconnectEvent = new CustomEvent('supabase-reconnected');
    window.dispatchEvent(reconnectEvent);
  };
  
  // Just render children, this is a background utility component
  return <>{children}</>;
};

export default ConnectionManager; 