import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PhoneNumber } from '../api/phoneApiClient';
import { useToast } from './useToast';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useEmployeePhoneNumbers = (employeeId: string | undefined) => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  
  // Track if phone numbers have been loaded to prevent duplicate calls
  const phoneNumbersLoadedRef = useRef<boolean>(false);
  // Track if we're currently loading phone numbers
  const loadingPhoneNumbersRef = useRef<boolean>(false);

  // Fetch phone numbers assigned to the employee
  const fetchPhoneNumbers = useCallback(async () => {
    // Skip if no employee ID
    if (!employeeId) {
      setPhoneNumbers([]);
      setLoading(false);
      return;
    }
    
    // Prevent duplicate calls if we're already loading
    if (loadingPhoneNumbersRef.current) {
      return;
    }

    loadingPhoneNumbersRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('assignee_id', employeeId)
        .eq('status', 'active') // Filter for active numbers
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPhoneNumbers(data as PhoneNumber[]);
      phoneNumbersLoadedRef.current = true;
    } catch (err: any) {
      console.error('Error fetching employee phone numbers:', err);
      setError(err.message || 'Failed to fetch phone numbers');
      showToast({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to fetch assigned phone numbers' 
      });
    } finally {
      setLoading(false);
      loadingPhoneNumbersRef.current = false;
    }
  }, [employeeId, showToast]);

  // Initialize data and set up subscriptions only once on mount
  useEffect(() => {
    let isMounted = true;
    let subscriptionActive = false;
    
    // Reset loading state when employee changes
    phoneNumbersLoadedRef.current = false;
    
    // Initial data load - only once per employeeId change
    const loadInitialData = async () => {
      if (!isMounted || !employeeId) {
        setPhoneNumbers([]);
        setLoading(false);
        return;
      }
      
      // Prevent duplicate calls if we're already loading
      if (loadingPhoneNumbersRef.current) {
        return;
      }

      loadingPhoneNumbersRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('phone_numbers')
          .select('*')
          .eq('assignee_id', employeeId)
          .eq('status', 'active') // Filter for active numbers
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (isMounted) {
          setPhoneNumbers(data as PhoneNumber[]);
          phoneNumbersLoadedRef.current = true;
        }
      } catch (err: any) {
        console.error('Error fetching employee phone numbers:', err);
        if (isMounted) {
          setError(err.message || 'Failed to fetch phone numbers');
          showToast({ 
            type: 'error', 
            title: 'Error', 
            message: 'Failed to fetch assigned phone numbers' 
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        loadingPhoneNumbersRef.current = false;
      }
    };
    
    // Set up subscription for real-time updates - only once per employeeId change
    const setupSubscription = () => {
      if (subscriptionActive || !isMounted || !employeeId) return null;
      
      console.log(`Setting up phone numbers subscription for employee: ${employeeId}`);
      subscriptionActive = true;
      
      return supabase
        .channel(`employee-phone-numbers-${employeeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'phone_numbers',
            filter: `assignee_id=eq.${employeeId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            if (!isMounted) return;
            
            console.log('Received employee phone number update:', payload.eventType);
            
            // For real-time updates, manually update the state instead of fetching again
            if (payload.eventType === 'INSERT' && payload.new) {
              // Add new phone number to the list
              setPhoneNumbers(prev => [payload.new as any, ...prev]);
            } 
            else if (payload.eventType === 'UPDATE' && payload.new) {
              // Update existing phone number in the list
              setPhoneNumbers(prev => 
                prev.map(phone => phone.id === payload.new.id ? payload.new as any : phone)
              );
            } 
            else if (payload.eventType === 'DELETE' && payload.old) {
              // Remove deleted phone number from the list
              setPhoneNumbers(prev => 
                prev.filter(phone => phone.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };
    
    // Execute initialization
    loadInitialData();
    const channel = setupSubscription();
    
    // Clean up on unmount
    return () => {
      isMounted = false;
      if (channel) {
        console.log(`Removing phone numbers subscription for employee: ${employeeId}`);
        supabase.removeChannel(channel);
      }
    };
  }, [employeeId]); // Only depend on employeeId

  return {
    phoneNumbers,
    loading,
    error,
    refreshPhoneNumbers: fetchPhoneNumbers
  };
};
