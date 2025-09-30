import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatManagerSettings } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useChatManagerSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ChatManagerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch chat manager settings
   */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('chat_manager_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching chat manager settings:', error);
        throw error;
      }

      setSettings(data);
    } catch (err) {
      console.error('Error in fetchSettings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update chat manager settings
   */
  const updateSettings = useCallback(async (updates: Partial<ChatManagerSettings>) => {
    if (!user || !settings) return null;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('chat_manager_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating chat manager settings:', error);
        throw error;
      }

      setSettings(data);
      toast.success('Chat Manager Einstellungen aktualisiert');
      return data;
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      toast.error('Fehler beim Aktualisieren der Einstellungen');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, settings]);

  /**
   * Upload profile picture for chat manager
   */
  const uploadProfilePicture = useCallback(async (file: File) => {
    if (!user || !settings) return null;

    try {
      setLoading(true);
      setError(null);

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Nur Bilddateien sind erlaubt');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Datei zu groß. Maximum 5MB erlaubt.');
      }

      // Generate file path
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `chat-manager-avatar.${fileExtension}`;
      const filePath = `chat-manager/${fileName}`;

      // Upload to company-assets bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing avatar
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Upload fehlgeschlagen: ' + uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Update settings with new avatar URL
      const updatedSettings = await updateSettings({
        manager_avatar_url: publicUrl
      });

      toast.success('Profilbild erfolgreich hochgeladen');
      return updatedSettings;
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture');
      toast.error('Fehler beim Hochladen des Profilbilds');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, settings, updateSettings]);

  /**
   * Remove profile picture
   */
  const removeProfilePicture = useCallback(async () => {
    if (!settings?.manager_avatar_url) return;

    try {
      setLoading(true);
      
      // Extract file path from URL
      const url = new URL(settings.manager_avatar_url);
      const filePath = url.pathname.split('/').slice(-2).join('/'); // Get last two segments

      // Delete from storage
      await supabase.storage
        .from('company-assets')
        .remove([filePath]);

      // Update settings to remove avatar URL
      await updateSettings({
        manager_avatar_url: null
      });

      toast.success('Profilbild entfernt');
    } catch (err) {
      console.error('Error removing profile picture:', err);
      toast.error('Fehler beim Entfernen des Profilbilds');
    } finally {
      setLoading(false);
    }
  }, [settings, updateSettings]);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    uploadProfilePicture,
    removeProfilePicture
  };
};
