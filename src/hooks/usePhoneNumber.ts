import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PhoneNumber } from '../types/database';

export const usePhoneNumber = (phoneNumberId?: string) => {
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch phone number details
  const fetchPhoneNumber = useCallback(async () => {
    if (!phoneNumberId) {
      setPhoneNumber(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // First try the regular phone_numbers table
      let { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('id', phoneNumberId)
        .single();
      
      if (error) {
        // Try alternative table names that might exist
        ({ data, error } = await supabase
          .from('phone_number')  // Try singular form
          .select('*')
          .eq('id', phoneNumberId)
          .single());
          
        if (error) {
          // Third attempt - try a different potential table name
          ({ data, error } = await supabase
            .from('task_phone_numbers')  // Another possible table name
            .select('*')
            .eq('id', phoneNumberId)
            .single());
            
          if (error) {
            throw error;
          }
        }
      }
      
      setPhoneNumber(data as PhoneNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch phone number details');
    } finally {
      setLoading(false);
    }
  }, [phoneNumberId]);

  // Fetch data when phone number ID changes
  useEffect(() => {
    fetchPhoneNumber();
  }, [phoneNumberId, fetchPhoneNumber]);

  return {
    phoneNumber,
    loading,
    error,
    fetchPhoneNumber
  };
}; 