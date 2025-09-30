import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface PhoneMessage {
  id: string;
  phone_number_id: string;
  sender: string;
  message: string;
  received_at: string;
}

/**
 * Hook for managing phone messages with improved data management
 */
export const usePhoneMessagesStats = (phoneNumberId?: string) => {
  // Messages state with session storage caching
  const [messages, setMessages] = useState<PhoneMessage[]>(() => {
    if (!phoneNumberId) return [];
    
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem(`phoneMessages_${phoneNumberId}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 2 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 2 * 60 * 1000)) {
          return parsedData.messages || [];
        }
      }
    } catch (error) {
      console.error('Error retrieving stored phone messages:', error);
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    if (!phoneNumberId) return 0;
    
    try {
      const storedData = sessionStorage.getItem(`phoneMessages_${phoneNumberId}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return parsedData.lastFetchTime || 0;
      }
    } catch (error) {
      console.error('Error retrieving last fetch time:', error);
    }
    return 0;
  });
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  
  // Track the current phone number ID to detect changes
  const currentPhoneIdRef = useRef<string | undefined>(phoneNumberId);
  
  // Reset data when phone number changes
  useEffect(() => {
    if (phoneNumberId !== currentPhoneIdRef.current) {
      currentPhoneIdRef.current = phoneNumberId;
      
      // Load from cache if available
      if (phoneNumberId) {
        try {
          const storedData = sessionStorage.getItem(`phoneMessages_${phoneNumberId}`);
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Use cached data if it's not older than 2 minutes
            if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 2 * 60 * 1000)) {
              setMessages(parsedData.messages || []);
              setLastFetchTime(parsedData.lastFetchTime);
              return;
            }
          }
        } catch (error) {
          console.error('Error retrieving stored phone messages on change:', error);
        }
      }
      
      // Clear messages if no phone number or no cached data
      setMessages([]);
      setLastFetchTime(0);
    }
  }, [phoneNumberId]);
  
  /**
   * Fetch messages for a specific phone number
   */
  const fetchMessages = useCallback(async (force = false) => {
    // If no phone number ID, return empty array
    if (!phoneNumberId) {
      return [];
    }
    
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Messages fetch already in progress, skipping');
      return messages;
    }
    
    // Check for cooling period (3 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 3000; // 3 seconds
    
    if (!force && lastFetchTime && (now - lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period for messages, not fetching again. Last fetch: ${new Date(lastFetchTime).toLocaleTimeString()}`);
      return messages;
    }
    
    // If we have data in cache that's not too old (< 2 minutes), don't show loading state
    const hasRecentData = lastFetchTime && (now - lastFetchTime < 2 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log(`Fetching messages for phone number: ${phoneNumberId}`);
      const { data, error: fetchError } = await supabase.rpc('get_phone_messages', {
        p_phone_number_id: phoneNumberId
      });
      
      if (fetchError) throw fetchError;
      
      const fetchedMessages = data as PhoneMessage[] || [];
      console.log(`Found ${fetchedMessages.length} messages for phone number`);
      
      // Update state with fetched data
      setMessages(fetchedMessages);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem(`phoneMessages_${phoneNumberId}`, JSON.stringify({
          messages: fetchedMessages,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing phone messages in session storage:', storageError);
      }
      
      return fetchedMessages;
    } catch (err) {
      console.error('Error fetching phone messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch phone messages'));
      toast.error('Failed to fetch phone messages');
      return [];
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [phoneNumberId, lastFetchTime, messages]);
  
  /**
   * Add a test message (for debugging purposes)
   */
  const addTestMessage = async (sender: string, message: string) => {
    if (!phoneNumberId) {
      toast.error('No phone number selected');
      return null;
    }
    
    try {
      setLoading(true);
      
      const { data, error: insertError } = await supabase
        .from('phone_messages')
        .insert({
          phone_number_id: phoneNumberId,
          sender,
          message
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Force refresh messages
      await fetchMessages(true);
      
      toast.success('Test message added successfully');
      return data as PhoneMessage;
    } catch (err) {
      console.error('Error adding test message:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add test message');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Load messages initially when phone number ID is provided
  useEffect(() => {
    if (phoneNumberId && messages.length === 0 && lastFetchTime === 0) {
      fetchMessages();
    }
  }, [phoneNumberId, fetchMessages, messages.length, lastFetchTime]);
  
  return {
    messages,
    loading,
    error,
    lastFetchTime,
    fetchMessages,
    addTestMessage
  };
}; 