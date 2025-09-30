import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, SettingsUpdate } from '../types/database';
import { retryOperation } from '../utils/apiUtils';
import { normalizeHexColor, isValidHexColor } from '../utils/colorUtils';

/**
 * Hook for managing application settings
 * @returns Settings management functions and state
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch settings from the database
   */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching application settings...');
      
      const { data, error } = await retryOperation(async () => {
        // First try using the public settings function that bypasses RLS
        try {
          const result = await supabase
            .rpc('get_public_settings')
            .single();
            
          if (result.error) {
            throw result.error;
          }
          
          return result;
        } catch (err) {
          // Fallback to normal query if the function is not available
          // (e.g., migration hasn't run yet)
          console.log('Falling back to standard settings query');
          return await supabase
            .from('settings')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
        }
      });
      
      if (error) throw error;
      
      if (data) {
        console.log('Settings fetched successfully:', data);
        setSettings(data as Settings);
      } else {
        console.log('No settings found in database');
        setSettings(null);
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update settings in the database
   * @param updates Partial settings object with fields to update
   */
  const updateSettings = useCallback(async (updates: SettingsUpdate) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Updating application settings:', updates);
      
      // Validate color inputs if present
      if (updates.primary_color && !isValidHexColor(updates.primary_color)) {
        throw new Error('Invalid primary color format. Must be a valid HEX color.');
      }
      
      if (updates.accent_color && !isValidHexColor(updates.accent_color)) {
        throw new Error('Invalid accent color format. Must be a valid HEX color.');
      }
      
      // Normalize color inputs
      const normalizedUpdates = {
        ...updates,
        primary_color: updates.primary_color ? normalizeHexColor(updates.primary_color) : undefined,
        accent_color: updates.accent_color ? normalizeHexColor(updates.accent_color) : undefined,
      };
      
      const { data, error } = await retryOperation(async () => {
        // If settings exist, update them
        if (settings?.id) {
          return await supabase
            .from('settings')
            .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
            .eq('id', settings.id)
            .select()
            .single();
        } 
        // Otherwise create new settings
        else {
          return await supabase
            .from('settings')
            .insert({ 
              ...normalizedUpdates, 
              type: 'app',
              key: 'main_settings',
              value: {}
            })
            .select()
            .single();
        }
      });
      
      if (error) throw error;
      
      if (data) {
        console.log('Settings updated successfully:', data);
        setSettings(data as Settings);
      }
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message || 'Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  /**
   * Upload an image to the company-assets bucket
   * @param file File to upload
   * @param type Type of image ('logo' or 'favicon')
   * @returns URL of the uploaded file
   */
  const uploadImage = useCallback(async (file: File, type: 'logo' | 'favicon') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Uploading ${type} image:`, file.name);
      
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
      if (type === 'favicon') allowedTypes.push('image/x-icon', 'image/vnd.microsoft.icon');
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Must be one of: ${allowedTypes.join(', ')}`);
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }
      
      // Create a unique filename
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}/${type}_${timestamp}.${fileExt}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      
      console.log(`${type} image uploaded successfully:`, publicUrl);
      
      // Update settings with new image URL
      const updateKey = type === 'logo' ? 'logo_url' : 'favicon_url';
      await updateSettings({ [updateKey]: publicUrl } as SettingsUpdate);
      
      return publicUrl;
    } catch (err: any) {
      console.error(`Error uploading ${type} image:`, err);
      setError(err.message || `Failed to upload ${type}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateSettings]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    uploadImage
  };
}; 