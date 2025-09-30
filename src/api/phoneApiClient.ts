import axios from 'axios';
import { supabase } from '../lib/supabase';

// Import types from database
import type { PhoneNumber, PhoneMessage, PhoneProvider } from '../types/database';

export interface ServiceInfo {
  code: string;
  name: string;
  cost: number;
  quant: number;
}

export interface CountryInfo {
  id: string;
  name: string;
}

export interface RentResponse {
  id?: string;
  rent_id?: string;
  phone_number?: string;
  service?: string;
  country?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  end_date?: string;
  // For server response formats that are different
  phone?: {
    id?: string;
    number?: string;
    endDate?: string;
  };
  // Allow for any additional properties that might come from the API
  [key: string]: any;
}

// Create an axios instance with default configuration
// Cache clear timestamp: 2025-07-21 22:05:00
const apiClient = axios.create({
  // Use the API URL from environment variables if available, otherwise default to a fallback
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Reduced timeout to 10 seconds for faster failure
  // Disable withCredentials to avoid CORS preflight issues
  withCredentials: false,
});

// Cache for auth token to prevent multiple session requests
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

// Cache for services and countries data
let cachedServices: Record<string, ServiceInfo> | null = null;
let cachedCountries: Record<string, string> | null = null;
let servicesCacheTime = 0;
let cachedProvider: string | null = null; // Track which provider the cache is for
const SERVICES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Add request interceptor to add authentication token
apiClient.interceptors.request.use(async (config) => {
  // Check if we have a valid cached token
  const now = Date.now();
  if (!cachedToken || now >= tokenExpiryTime) {
    try {
      // Get a fresh session only when needed
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        cachedToken = session.access_token;
        // Set expiry to 5 minutes before actual expiry or 55 minutes from now
        tokenExpiryTime = session.expires_at ? 
          (session.expires_at * 1000) - (5 * 60 * 1000) : // 5 minutes before expiry
          now + (55 * 60 * 1000); // 55 minutes from now as fallback
      } else {
        cachedToken = null;
      }
    } catch (error) {
      console.error('Error getting auth session:', error);
      cachedToken = null;
    }
  }
  
  // Add token to headers if available
  if (cachedToken) {
    config.headers['Authorization'] = `Bearer ${cachedToken}`;
  }
  
  // Log outgoing requests in development
  if (import.meta.env.DEV) {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, { 
      params: config.params,
      data: config.data 
    });
  }
  
  return config;
});

// Add response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.config?.url || 'unknown endpoint'}`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
    return Promise.reject(error);
  }
);

// Error handling helper
const handleApiError = (error: any) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.data);
    throw new Error(error.response.data.message || 'An error occurred with the API');
  } else if (error.request) {
    // The request was made but no response was received
    console.error('API Error Request:', error.request);
    throw new Error('No response received from server');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('API Error:', error.message);
    throw new Error('Error setting up request');
  }
};

// Import fallback data
import { fallbackServices, fallbackCountries } from '../utils/serviceData';

// URL validation and parsing utilities
export const receiveSmsOnlineUtils = {
  // Validate receive-sms-online.info URL format
  validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === 'receive-sms-online.info' &&
        urlObj.pathname === '/private.php' &&
        urlObj.searchParams.has('phone') &&
        urlObj.searchParams.has('key') &&
        urlObj.protocol === 'https:'
      );
    } catch {
      return false;
    }
  },

  // Extract phone number and access key from URL
  parseUrl(url: string): { phoneNumber: string; accessKey: string } | null {
    try {
      if (!this.validateUrl(url)) {
        return null;
      }
      
      const urlObj = new URL(url);
      const phoneNumber = urlObj.searchParams.get('phone');
      const accessKey = urlObj.searchParams.get('key');
      
      if (!phoneNumber || !accessKey) {
        return null;
      }
      
      return {
        phoneNumber: phoneNumber.replace(/^\+/, ''), // Remove leading + if present
        accessKey
      };
    } catch {
      return null;
    }
  },

  // Detect country from phone number
  detectCountry(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Common country codes
    const countryCodes: Record<string, string> = {
      '49': 'germany',
      '1': 'usa',
      '44': 'uk',
      '33': 'france',
      '39': 'italy',
      '34': 'spain',
      '31': 'netherlands',
      '32': 'belgium',
      '43': 'austria',
      '41': 'switzerland',
    };
    
    // Check for country codes (1-4 digits)
    for (let i = 1; i <= 4; i++) {
      const code = cleanNumber.substring(0, i);
      if (countryCodes[code]) {
        return countryCodes[code];
      }
    }
    
    return 'unknown';
  },

  // Sanitize URL for security
  sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Only allow specific domain and path
      if (urlObj.hostname !== 'receive-sms-online.info' || urlObj.pathname !== '/private.php') {
        throw new Error('Invalid domain or path');
      }
      
      // Reconstruct URL with only allowed parameters
      const phone = urlObj.searchParams.get('phone');
      const key = urlObj.searchParams.get('key');
      
      if (!phone || !key) {
        throw new Error('Missing required parameters');
      }
      
      return `https://receive-sms-online.info/private.php?phone=${encodeURIComponent(phone)}&key=${encodeURIComponent(key)}`;
    } catch (error) {
      throw new Error(`URL sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Phone API client
export const phoneApiClient = {
  // Get available services and countries
  async getServicesAndCountries(rentTime?: string, country?: string, provider?: PhoneProvider, mode?: 'activation' | 'rental'): Promise<{ services: Record<string, ServiceInfo>, countries: Record<string, string> }> {
    try {
      const currentProvider = provider || 'sms_activate';
      
      // Check if we have valid cached data for the same provider
      const now = Date.now();
      if (cachedServices && cachedCountries && 
          cachedProvider === currentProvider && 
          (now - servicesCacheTime < SERVICES_CACHE_DURATION)) {
        console.log(`Using cached services and countries data for provider: ${currentProvider}`);
        return { services: cachedServices, countries: cachedCountries };
      }
      
      // Clear cache if provider changed
      if (cachedProvider && cachedProvider !== currentProvider) {
        console.log(`Provider changed from ${cachedProvider} to ${currentProvider}, clearing cache`);
        cachedServices = null;
        cachedCountries = null;
        servicesCacheTime = 0;
      }
      
      const params: Record<string, string> = {};
      if (rentTime) params.rentTime = rentTime;
      if (country) params.country = country;
      if (provider) params.provider = provider;
      if (mode) params.mode = mode;
      
      console.log(`API Request: Fetching services and countries for provider ${currentProvider} with params:`, params);
      
      try {
        // Set shorter timeout for this specific request
        const response = await apiClient.get('/services', { 
          params,
          timeout: 5000 // 5 second timeout
        });
        
        console.log(`API Response for services and countries received for provider: ${currentProvider}`);
        
        // Validate response structure
        if (!response.data || !response.data.data) {
          console.error('Invalid API response structure:', response.data);
          throw new Error('Invalid API response: missing data property');
        }
        
        const responseData = response.data.data;
        
        // Validate services and countries
        if (!responseData.services || Object.keys(responseData.services).length === 0) {
          console.error('API returned no services:', responseData);
          throw new Error('API returned no services');
        }
        
        // Cache the data with provider info
        cachedServices = responseData.services;
        cachedCountries = responseData.countries || fallbackCountries;
        cachedProvider = currentProvider;
        servicesCacheTime = now;
        
        console.log(`Successfully cached ${Object.keys(responseData.services).length} services for provider: ${currentProvider}`);
        
        // Return validated data
        return { 
          services: responseData.services, 
          countries: responseData.countries || fallbackCountries 
        };
      } catch (apiError) {
        console.warn(`API request failed for provider ${currentProvider}, using fallback data:`, apiError);
        
        // Cache the fallback data with provider info
        cachedServices = fallbackServices;
        cachedCountries = fallbackCountries;
        cachedProvider = currentProvider;
        servicesCacheTime = now;
        
        // Return fallback data
        return { services: fallbackServices, countries: fallbackCountries };
      }
    } catch (error: any) {
      console.error('Error handling services and countries data:', error);
      
      // Always fall back to static data on any errors
      return { services: fallbackServices, countries: fallbackCountries };
    }
  },
  
  // Rent a new phone number
  async rentNumber(service: string, rentTime?: string, country?: string, provider?: PhoneProvider, mode?: 'activation' | 'rental'): Promise<RentResponse> {
    try {
      console.log(`🚀 API Request: POST /phone/rent`);
      console.log({ params: { service, rentTime, country, provider, mode }, data: undefined });
      
      const payload = {
        service,
        rentTime: rentTime || '4',
        country: country || '0',
        provider: provider || 'sms_activate',
        // Include mode for GoGetSMS
        ...(provider === 'gogetsms' && mode && { mode })
      };
      
      const response = await apiClient.post('/rent', payload);
      
      if (response.data.status === 'success') {
        return response.data.data || response.data;
      } else {
        throw new Error(response.data.message || 'Failed to rent phone number');
      }
    } catch (error: any) {
      console.error('Error in rentNumber:', error);
      handleApiError(error);
    }
  },
  
  // Get status and messages for a rented number
  async getNumberStatus(id: string, page?: string, size?: string): Promise<{ quantity: string, values: Record<string, PhoneMessage> }> {
    try {
      const params: Record<string, string> = {};
      if (page) params.page = page;
      if (size) params.size = size;
      
      const response = await apiClient.get(`/status/${id}`, { params });
      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Cancel a rental
  async cancelRental(id: string): Promise<{ status: string }> {
    try {
      const response = await apiClient.post(`/cancel/${id}`);
      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Extend a rental
  async extendRental(id: string, rentTime: string): Promise<RentResponse> {
    try {
      const response = await apiClient.post(`/extend/${id}`, { rentTime });
      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get all active rentals
  async getActiveRentals(provider?: PhoneProvider): Promise<{ values: Record<string, { id: string, phone: string }> }> {
    try {
      const params: Record<string, string> = {};
      if (provider) params.provider = provider;
      
      const response = await apiClient.get('/list', { params });
      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get phone numbers from Supabase
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    try {
      console.log('Fetching phone numbers directly from table...');
      // Try to fetch directly from the table first
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching from table, trying RPC as fallback:', error);
        // Fall back to RPC if direct table access fails
        const rpcResult = await supabase.rpc('get_phone_numbers');
        if (rpcResult.error) throw rpcResult.error;
        return rpcResult.data as PhoneNumber[];
      }
      
      console.log('Successfully fetched phone numbers:', data?.length || 0);
      return data as PhoneNumber[];
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      throw error;
    }
  },
  
  // Get phone messages from Supabase
  async getPhoneMessages(phoneNumberId: string): Promise<PhoneMessage[]> {
    try {
      const { data, error } = await supabase.rpc('get_phone_messages', {
        p_phone_number_id: phoneNumberId
      });
      
      if (error) throw error;
      return data as PhoneMessage[];
    } catch (error) {
      console.error('Error fetching phone messages:', error);
      throw error;
    }
  },
  
  // Assign phone number to employee
  async assignPhoneNumber(phoneNumberId: string, assigneeId: string): Promise<PhoneNumber> {
    try {
      console.log('Assigning phone number directly:', { phoneNumberId, assigneeId });
      
      // Try direct update first
      const { data, error } = await supabase
        .from('phone_numbers')
        .update({ assignee_id: assigneeId })
        .eq('id', phoneNumberId)
        .select()
        .single();
      
      if (error) {
        console.error('Error with direct update, trying RPC as fallback:', error);
        // Fall back to RPC if direct update fails
        const rpcResult = await supabase.rpc('assign_phone_number', {
          p_phone_number_id: phoneNumberId,
          p_assignee_id: assigneeId
        });
        
        if (rpcResult.error) throw rpcResult.error;
        return rpcResult.data as PhoneNumber;
      }
      
      console.log('Successfully assigned phone number:', data);
      return data as PhoneNumber;
    } catch (error) {
      console.error('Error assigning phone number:', error);
      throw error;
    }
  },

  // Add manual phone number from receive-sms-online.info
  async addManualPhoneNumber(url: string): Promise<PhoneNumber> {
    try {
      console.log('Adding manual phone number from URL:', url);
      
      // Validate and parse URL
      const sanitizedUrl = receiveSmsOnlineUtils.sanitizeUrl(url);
      const parsed = receiveSmsOnlineUtils.parseUrl(sanitizedUrl);
      
      if (!parsed) {
        throw new Error('Invalid receive-sms-online.info URL format');
      }
      
      const { phoneNumber, accessKey } = parsed;
      const country = receiveSmsOnlineUtils.detectCountry(phoneNumber);
      
      console.log('Parsed phone data:', { phoneNumber, accessKey, country });
      
      // Check if phone number already exists
      const { data: existing, error: checkError } = await supabase
        .from('phone_numbers')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when no record found
      
      if (checkError) {
        console.error('Error checking existing phone number:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }
      
      if (existing) {
        throw new Error('Phone number already exists in the system');
      }
      
      // Insert new phone number (rent_id is null for manual numbers)
      const { data, error } = await supabase
        .from('phone_numbers')
        .insert({
          phone_number: phoneNumber,
          provider: 'receive_sms_online' as PhoneProvider,
          external_url: sanitizedUrl,
          access_key: accessKey,
          service: 'receive_sms_online',
          country: country,
          status: 'active',
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          rent_id: null, // Manual numbers don't have a rent_id
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting phone number:', error);
        throw new Error(`Failed to add phone number: ${error.message}`);
      }
      
      console.log('Successfully added manual phone number:', data);
      return data;
    } catch (error) {
      console.error('Error in addManualPhoneNumber:', error);
      // Don't call handleApiError for database operations - just throw the error
      throw error;
    }
  },

  // Remove manual phone number
  async removeManualPhoneNumber(phoneNumberId: string): Promise<void> {
    try {
      console.log('Removing manual phone number:', phoneNumberId);
      
      // Verify it's a manual phone number
      const { data: phoneNumber, error: fetchError } = await supabase
        .from('phone_numbers')
        .select('provider')
        .eq('id', phoneNumberId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching phone number:', fetchError);
        throw new Error(`Failed to fetch phone number: ${fetchError.message}`);
      }
      
      if (phoneNumber.provider !== 'receive_sms_online') {
        throw new Error('Can only remove manual phone numbers');
      }
      
      // First, delete all associated phone messages
      console.log('Deleting associated phone messages...');
      const { error: messagesError } = await supabase
        .from('phone_messages')
        .delete()
        .eq('phone_number_id', phoneNumberId);
      
      if (messagesError) {
        console.error('Error deleting phone messages:', messagesError);
        throw new Error(`Failed to delete phone messages: ${messagesError.message}`);
      }
      
      console.log('Phone messages deleted successfully');
      
      // Then delete the phone number
      console.log('Deleting phone number...');
      const { error } = await supabase
        .from('phone_numbers')
        .delete()
        .eq('id', phoneNumberId);
      
      if (error) {
        console.error('Error deleting phone number:', error);
        throw new Error(`Failed to delete phone number: ${error.message}`);
      }
      
      console.log('Successfully removed manual phone number');
    } catch (error) {
      console.error('Error in removeManualPhoneNumber:', error);
      // Don't call handleApiError for database operations - just throw the error
      throw error;
    }
  }
};
