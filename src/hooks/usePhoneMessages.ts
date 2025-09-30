import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { PhoneMessage, PhoneNumber } from '../types/database';
import { messageSyncService } from '../services/messageSyncService';

export const usePhoneMessages = (phoneNumberId?: string) => {
  const [messages, setMessages] = useState<PhoneMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [filterProvider, setFilterProvider] = useState<'all' | 'sms_activate' | 'receive_sms_online' | 'smspva'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const { showToast } = useToast();

  // Track if messages have been loaded to prevent duplicate calls
  const messagesLoadedRef = useRef<boolean>(false);
  // Track if we're currently loading messages
  const loadingMessagesRef = useRef<boolean>(false);
  // Track the current phone number ID to detect changes
  const currentPhoneIdRef = useRef<string | undefined>(phoneNumberId);
  // Auto-refresh interval
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset loaded state when phone number changes
  useEffect(() => {
    if (phoneNumberId !== currentPhoneIdRef.current) {
      messagesLoadedRef.current = false;
      currentPhoneIdRef.current = phoneNumberId;
    }
  }, [phoneNumberId]);

  // Fetch messages for a specific phone number
  const fetchMessages = useCallback(async (id?: string, forceRefresh = false) => {
    // Prevent duplicate calls if we're already loading
    if (loadingMessagesRef.current && !forceRefresh) {
      return;
    }

    const targetId = id || phoneNumberId;
    if (!targetId) {
      setError('No phone number ID provided');
      return;
    }

    loadingMessagesRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // First, get the phone number details to determine provider
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (phoneError) throw phoneError;
      
      setPhoneNumber(phoneData);
      
      console.log(`DEBUG: Fetching messages for phone ${targetId} (${phoneData.phone_number})`);
      
      // Get messages using the RPC function or direct query
      let messagesData;
      try {
        // Try RPC function first (might have elevated permissions)
      const { data, error } = await supabase.rpc('get_phone_messages', {
        p_phone_number_id: targetId
      });
      
      if (error) throw error;
        messagesData = data;
        console.log('DEBUG: RPC function succeeded');
      } catch (rpcError) {
        console.log('DEBUG: RPC failed, using direct query:', rpcError);
        // Fallback to direct query if RPC fails
        try {
        const { data, error } = await supabase
          .from('phone_messages')
          .select('*')
          .eq('phone_number_id', targetId)
          .order('received_at', { ascending: false });
        
        if (error) throw error;
        messagesData = data;
          console.log('DEBUG: Direct query succeeded');
        } catch (directError) {
          console.log('DEBUG: Direct query also failed:', directError);
          // Try with a more permissive query
          const { data, error } = await supabase
            .from('phone_messages')
            .select('id, phone_number_id, sender, message, received_at, message_source, created_at')
            .eq('phone_number_id', targetId)
            .order('received_at', { ascending: false });
          
          if (error) throw error;
          messagesData = data;
          console.log('DEBUG: Permissive query succeeded');
        }
      }
      
      console.log(`DEBUG: Found ${messagesData?.length || 0} messages in database for phone ${targetId}`);
      console.log('DEBUG: Messages data:', messagesData);
      
      setMessages(messagesData as PhoneMessage[]);
      messagesLoadedRef.current = true;
      
      // If this is a manual phone number and we have no messages, suggest syncing
      if (phoneData.provider === 'receive_sms_online' && (!messagesData || messagesData.length === 0)) {
        showToastRef.current({
          type: 'info',
          title: 'No Messages Found',
          message: 'Try syncing messages from receive-sms-online.info'
        });
      }
      
    } catch (err: any) {
      console.error('Error fetching phone messages:', err);
      setError(err.message || 'Failed to fetch phone messages');
      showToastRef.current({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to fetch phone messages' 
      });
    } finally {
      setLoading(false);
      loadingMessagesRef.current = false;
    }
  }, [phoneNumberId]); // Removed showToast dependency

  // Store fetchMessages in a ref to prevent infinite loops
  const fetchMessagesRef = useRef(fetchMessages);
  fetchMessagesRef.current = fetchMessages;

  // Store showToast in a ref to prevent infinite loops
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Initialize data and set up subscriptions only once on mount or when phone number changes
  useEffect(() => {
    let isMounted = true;
    let subscriptionActive = false;
    
    // Initial data load - only once per phone number
    const loadInitialData = async () => {
      if (!isMounted || !phoneNumberId) return;
      
      try {
        // Only load if we haven't loaded yet for this phone number
        if (!messagesLoadedRef.current) {
          await fetchMessagesRef.current();
        }
      } catch (error) {
        console.error('Error loading initial phone messages:', error);
      }
    };
    
    // Set up subscription for real-time updates - only once per phone number
    const setupSubscription = () => {
      if (subscriptionActive || !isMounted || !phoneNumberId) return null;
      
      subscriptionActive = true;
      
      return supabase
        .channel(`phone_messages:${phoneNumberId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'phone_messages',
            filter: `phone_number_id=eq.${phoneNumberId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            if (!isMounted) return;
            
            // Add new message to the list
            setMessages(prev => [payload.new as PhoneMessage, ...prev]);
            
            // Show notification using ref
            showToastRef.current({ 
              type: 'info', 
              title: 'New Message', 
              message: `New message received from ${(payload.new as PhoneMessage).sender}` 
            });
          }
        )
        .subscribe();
    };
    
    // Execute initialization
    loadInitialData();
    const channel = setupSubscription();
    
    // Clean up on unmount or when phone number changes
    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      // Clean up auto-refresh interval
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [phoneNumberId]); // Removed showToast from dependencies

  // Immediate SMS fetch for instant results (bypasses background sync)
  const fetchSMSImmediately = useCallback(async (id?: string): Promise<PhoneMessage[]> => {
    const targetId = id || phoneNumberId;
    if (!targetId) {
      throw new Error('No phone number ID provided');
    }

    try {
      // Get the phone number details first
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (phoneError) throw phoneError;
      
      if (phoneData.provider === 'receive_sms_online' && phoneData.external_url) {
        // Use backend endpoint to avoid CORS issues
        try {
          const response = await fetch('/api/phone/receive-sms/preview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              url: phoneData.external_url,
              phoneNumberId: targetId 
            })
          });
        
          if (!response.ok) {
            throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
          }

          const scrapeResult = await response.json();
          
          if (scrapeResult.success && scrapeResult.messages.length > 0) {
            // Backend now handles database insertion, so we just return the messages
            const phoneMessages: PhoneMessage[] = scrapeResult.messages.map((msg: any) => ({
              id: `temp-${Date.now()}-${Math.random()}`,
              phone_number_id: targetId,
              sender: msg.sender,
              message: msg.message,
              received_at: msg.received_at,
              message_source: 'scraping',
              created_at: new Date().toISOString()
            }));

            return phoneMessages;
          }
        } catch (backendError) {
          // Fallback to frontend scraper if backend fails
          try {
            const { ReceiveSmsOnlineScraper } = await import('../services/receiveSmsOnlineScraper');
            const scrapeResult = await ReceiveSmsOnlineScraper.scrapeMessages(phoneData.external_url);
            
            if (scrapeResult.success && scrapeResult.messages.length > 0) {
              // Frontend fallback - just return the messages without trying to insert them
          const phoneMessages: PhoneMessage[] = scrapeResult.messages.map(msg => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            phone_number_id: targetId,
            sender: msg.sender,
            message: msg.message,
            received_at: msg.received_at,
            message_source: 'scraping',
            created_at: new Date().toISOString()
          }));

          return phoneMessages;
            }
          } catch (frontendError) {
            console.error('Both backend and frontend scraping failed:', frontendError);
            throw frontendError;
          }
        }
      } else if (phoneData.provider === 'smspva' && phoneData.external_url) {
        // Use backend API to fetch SMSPVA messages
        try {
          console.log(`[SMSPVA] Fetching messages for phone ${phoneData.phone_number} (ID: ${phoneData.external_url})`);
          
          const response = await fetch(`/api/phone/status/${targetId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`SMSPVA API error: ${response.status}`);
          }

          const data = await response.json();
          console.log('SMSPVA messages response:', data);

          // The status endpoint returns { status: 'success', data: { messages: [...] } }
          const messages = data.data?.messages || data.messages || [];
          if (messages && messages.length > 0) {
            // Store messages in database and return them
            const phoneMessages: PhoneMessage[] = [];
            
            for (const msg of messages) {
              try {
                const { data: insertedMessage, error } = await supabase
                  .from('phone_messages')
                  .upsert({
                    phone_number_id: targetId,
                    sender: msg.sender || 'SMSPVA',
                    message: msg.text || msg.message || '',
                    received_at: msg.received_at || new Date().toISOString(),
                    message_source: 'api'
                  }, {
                    onConflict: 'phone_number_id,sender,message'
                  })
                  .select()
                  .single();

                if (!error && insertedMessage) {
                  phoneMessages.push(insertedMessage as PhoneMessage);
                }
              } catch (insertError) {
                console.error('Error inserting SMSPVA message:', insertError);
              }
            }
            
            console.log(`[SMSPVA] Successfully processed ${phoneMessages.length} messages`);
            return phoneMessages;
          } else {
            console.log('[SMSPVA] No messages found in API response');
          }
        } catch (smspvaError) {
          console.error('Error fetching SMSPVA messages:', smspvaError);
          throw smspvaError;
        }
      } else if (phoneData.provider === 'gogetsms' && (phoneData.external_url || phoneData.rent_id)) {
        // Use backend API to fetch GoGetSMS messages
        try {
          const rentalId = phoneData.external_url || phoneData.rent_id;
          console.log(`[GOGETSMS] Fetching messages for phone ${phoneData.phone_number} (Rental ID: ${rentalId})`);
          
          const response = await fetch(`/api/phone/status/${targetId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`GoGetSMS API error: ${response.status}`);
          }

          const data = await response.json();
          console.log('GoGetSMS messages response:', data);

          // The status endpoint returns { status: 'success', data: { messages: [...] } }
          const messages = data.data?.messages || data.messages || [];
          if (messages && messages.length > 0) {
            // Store messages in database and return them
            const phoneMessages: PhoneMessage[] = [];
            
            for (const msg of messages) {
              try {
                const { data: insertedMessage, error } = await supabase
                  .from('phone_messages')
                  .upsert({
                    phone_number_id: targetId,
                    sender: msg.sender || 'GoGetSMS',
                    message: msg.text || msg.message || '',
                    received_at: msg.received_at || new Date().toISOString(),
                    message_source: 'api'
                  }, {
                    onConflict: 'phone_number_id,sender,message'
                  })
                  .select()
                  .single();

                if (!error && insertedMessage) {
                  phoneMessages.push(insertedMessage as PhoneMessage);
                }
              } catch (insertError) {
                console.error('Error inserting GoGetSMS message:', insertError);
              }
            }
            
            console.log(`[GOGETSMS] Successfully processed ${phoneMessages.length} messages`);
            return phoneMessages;
          } else {
            console.log('[GOGETSMS] No messages found in API response');
          }
        } catch (gogetSmsError) {
          console.error('Error fetching GoGetSMS messages:', gogetSmsError);
          throw gogetSmsError;
        }
      }
      
      // Fallback to database query
      const { data, error } = await supabase
        .from('phone_messages')
        .select('*')
        .eq('phone_number_id', targetId)
        .order('received_at', { ascending: false });
      
      if (error) throw error;
      return data as PhoneMessage[];
      
    } catch (error) {
      console.error('Error fetching SMS immediately:', error);
      throw error;
    }
  }, [phoneNumberId]);

  // Sync messages manually with immediate feedback
  const syncMessages = useCallback(async (id?: string, showToastMessage = true) => {
    const targetId = id || phoneNumberId;
    if (!targetId) {
      if (showToastMessage) {
      showToastRef.current({
        type: 'error',
        title: 'Error',
          message: 'No phone number ID provided'
      });
      }
      return;
    }

    try {
      setLoading(true);
      
      // Use immediate fetch for faster results
      const freshMessages = await fetchSMSImmediately(targetId);
      setMessages(freshMessages);
      
      if (showToastMessage) {
        showToastRef.current({
          type: 'success',
          title: 'Messages Updated',
          message: `Found ${freshMessages.length} messages`
        });
      }
      
    } catch (error) {
      console.error('Error syncing messages:', error);
      if (showToastMessage) {
      showToastRef.current({
        type: 'error',
        title: 'Sync Failed',
          message: error instanceof Error ? error.message : 'Failed to sync messages'
      });
      }
    } finally {
      setLoading(false);
    }
  }, [phoneNumberId, fetchSMSImmediately]); // Removed showToast dependency

  // Enhanced auto-refresh with provider-specific sync logic
  const autoRefreshWithSync = useCallback(async () => {
    if (!phoneNumber || !phoneNumberId) return;
    
    try {
      console.log(`[AUTO-REFRESH] Syncing ${phoneNumber.provider} phone number: ${phoneNumber.phone_number}`);
      
      // Provider-specific sync logic
      if (phoneNumber.provider === 'anosim') {
        // For Anosim, call the sync API first
        const bookingId = phoneNumber.order_booking_id || phoneNumber.external_url || phoneNumber.rent_id;
        
        if (bookingId) {
          console.log(`[AUTO-REFRESH] Syncing Anosim booking ID: ${bookingId}`);
          
          try {
            const response = await fetch(`/api/phone/sync/anosim/${bookingId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`[AUTO-REFRESH] Anosim sync successful:`, data);
            } else {
              console.warn(`[AUTO-REFRESH] Anosim sync failed: ${response.status}`);
            }
          } catch (syncError) {
            console.warn('[AUTO-REFRESH] Anosim sync error:', syncError);
          }
        }
      } else if (phoneNumber.provider === 'smspva') {
        // For SMSPVA, call the sync API
        try {
          const response = await fetch(`/api/phone/sync/smspva/${phoneNumberId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            console.log('[AUTO-REFRESH] SMSPVA sync successful');
          }
        } catch (syncError) {
          console.warn('[AUTO-REFRESH] SMSPVA sync error:', syncError);
        }
      } else if (phoneNumber.provider === 'receive_sms_online') {
        // For manual numbers, use the existing fetch logic
        await fetchSMSImmediately(phoneNumberId);
      }
      
      // After sync, fetch messages from database
      await fetchMessages(phoneNumberId, true);
      
    } catch (error) {
      console.error('[AUTO-REFRESH] Error during sync:', error);
      // Still try to fetch messages even if sync fails
      await fetchMessages(phoneNumberId, true);
    }
  }, [phoneNumber, phoneNumberId, fetchMessages, fetchSMSImmediately]);

  // Toggle auto-refresh for manual, SMSPVA, Anosim, and GoGetSMS phone numbers
  const toggleAutoRefresh = useCallback(() => {
    if (!phoneNumber || (
      phoneNumber.provider !== 'receive_sms_online' && 
      phoneNumber.provider !== 'smspva' && 
      phoneNumber.provider !== 'anosim' &&
      phoneNumber.provider !== 'gogetsms'
    )) {
      showToastRef.current({
        type: 'warning',
        title: 'Not Supported',
        message: 'Auto-refresh is only available for manual, SMSPVA, Anosim, and GoGetSMS phone numbers'
      });
      return;
    }

    // Additional check for GoGetSMS to ensure we have a rental ID
    if (phoneNumber.provider === 'gogetsms' && !phoneNumber.external_url && !phoneNumber.rent_id) {
      showToastRef.current({
        type: 'warning',
        title: 'Missing Rental ID',
        message: 'GoGetSMS auto-refresh requires a rental ID'
      });
      return;
    }

    setAutoRefresh(prev => {
      const newValue = !prev;
      
      if (newValue) {
        // Start enhanced auto-refresh every 15 seconds
        autoRefreshIntervalRef.current = setInterval(() => {
          autoRefreshWithSync();
        }, 15000);
        
        showToastRef.current({
          type: 'success',
          title: 'Auto-Refresh Started',
          message: 'Messages will refresh every 15 seconds with API sync'
        });
      } else {
        // Stop auto-refresh
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
          autoRefreshIntervalRef.current = null;
        }
        
        showToastRef.current({
          type: 'info',
          title: 'Auto-Refresh Stopped',
          message: 'Automatic message refresh has been disabled'
        });
      }
      
      return newValue;
    });
  }, [phoneNumber, phoneNumberId, autoRefreshWithSync]); // Updated dependencies

  // Filter messages based on provider and search term
  const filteredMessages = useCallback(() => {
    let filtered = messages;

    // Filter by provider
    if (filterProvider !== 'all') {
      filtered = filtered.filter(message => {
        if (filterProvider === 'sms_activate') {
          return message.message_source === 'api' || !message.message_source;
        } else if (filterProvider === 'receive_sms_online') {
          return message.message_source === 'scraping';
        } else if (filterProvider === 'smspva') {
          return message.message_source === 'api';
        }
        return true;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(message =>
        message.sender.toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [messages, filterProvider, searchTerm]);

  // Export messages to CSV
  const exportMessages = useCallback(() => {
    const filtered = filteredMessages();
    
    if (filtered.length === 0) {
      showToastRef.current({
        type: 'warning',
        title: 'No Messages',
        message: 'No messages to export'
      });
      return;
    }

    const csvContent = [
      ['Sender', 'Message', 'Received At', 'Source'].join(','),
      ...filtered.map(msg => [
        `"${msg.sender}"`,
        `"${msg.message.replace(/"/g, '""')}"`,
        `"${new Date(msg.received_at).toLocaleString()}"`,
        `"${msg.message_source || 'SMS-Activate'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `messages_${phoneNumber?.phone_number || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToastRef.current({
      type: 'success',
      title: 'Export Complete',
      message: `Exported ${filtered.length} messages to CSV`
    });
  }, [filteredMessages, phoneNumber]); // Removed showToast dependency

  // Add a new message (for testing purposes)
  const addMessage = async (message: Omit<PhoneMessage, 'id' | 'received_at'>) => {
    try {
      const { data, error } = await supabase
        .from('phone_messages')
        .insert({
          phone_number_id: message.phone_number_id,
          sender: message.sender,
          message: message.message
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as PhoneMessage;
    } catch (err: any) {
      console.error('Error adding phone message:', err);
      showToastRef.current({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to add phone message' 
      });
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    phoneNumber,
    filterProvider,
    searchTerm,
    autoRefresh,
    fetchMessages,
    fetchSMSImmediately,
    addMessage,
    syncMessages,
    toggleAutoRefresh,
    filteredMessages: filteredMessages(),
    exportMessages,
    setFilterProvider,
    setSearchTerm
  };
};
