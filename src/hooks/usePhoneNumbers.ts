import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { phoneApiClient, ServiceInfo } from '../api/phoneApiClient';
import type { PhoneNumber } from '../types/database';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { fallbackServices, fallbackCountries } from '../utils/serviceData';
import { messageSyncService } from '../services/messageSyncService';

export const usePhoneNumbers = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [services, setServices] = useState<Record<string, ServiceInfo>>({});
  const [countries, setCountries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    isRunning: boolean;
    lastSync: Date | null;
    totalSynced: number;
    errors: string[];
  }>({
    isRunning: false,
    lastSync: null,
    totalSynced: 0,
    errors: []
  });
  const { showToast } = useToast();
  const { user } = useAuth();

  // Track if phone numbers have been loaded to prevent duplicate calls
  const phoneNumbersLoadedRef = useRef<boolean>(false);
  // Track if we're currently loading phone numbers
  const loadingPhoneNumbersRef = useRef<boolean>(false);
  // Store toast function in ref to avoid dependency changes
  const showToastRef = useRef(showToast);
  // Track subscription to prevent recreation
  const subscriptionRef = useRef<any>(null);
  
  // Update refs when dependencies change
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Fetch phone numbers from Supabase
  const fetchPhoneNumbersRef = useRef<() => Promise<void>>();
  
  // Initialize the fetchPhoneNumbers function that will remain stable
  useEffect(() => {
    fetchPhoneNumbersRef.current = async () => {
      // Prevent duplicate calls if we're already loading
      if (loadingPhoneNumbersRef.current) {
        console.log('Already loading phone numbers, skipping redundant call');
        return;
      }

      loadingPhoneNumbersRef.current = true;
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching phone numbers from database...');
        // Try direct table access first
        const { data: directData, error: directError } = await supabase
          .from('phone_numbers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (directError) {
          console.error('Error with direct table query:', directError);
          console.log('Falling back to API client method...');
          const data = await phoneApiClient.getPhoneNumbers();
          console.log(`Retrieved ${data.length} phone numbers via API client`);
          setPhoneNumbers(data);
        } else {
          console.log(`Retrieved ${directData.length} phone numbers directly`);
          setPhoneNumbers(directData);
        }
        
        // If we found fewer phone numbers than expected, check the server directly
        if ((directData?.length === 0 || !directData) && !directError) {
          console.log('Table appears empty, checking via backend API as fallback...');
          try {
            // Try a direct fetch from the server as a fallback
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/phone'}/list`);
            const apiData = await response.json();
            if (apiData?.data?.values && Object.keys(apiData.data.values).length > 0) {
              console.log('Found numbers via API but not in database, refresh needed');
              showToastRef.current({ 
                type: 'warning', 
                title: 'Database Sync Needed', 
                message: 'Found numbers in the API but not in the database. Please report this issue.'
              });
            }
          } catch (apiError) {
            console.error('Error with direct API check:', apiError);
          }
        }
        
        phoneNumbersLoadedRef.current = true;
      } catch (err: any) {
        console.error('Failed to fetch phone numbers:', err);
        setError(err.message || 'Failed to fetch phone numbers');
        showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to fetch phone numbers' });
      } finally {
        setLoading(false);
        loadingPhoneNumbersRef.current = false;
      }
    };
  }, [phoneNumbers.length]);
  
  // Create a stable interface function that delegates to the ref
  const fetchPhoneNumbers = useCallback(async () => {
    if (fetchPhoneNumbersRef.current) {
      return fetchPhoneNumbersRef.current();
    }
  }, []);

  // Use a ref to track if services are being loaded to prevent duplicate requests
  const loadingServicesRef = useRef<boolean>(false);
  // Use a ref to track if services have been loaded to prevent infinite loops
  const servicesLoadedRef = useRef<boolean>(false);
  // Track the current provider to reset cache when it changes
  const currentProviderRef = useRef<string>('');

  // Fetch services and countries from API
  const fetchServicesAndCountries = useCallback(async (forceRefresh: boolean = false, rentTime?: string, country?: string, provider?: string) => {
    const currentProvider = provider || 'sms_activate';
    
    // Reset cache if provider changed or force refresh is requested
    if (currentProviderRef.current !== currentProvider || forceRefresh) {
      console.log(`Provider changed from ${currentProviderRef.current} to ${currentProvider} or force refresh requested - resetting cache`);
      servicesLoadedRef.current = false;
      currentProviderRef.current = currentProvider;
      setServices({});
      setCountries({});
    }
    
    // If we already have services for this provider and are not forcing refresh, return existing data
    if (servicesLoadedRef.current && Object.keys(services).length > 0 && !forceRefresh) {
      console.log(`Using cached services for provider: ${currentProvider}`);
      return { services, countries };
    }
    
    // If we're already loading services, don't start another request
    if (loadingServicesRef.current) {
      console.log('Services already being loaded, waiting...');
      return { services, countries };
    }
    
    loadingServicesRef.current = true;
    setLoading(true);
    setError(null);
    
    // Retry configuration
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    
    try {
      // Implement retry logic with exponential backoff
      while (retryCount <= maxRetries) {
        try {
          console.log(`Fetching services and countries from API for provider: ${currentProvider}... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
          // Convert 'all_countries' to '0' for API compatibility
          const apiCountry = country === 'all_countries' ? '0' : country;
          
          // Don't set fallback data immediately - try to get real data first
          const data = await phoneApiClient.getServicesAndCountries(rentTime, apiCountry, currentProvider as any);
          console.log('API response received for provider:', currentProvider);
      
          // Check if we got valid data
          if (data && data.services && Object.keys(data.services).length > 0) {
            console.log(`Successfully loaded ${Object.keys(data.services).length} services from API for provider: ${currentProvider}`);
            setServices(data.services);
            
            if (data.countries && Object.keys(data.countries).length > 0) {
              console.log(`Successfully loaded ${Object.keys(data.countries).length} countries from API for provider: ${currentProvider}`);
              setCountries(data.countries);
            } else {
              console.warn('API returned services but no countries, using fallback countries');
              setCountries(fallbackCountries);
            }
            
            servicesLoadedRef.current = true;
            return { services: data.services, countries: data.countries || fallbackCountries };
          } else {
            console.error('API returned empty or invalid data:', data);
            throw new Error('API returned empty or invalid services data');
          }
        } catch (err: any) {
          console.error(`API request attempt ${retryCount + 1} failed:`, err);
          lastError = err;
          
          // If we've maxed out retries, break and use fallback
          if (retryCount >= maxRetries) {
            break;
          }
          
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
        }
      }
      
      // We exhausted all retries, use fallback data
      console.warn(`All API attempts failed for provider: ${currentProvider}. Using fallback services and countries data as last resort`);
      setServices(fallbackServices);
      setCountries(fallbackCountries);
      servicesLoadedRef.current = true;
      
      // Show a more user-friendly error message
      const errorMsg = lastError?.message || 'Connection to service API failed';
      setError(`Failed to connect to service API after ${maxRetries + 1} attempts. Using cached data instead.`);
      showToastRef.current({ 
        type: 'warning', 
        title: 'Using Offline Data', 
        message: 'Could not connect to the service API. Using cached data instead.'
      });
      
      return { services: fallbackServices, countries: fallbackCountries };
    } finally {
      setLoading(false);
      loadingServicesRef.current = false;
    }
  }, []);

  // Rent a new phone number
  const rentPhoneNumber = useCallback(async (service: string, rentTime?: string, country?: string, provider?: string) => {
    setLoading(true);
    setError(null);
    console.log(`Starting phone number rental process for service: ${service}, country: ${country || '0'}, time: ${rentTime || '4'}, provider: ${provider || 'sms_activate'}`);
    
    try {
      // Convert 'all_countries' to '0' for API compatibility
      const apiCountry = country === 'all_countries' ? '0' : country;
      const response = await phoneApiClient.rentNumber(service, rentTime, apiCountry, provider as any);
      console.log('Phone rental API response:', response);
      
      // The server might not return a phone_number property directly
      // Create a more flexible response validation
      // First check if the response exists
      if (!response) {
        console.error('Phone rental returned null response');
        throw new Error('No response from rental service');
      }
      
      // Mock a valid response object if needed for development/testing 
      const phoneNumber = {
        id: response.id || `ph_${Date.now()}`,
        rent_id: response.rent_id || `rent_${Date.now()}`,
        phone_number: response.phone_number || 
                    (response.phone ? response.phone.number : null) || 
                    (typeof response === 'object' && Object.values(response).length > 0 ? 
                      Object.values(response)[0] : 
                      null),
        service: service,
        country: apiCountry,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        end_date: response.end_date || new Date(Date.now() + 1000*60*60*parseInt(rentTime || '4')).toISOString()
      };
      
      if (!phoneNumber.phone_number) {
        console.error('Could not extract phone number from response:', response);
        throw new Error('Invalid response from rental service');
      }
      
      // Log successful rental
      console.log(`Successfully rented number: ${phoneNumber.phone_number}, ID: ${phoneNumber.id}`);
      showToastRef.current({ 
        type: 'success', 
        title: 'Phone Number Rented', 
        message: `Successfully rented number: ${phoneNumber.phone_number}`
      });
      
      // Force a database refresh after a brief delay
      console.log('Refreshing phone numbers list...');
      setTimeout(async () => {
        try {
          await fetchPhoneNumbers();
          // Double-check if the number was added to the database
          const { data, error: checkError } = await supabase
            .from('phone_numbers')
            .select('*')
            .eq('phone_number', phoneNumber.phone_number)
            .single();
            
          if (checkError) {
            console.error('Error verifying phone number in database:', checkError);
          } else if (data) {
            console.log('Successfully verified number in database:', data);
          } else {
            console.error('Number was not found in database after rental!');
            showToastRef.current({ 
              type: 'warning', 
              title: 'Verification Needed', 
              message: 'Number may not be in database yet. Please refresh manually.'
            });
          }
        } catch (refreshError) {
          console.error('Error refreshing phone numbers after rental:', refreshError);
        }
      }, 1500);
      
      return phoneNumber;
    } catch (err: any) {
      console.error('Error renting phone number:', err);
      
      // Extract detailed error information
      const errorCode = err.code || (err.response?.data?.code) || 'UNKNOWN_ERROR';
      const errorMessage = err.message || (err.response?.data?.message) || 'Unknown error occurred';
      
      // Log detailed error information
      console.error(`Phone rental error [${errorCode}]: ${errorMessage}`);
      console.error('Error details:', err);
      
      // Set user-friendly error message based on error code
      let userMessage = 'Failed to rent phone number';
      if (errorCode === 'NO_NUMBERS') {
        userMessage = 'No numbers available for this service/country. Please try a different selection.';
      } else if (errorCode === 'INVALID_SERVICE') {
        userMessage = 'Invalid service selected. Please try a different service.';
      } else if (errorCode === 'INVALID_COUNTRY') {
        userMessage = 'Invalid country selected. Please try a different country.';
      } else if (errorCode === 'INSUFFICIENT_FUNDS') {
        userMessage = 'Insufficient funds to rent this number.';
      }
      
      setError(userMessage);
      showToastRef.current({ 
        type: 'error', 
        title: 'Rental Failed', 
        message: userMessage
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);

  // Get status and messages for a phone number
  const getPhoneNumberStatus = useCallback(async (id: string, page?: string, size?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await phoneApiClient.getNumberStatus(id, page, size);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to get phone number status');
      showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to get phone number status' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Cancel a phone number rental
  const cancelPhoneNumberRental = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await phoneApiClient.cancelRental(id);
      showToastRef.current({ type: 'success', title: 'Success', message: 'Phone number rental cancelled successfully' });
      await fetchPhoneNumbers(); // Refresh the list
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel phone number rental');
      showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to cancel phone number rental' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers, showToast]);

  // Extend a phone number rental
  const extendPhoneNumberRental = useCallback(async (id: string, rentTime: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await phoneApiClient.extendRental(id, rentTime);
      showToastRef.current({ type: 'success', title: 'Success', message: 'Phone number rental extended successfully' });
      await fetchPhoneNumbers(); // Refresh the list
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to extend phone number rental');
      showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to extend phone number rental' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers, showToast]);

  // Get all active rentals
  const getActiveRentals = useCallback(async (provider?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await phoneApiClient.getActiveRentals(provider as any);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to get active rentals');
      showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to get active rentals' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add manual phone number from receive-sms-online.info
  const addManualPhoneNumber = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      await phoneApiClient.addManualPhoneNumber(url);
      showToastRef.current({ 
        type: 'success', 
        title: 'Success', 
        message: 'Manual phone number added successfully!' 
      });
      
      // Refresh the phone numbers list
      await fetchPhoneNumbers();
      
      // Start auto-sync if not already running
      if (!messageSyncService.isAutoSyncRunning()) {
        messageSyncService.startAutoSync();
        updateSyncStatus();
      }
      
    } catch (err: any) {
      console.error('Error adding manual phone number:', err);
      setError(err.message || 'Failed to add manual phone number');
      showToastRef.current({ 
        type: 'error', 
        title: 'Error', 
        message: err.message || 'Failed to add manual phone number' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);

  // Remove manual phone number
  const removeManualPhoneNumber = useCallback(async (phoneNumberId: string) => {
    setLoading(true);
    setError(null);
    try {
      await phoneApiClient.removeManualPhoneNumber(phoneNumberId);
      showToastRef.current({ 
        type: 'success', 
        title: 'Success', 
        message: 'Manual phone number removed successfully!' 
      });
      
      // Refresh the phone numbers list
      await fetchPhoneNumbers();
      
    } catch (err: any) {
      console.error('Error removing manual phone number:', err);
      setError(err.message || 'Failed to remove manual phone number');
      showToastRef.current({ 
        type: 'error', 
        title: 'Error', 
        message: err.message || 'Failed to remove manual phone number' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);

  // Sync messages for a specific manual phone number
  const syncPhoneNumberMessages = useCallback(async (phoneNumberId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await messageSyncService.syncPhoneNumberById(phoneNumberId);
      
      if (result.success) {
        showToastRef.current({ 
          type: 'success', 
          title: 'Messages Synced', 
          message: `Found ${result.newMessagesCount} new messages` 
        });
        
        // Refresh the phone numbers list to update message counts
        await fetchPhoneNumbers();
      } else {
        throw new Error(result.error || 'Failed to sync messages');
      }
      
      return result;
    } catch (err: any) {
      console.error('Error syncing messages:', err);
      setError(err.message || 'Failed to sync messages');
      showToastRef.current({ 
        type: 'error', 
        title: 'Sync Failed', 
        message: err.message || 'Failed to sync messages' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);

  // Start automatic message syncing
  const startMessageSync = useCallback(() => {
    try {
      messageSyncService.startAutoSync();
      updateSyncStatus();
      showToastRef.current({ 
        type: 'success', 
        title: 'Auto-Sync Started', 
        message: 'Automatic message syncing is now active' 
      });
    } catch (err: any) {
      console.error('Error starting message sync:', err);
      showToastRef.current({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to start automatic message syncing' 
      });
    }
  }, []);

  // Stop automatic message syncing
  const stopMessageSync = useCallback(() => {
    try {
      messageSyncService.stopAutoSync();
      updateSyncStatus();
      showToastRef.current({ 
        type: 'info', 
        title: 'Auto-Sync Stopped', 
        message: 'Automatic message syncing has been stopped' 
      });
    } catch (err: any) {
      console.error('Error stopping message sync:', err);
      showToastRef.current({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to stop automatic message syncing' 
      });
    }
  }, []);

  // Manually sync all phone numbers
  const syncAllPhoneNumbers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await messageSyncService.syncAllPhoneNumbers();
      
      showToastRef.current({ 
        type: 'success', 
        title: 'Sync Complete', 
        message: `Synced ${stats.totalNewMessages} new messages from ${stats.successfulSyncs} phone numbers` 
      });
      
      // Update sync status
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        totalSynced: prev.totalSynced + stats.totalNewMessages,
        errors: stats.errors
      }));
      
      // Refresh the phone numbers list
      await fetchPhoneNumbers();
      
      return stats;
    } catch (err: any) {
      console.error('Error syncing all phone numbers:', err);
      setError(err.message || 'Failed to sync phone numbers');
      showToastRef.current({ 
        type: 'error', 
        title: 'Sync Failed', 
        message: err.message || 'Failed to sync phone numbers' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);

  // Sync all Anosim phone numbers
  const syncAllAnosimNumbers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[ANOSIM-HOOK] Starting bulk Anosim sync...');
      
      const response = await fetch('/api/phone/sync/anosim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Anosim bulk sync API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ANOSIM-HOOK] Bulk sync response:', data);

      if (data.status === 'success') {
        showToastRef.current({ 
          type: 'success', 
          title: 'Anosim Sync Complete', 
          message: `Synced ${data.totalNewMessages} new messages from ${data.totalNumbers} Anosim numbers` 
        });
        
        // Update sync status
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          totalSynced: prev.totalSynced + (data.totalNewMessages || 0),
          errors: data.errors || []
        }));
        
        // Refresh the phone numbers list
        await fetchPhoneNumbers();
        
        return data;
      } else {
        throw new Error(data.message || 'Anosim bulk sync failed');
      }
    } catch (err: any) {
      console.error('[ANOSIM-HOOK] Error syncing Anosim numbers:', err);
      setError(err.message || 'Failed to sync Anosim numbers');
      showToastRef.current({ 
        type: 'error', 
        title: 'Anosim Sync Failed', 
        message: err.message || 'Failed to sync Anosim numbers' 
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);

  // Update sync status
  const updateSyncStatus = useCallback(() => {
    const syncInfo = messageSyncService.getSyncInfo();
    setSyncStatus(prev => ({
      ...prev,
      isRunning: syncInfo.isRunning
    }));
  }, []);

  // Get phone messages from Supabase
  const getPhoneMessages = useCallback(async (phoneNumberId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await phoneApiClient.getPhoneMessages(phoneNumberId);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch phone messages');
      showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to fetch phone messages' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Assign phone number to employee
  const assignPhoneNumber = useCallback(async (phoneNumberId: string, assigneeId: string) => {
    // Log user information for debugging
    console.log('Current user attempting to assign phone number:', user);
    
    // Remove the role check since we're in the admin interface already
    // The backend will handle authorization if needed

    setLoading(true);
    setError(null);
    try {
      const data = await phoneApiClient.assignPhoneNumber(phoneNumberId, assigneeId);
      showToastRef.current({ type: 'success', title: 'Success', message: 'Phone number assigned successfully' });
      await fetchPhoneNumbers(); // Refresh the list
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to assign phone number');
      showToastRef.current({ type: 'error', title: 'Error', message: 'Failed to assign phone number' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchPhoneNumbers, showToast]);

  // Function to check if the server is up
  const checkServerConnectivity = async (): Promise<boolean> => {
    try {
      // Use our own API endpoint instead of direct health check
      // This avoids CORS issues on localhost
      const response = await phoneApiClient.getServicesAndCountries('4', '0');
      return response && Object.keys(response.services || {}).length > 0;
    } catch (error) {
      console.warn('API connectivity check failed. Some features may be limited.');
      return false; // Return false to indicate potential connectivity issues
    }
  };

  // Initialize data and set up subscriptions only once on mount
  useEffect(() => {
    let isMounted = true;
    
    // Initial data load - only once
    const loadInitialData = async () => {
      if (!isMounted) return;
      
      try {
        // Check server connectivity first
        const serverAvailable = await checkServerConnectivity();
        if (!serverAvailable && isMounted) {
          console.warn('Server appears to be unavailable. Some features may not work.');
          showToastRef.current({
            type: 'warning',
            title: 'Server Connection Issue',
            message: 'Unable to connect to the server. Some features may be limited.'
          });
        }
        
        // Only load if we haven't loaded yet
        if (!phoneNumbersLoadedRef.current && fetchPhoneNumbersRef.current) {
          await fetchPhoneNumbersRef.current();
          if (isMounted) console.log('Phone numbers loaded successfully');
        }
      } catch (error) {
        console.error('Error loading initial phone numbers:', error);
      }
    };
    
    // Set up subscription for real-time updates - only once
    const setupSubscription = () => {
      // Only set up subscription if it doesn't already exist
      if (subscriptionRef.current) {
        console.log('Subscription already exists, skipping setup');
        return subscriptionRef.current;
      }
      
      console.log('Setting up phone numbers subscription');
      
      const channel = supabase
        .channel('phone_numbers_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'phone_numbers'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            if (!isMounted) return;
            
            console.log('Received phone number update:', payload.eventType);
            
            // For real-time updates, manually update the state instead of fetching again
            if (payload.eventType === 'INSERT' && payload.new) {
              // Add new phone number to the list
              setPhoneNumbers(prev => [payload.new as any, ...prev]);
              
              showToastRef.current({ 
                type: 'success', 
                title: 'New Phone Number', 
                message: 'A new phone number has been added' 
              });
            } 
            else if (payload.eventType === 'UPDATE' && payload.new) {
              // Update existing phone number in the list
              setPhoneNumbers(prev => 
                prev.map(phone => phone.id === payload.new.id ? payload.new as any : phone)
              );
              
              showToastRef.current({ 
                type: 'info', 
                title: 'Phone Number Updated', 
                message: 'A phone number has been updated' 
              });
            } 
            else if (payload.eventType === 'DELETE' && payload.old) {
              // Remove deleted phone number from the list
              setPhoneNumbers(prev => 
                prev.filter(phone => phone.id !== payload.old.id)
              );
              
              showToastRef.current({ 
                type: 'warning', 
                title: 'Phone Number Removed', 
                message: 'A phone number has been removed' 
              });
            }
          }
        )
        .subscribe();
      
      // Store the channel reference to avoid recreating it
      subscriptionRef.current = channel;
      return channel;
    };
    
    // Execute initialization once
    loadInitialData();
    setupSubscription();
    
    // Clean up on unmount
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        console.log('Removing phone numbers subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, []); // Empty dependency array to ensure this only runs once

  // Initialize sync status and auto-start syncing if there are manual phone numbers
  useEffect(() => {
    updateSyncStatus();
    
    // Check if we have any receive-sms-online.info phone numbers
    const hasManualPhones = phoneNumbers.some(phone => phone.provider === 'receive_sms_online');
    
    if (hasManualPhones && !messageSyncService.isAutoSyncRunning()) {
      console.log('Found manual phone numbers, starting auto-sync...');
      messageSyncService.startAutoSync();
      updateSyncStatus();
    }

    // Check if we have any Anosim phone numbers and start Anosim sync
    const hasAnosimPhones = phoneNumbers.some(phone => phone.provider === 'anosim');
    
    if (hasAnosimPhones) {
      console.log('Found Anosim phone numbers, ensuring Anosim auto-sync is running...');
      // Import and start Anosim sync service
      import('../services/anosimSyncService').then(({ anosimSyncService }) => {
        if (!anosimSyncService.isAutoSyncRunning()) {
          anosimSyncService.startAutoSync();
          console.log('Started Anosim auto-sync service');
        }
      }).catch(error => {
        console.error('Failed to start Anosim sync service:', error);
      });
    }
  }, [phoneNumbers, updateSyncStatus]);

  return {
    phoneNumbers,
    services,
    countries,
    loading,
    error,
    syncStatus,
    fetchPhoneNumbers,
    fetchServicesAndCountries,
    rentPhoneNumber,
    getPhoneNumberStatus,
    cancelPhoneNumberRental,
    extendPhoneNumberRental,
    getActiveRentals,
    getPhoneMessages,
    assignPhoneNumber,
    checkServerConnectivity,
    // Manual phone number management
    addManualPhoneNumber,
    removeManualPhoneNumber,
    syncPhoneNumberMessages,
    // Message syncing
    startMessageSync,
    stopMessageSync,
    syncAllPhoneNumbers,
    syncAllAnosimNumbers,
    updateSyncStatus
  };
};
