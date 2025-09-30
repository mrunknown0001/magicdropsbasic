import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { phoneApiClient, ServiceInfo } from '../api/phoneApiClient';
import type { PhoneNumber } from '../types/database';
import toast from 'react-hot-toast';
import { fallbackServices, fallbackCountries } from '../utils/serviceData';

/**
 * Hook for managing phone numbers with improved data management
 */
export const usePhoneNumbersStats = () => {
  // Phone numbers state with session storage caching
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('phoneNumbersList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 5 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 5 * 60 * 1000)) {
          return parsedData.phoneNumbers || [];
        }
      }
    } catch (error) {
      console.error('Error retrieving stored phone numbers:', error);
    }
    return [];
  });
  
  // Services and countries state with session storage caching
  const [services, setServices] = useState<Record<string, ServiceInfo>>(() => {
    try {
      const storedData = sessionStorage.getItem('phoneServicesData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Check if provider matches current default provider
        const storedProvider = parsedData.provider || 'sms_activate';
        const currentProvider = 'sms_activate'; // Default provider
        
        // Return cached data if it's not older than 1 hour and provider matches
        if (storedProvider === currentProvider && parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 60 * 60 * 1000)) {
          return parsedData.services || fallbackServices;
        }
      }
    } catch (error) {
      console.error('Error retrieving stored services:', error);
    }
    return fallbackServices;
  });
  
  const [countries, setCountries] = useState<Record<string, string>>(() => {
    try {
      const storedData = sessionStorage.getItem('phoneServicesData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Check if provider matches current default provider
        const storedProvider = parsedData.provider || 'sms_activate';
        const currentProvider = 'sms_activate'; // Default provider
        
        // Return cached data if it's not older than 1 hour and provider matches
        if (storedProvider === currentProvider && parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 60 * 60 * 1000)) {
          return parsedData.countries || fallbackCountries;
        }
      }
    } catch (error) {
      console.error('Error retrieving stored countries:', error);
    }
    return fallbackCountries;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [serverStatus, setServerStatus] = useState<'available' | 'unavailable' | 'unknown'>('unknown');
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('phoneNumbersList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return parsedData.lastFetchTime || 0;
      }
    } catch (error) {
      console.error('Error retrieving last fetch time:', error);
    }
    return 0;
  });
  
  const [servicesLastFetchTime, setServicesLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('phoneServicesData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Check if provider matches current default provider
        const storedProvider = parsedData.provider || 'sms_activate';
        const currentProvider = 'sms_activate'; // Default provider
        
        // Return last fetch time only if provider matches
        if (storedProvider === currentProvider) {
          return parsedData.lastFetchTime || 0;
        }
      }
    } catch (error) {
      console.error('Error retrieving services last fetch time:', error);
    }
    return 0;
  });
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  const isFetchingServicesRef = useRef(false);
  // Track the current provider to reset cache when it changes
  const currentProviderRef = useRef<string>('sms_activate');
  
  /**
   * Check server connectivity
   */
  const checkServerConnectivity = useCallback(async () => {
    try {
      // Use a lightweight request to check server availability
      const response = await phoneApiClient.getServicesAndCountries('4', '0');
      const isAvailable = response && Object.keys(response.services || {}).length > 0;
      setServerStatus(isAvailable ? 'available' : 'unavailable');
      return isAvailable;
    } catch (error) {
      console.error('Server connectivity check failed:', error);
      setServerStatus('unavailable');
      return false;
    }
  }, []);
  
  /**
   * Fetch phone numbers from the database
   */
  const fetchPhoneNumbers = useCallback(async (force = false) => {
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Data fetch already in progress, skipping');
      return phoneNumbers;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && lastFetchTime && (now - lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(lastFetchTime).toLocaleTimeString()}`);
      return phoneNumbers;
    }
    
    // If we have data in cache that's not too old (< 5 minutes), don't show loading state
    const hasRecentData = lastFetchTime && (now - lastFetchTime < 5 * 60 * 1000);
    if (!hasRecentData || force) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log('Fetching phone numbers data...');
      
      // Try direct table access first
      const { data: directData, error: directError } = await supabase
        .from('phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      
      let fetchedPhoneNumbers: PhoneNumber[] = [];
      
      if (directError) {
        console.error('Error with direct table query:', directError);
        console.log('Falling back to API client method...');
        const data = await phoneApiClient.getPhoneNumbers();
        console.log(`Retrieved ${data.length} phone numbers via API client`);
        fetchedPhoneNumbers = data;
      } else {
        console.log(`Retrieved ${directData.length} phone numbers directly`);
        fetchedPhoneNumbers = directData;
      }
      
      // Update state with fetched data
      setPhoneNumbers(fetchedPhoneNumbers);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('phoneNumbersList', JSON.stringify({
          phoneNumbers: fetchedPhoneNumbers,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing phone numbers in session storage:', storageError);
      }
      
      return fetchedPhoneNumbers;
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch phone numbers'));
      toast.error('Failed to fetch phone numbers');
      return [];
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [phoneNumbers, lastFetchTime]);
  
  /**
   * Fetch services and countries data
   */
  const fetchServicesAndCountries = useCallback(async (force = false, rentTime?: string, country?: string, provider?: string) => {
    const currentProvider = provider || 'sms_activate';
    
    // Reset cache if provider changed
    if (currentProviderRef.current !== currentProvider) {
      console.log(`Provider changed from ${currentProviderRef.current} to ${currentProvider} - resetting services cache`);
      currentProviderRef.current = currentProvider;
      
      // Clear session storage for services when provider changes
      try {
        sessionStorage.removeItem('phoneServicesData');
      } catch (error) {
        console.error('Error clearing services cache:', error);
      }
      
      // Reset state
      setServices({});
      setCountries({});
      setServicesLastFetchTime(0);
      force = true; // Force fetch when provider changes
    }
    
    // Check if we're already fetching
    if (isFetchingServicesRef.current) {
      console.log('Services fetch already in progress, skipping');
      // Return current state instead of empty object
      return { services, countries };
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // Reduced from 30 seconds to 5 seconds
    
    if (!force && servicesLastFetchTime && (now - servicesLastFetchTime < coolingPeriod)) {
      console.log(`In cooling period for services, not fetching again. Last fetch: ${new Date(servicesLastFetchTime).toLocaleTimeString()}`);
      return { services, countries };
    }
    
    // If we have recent data and not forcing, return it
    if (!force && Object.keys(services).length > 0 && servicesLastFetchTime && (now - servicesLastFetchTime < 60 * 60 * 1000)) {
      console.log('Using cached services data');
      return { services, countries };
    }
    
    setLoading(true);
    isFetchingServicesRef.current = true;
    setError(null);
    
    try {
      console.log(`Fetching services and countries data for provider: ${currentProvider}...`);
      
      // Check server connectivity first
      const isServerAvailable = await checkServerConnectivity();
      
      if (!isServerAvailable) {
        console.log('Server unavailable, using fallback data');
        setServices(fallbackServices);
        setCountries(fallbackCountries);
        
        // Update last fetch time
        const fetchTimestamp = Date.now();
        setServicesLastFetchTime(fetchTimestamp);
        
        // Store in session storage
        try {
          sessionStorage.setItem('phoneServicesData', JSON.stringify({
            services: fallbackServices,
            countries: fallbackCountries,
            lastFetchTime: fetchTimestamp,
            provider: currentProvider
          }));
        } catch (storageError) {
          console.error('Error storing services in session storage:', storageError);
        }
        
        return { services: fallbackServices, countries: fallbackCountries };
      }
      
      // Fetch services and countries with provider parameter
      const response = await phoneApiClient.getServicesAndCountries(rentTime, country, currentProvider as any);
      
      // Update state with fetched data
      setServices(response.services);
      setCountries(response.countries);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setServicesLastFetchTime(fetchTimestamp);
      
      // Store in session storage with provider info
      try {
        sessionStorage.setItem('phoneServicesData', JSON.stringify({
          services: response.services,
          countries: response.countries,
          lastFetchTime: fetchTimestamp,
          provider: currentProvider
        }));
      } catch (storageError) {
        console.error('Error storing services in session storage:', storageError);
      }
      
      console.log(`Successfully loaded ${Object.keys(response.services).length} services for provider: ${currentProvider}`);
      return response;
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch services'));
      toast.error('Failed to fetch services and countries');
      
      // Fallback to cached data or fallback data
      const fallbackResponse = Object.keys(services).length > 0 ? { services, countries } : { services: fallbackServices, countries: fallbackCountries };
      return fallbackResponse;
    } finally {
      setLoading(false);
      isFetchingServicesRef.current = false;
    }
  }, [servicesLastFetchTime, checkServerConnectivity]);
  
  /**
   * Rent a phone number
   */
  const rentPhoneNumber = useCallback(async (service: string, rentTime?: string, country?: string, provider?: string) => {
    try {
      setLoading(true);
      
      // Convert 'all_countries' to '0' for API compatibility
      const apiCountry = country === 'all_countries' ? '0' : country;
      const response = await phoneApiClient.rentNumber(service, rentTime, apiCountry, provider as any);
      
      // The server might return data in different formats
      // Create a normalized phone number object
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
        end_date: response.end_date || new Date(Date.now() + 1000*60*60*parseInt(rentTime || '4')).toISOString(),
        assignee_id: null
      };
      
      if (!phoneNumber.phone_number) {
        throw new Error('Invalid response from rental service');
      }
      
      // Force refresh phone numbers after a delay
      setTimeout(() => {
        fetchPhoneNumbers(true);
      }, 1000);
      
      toast.success(`Successfully rented phone number: ${phoneNumber.phone_number}`);
      return phoneNumber;
    } catch (err) {
      console.error('Error renting phone number:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to rent phone number');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);
  
  /**
   * Cancel a phone number rental
   */
  const cancelPhoneNumberRental = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      const response = await phoneApiClient.cancelRental(id);
      
      // Force refresh phone numbers
      fetchPhoneNumbers(true);
      
      toast.success('Phone number rental cancelled successfully');
      return response;
    } catch (err) {
      console.error('Error canceling phone number rental:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel phone number rental');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);
  
  /**
   * Extend a phone number rental
   */
  const extendPhoneNumberRental = useCallback(async (id: string, rentTime: string) => {
    try {
      setLoading(true);
      
      const response = await phoneApiClient.extendRental(id, rentTime);
      
      // Force refresh phone numbers
      fetchPhoneNumbers(true);
      
      toast.success('Phone number rental extended successfully');
      return response;
    } catch (err) {
      console.error('Error extending phone number rental:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to extend phone number rental');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);
  
  /**
   * Assign a phone number to an employee
   */
  const assignPhoneNumber = useCallback(async (phoneNumberId: string, assigneeId: string) => {
    try {
      setLoading(true);
      
      const data = await phoneApiClient.assignPhoneNumber(phoneNumberId, assigneeId);
      
      // Force refresh phone numbers
      fetchPhoneNumbers(true);
      
      toast.success('Phone number assigned successfully');
      return data;
    } catch (err) {
      console.error('Error assigning phone number:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to assign phone number');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPhoneNumbers]);
  
  // Load data on mount - only run once
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (!isMounted) return;
      
      // Check server connectivity
      await checkServerConnectivity();
      
      if (!isMounted) return;
      
      // Fetch phone numbers
      await fetchPhoneNumbers();
      
      if (!isMounted) return;
      
      // Fetch services and countries if they're not already loaded
      // Check the actual state values at the time of execution, not in dependencies
      let currentServices = {};
      let currentCountries = {};
      
      try {
        const storedData = sessionStorage.getItem('phoneServicesData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          currentServices = parsedData.services || {};
          currentCountries = parsedData.countries || {};
        }
      } catch (error) {
        console.error('Error parsing stored services data:', error);
      }
      
      if (Object.keys(currentServices).length === 0 || Object.keys(currentCountries).length === 0) {
        await fetchServicesAndCountries();
      }
    };
    
    initializeData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount
  
  return {
    phoneNumbers,
    services,
    countries,
    loading,
    error,
    serverStatus,
    lastFetchTime,
    fetchPhoneNumbers,
    fetchServicesAndCountries,
    rentPhoneNumber,
    cancelPhoneNumberRental,
    extendPhoneNumberRental,
    assignPhoneNumber,
    checkServerConnectivity
  };
}; 