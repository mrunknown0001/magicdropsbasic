import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  street: string;
  postal_code: string;
  city: string;
  tax_number: string;
  social_security_number: string;
  health_insurance: string;
  iban: string;
  bic: string;
  recipient_name: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

/**
 * Hook for managing profile data with improved caching and controls
 */
export const useProfileStats = () => {
  const { user } = useAuth();
  
  // Profile data state with session storage caching
  const [profileData, setProfileData] = useState<any>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('userProfileData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 10 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 10 * 60 * 1000)) {
          return parsedData.profileData || null;
        }
      }
    } catch (error) {
      console.error('Error retrieving stored profile data:', error);
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('userProfileData');
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
  
  /**
   * Fetch profile data from the database
   */
  const fetchProfileData = useCallback(async (force = false) => {
    if (!user?.id) {
      console.log('No user ID available, skipping profile data fetch');
      return null;
    }
    
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Profile data fetch already in progress, skipping');
      return profileData;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && lastFetchTime && (now - lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(lastFetchTime).toLocaleTimeString()}`);
      return profileData;
    }
    
    // If we have data in cache that's not too old (< 10 minutes), don't show loading state
    const hasRecentData = lastFetchTime && (now - lastFetchTime < 10 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log('Fetching profile data for user:', user.id);
      
      // Fetch the complete profile data
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      console.log('Fetched profile data:', data);
      
      // Update state with fetched data
      setProfileData(data);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('userProfileData', JSON.stringify({
          profileData: data,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing profile data in session storage:', storageError);
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile data'));
      toast.error('Failed to fetch profile data');
      return null;
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, profileData, lastFetchTime]);
  
  /**
   * Update profile data
   */
  const updateProfile = useCallback(async (data: ProfileFormData) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Format and clean the data before sending to database
      const updateData = { ...data };
      
      // Convert empty date strings to null to avoid PostgreSQL date validation errors
      if (updateData.date_of_birth === '') {
        updateData.date_of_birth = null as any;
      }
      
      // Clean up other empty string fields that might cause issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof ProfileFormData] === '') {
          updateData[key as keyof ProfileFormData] = null as any;
        }
      });
      
      console.log('Updating profile with cleaned data:', updateData);
      console.log('User ID for update:', user.id);
      
      // Update profile
      const { data: updatedData, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select('*')
        .single();
        
      if (updateError) {
        console.error('Supabase update error:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }
      
      console.log('Profile updated successfully:', updatedData);
      
      // Update local state
      setProfileData(updatedData);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('userProfileData', JSON.stringify({
          profileData: updatedData,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing updated profile data in session storage:', storageError);
      }
      
      toast.success('Profile updated successfully');
      return updatedData;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
      toast.error('Failed to update profile');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Update user password
   */
  const updatePassword = useCallback(async (newPassword: string) => {
    if (!user) {
      toast.error('User not authenticated');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (passwordError) throw passwordError;
      
      toast.success('Password updated successfully');
      return true;
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err : new Error('Failed to update password'));
      toast.error('Failed to update password');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Load data on mount
  useEffect(() => {
    if (user && !profileData) {
      fetchProfileData();
    }
  }, [user, fetchProfileData, profileData]);
  
  return {
    profileData,
    loading,
    error,
    lastFetchTime,
    fetchProfileData,
    updateProfile,
    updatePassword
  };
}; 