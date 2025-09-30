import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Settings } from '../types/database';

/**
 * Hook for fetching public settings without authentication
 * Used for landing page and other public pages
 */
export const usePublicSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch public settings from the database
   */
  const fetchPublicSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching public settings...');
      
      // Try using the public settings function that bypasses RLS
      const { data, error } = await supabase
        .rpc('get_public_settings')
        .single();
      
      if (error) {
        // Fallback to normal query if the function is not available
        console.log('Falling back to standard settings query');
        const fallbackResult = await supabase
          .from('settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
          
        if (fallbackResult.error) throw fallbackResult.error;
        
        if (fallbackResult.data) {
          console.log('Public settings fetched successfully (fallback):', fallbackResult.data);
          setSettings(fallbackResult.data as Settings);
        }
      } else if (data) {
        console.log('Public settings fetched successfully:', data);
        setSettings(data as Settings);
      } else {
        console.log('No public settings found');
        setSettings(null);
      }
    } catch (err: any) {
      console.error('Error fetching public settings:', err);
      setError(err.message || 'Failed to fetch public settings');
      
      // Set default settings as fallback
      setSettings({
        id: 'default',
        company_name: '',
        website_name: '',
        website_url: '',
        primary_color: '#f4a261',
        accent_color: '#e76f51',
        logo_url: null,
        favicon_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchPublicSettings
  };
}; 