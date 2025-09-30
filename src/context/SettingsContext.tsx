import React, { createContext, useContext, useCallback, useState, useMemo, ReactNode } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Settings, SettingsUpdate } from '../types/database';
import { hexToRgb, getDerivedColors } from '../utils/colorUtils';
import { isKycRequiredForTasks } from '../utils/kycValidation';

// Context type definition
interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: SettingsUpdate) => Promise<void>;
  uploadImage: (file: File, type: 'logo' | 'favicon') => Promise<string>;
  refreshSettings: () => Promise<void>;
  // KYC Helper Functions
  isKycRequiredForTasks: () => boolean;
  getKycRequirementMessage: () => string;
  // Admin Helper Functions (for determining what features to show)
  shouldShowPaymentManagement: () => boolean;
  colors: {
    primary: string;
    primaryRgb: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentRgb: string;
    accentHover: string;
    accentLight: string;
    accentDark: string;
  };
}

// Default context value
const defaultContextValue: SettingsContextType = {
  settings: null,
  loading: true,
  error: null,
  updateSettings: async () => {},
  uploadImage: async () => '',
  refreshSettings: async () => {},
  isKycRequiredForTasks: () => true, // Default to requiring KYC
  getKycRequirementMessage: () => 'KYC-Verifizierung erforderlich für den Zugriff auf Aufgaben.',
  shouldShowPaymentManagement: () => true, // Always show for admins since they manage both types
  colors: {
    primary: '#3b82f6',
    primaryRgb: '59, 130, 246',
    primaryHover: '#2563eb',
    primaryLight: '#93c5fd',
    primaryDark: '#1d4ed8',
    accent: '#10b981',
    accentRgb: '16, 185, 129',
    accentHover: '#059669',
    accentLight: '#a7f3d0',
    accentDark: '#047857'
  }
};

// Create the context
const SettingsContext = createContext<SettingsContextType>(defaultContextValue);

// Props type definition
interface SettingsProviderProps {
  children: ReactNode;
}

/**
 * Settings provider component
 */
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { 
    settings, 
    loading, 
    error, 
    fetchSettings, 
    updateSettings: updateSettingsHook,
    uploadImage: uploadImageHook
  } = useSettings();
  
  // Update settings with error handling
  const updateSettings = useCallback(async (updates: SettingsUpdate) => {
    try {
      await updateSettingsHook(updates);
    } catch (err: any) {
      console.error('Error in SettingsContext.updateSettings:', err);
      throw err;
    }
  }, [updateSettingsHook]);
  
  // Upload image with error handling
  const uploadImage = useCallback(async (file: File, type: 'logo' | 'favicon') => {
    try {
      return await uploadImageHook(file, type);
    } catch (err: any) {
      console.error(`Error in SettingsContext.uploadImage (${type}):`, err);
      throw err;
    }
  }, [uploadImageHook]);
  
  // Refresh settings
  const refreshSettings = useCallback(async () => {
    try {
      await fetchSettings();
    } catch (err: any) {
      console.error('Error in SettingsContext.refreshSettings:', err);
    }
  }, [fetchSettings]);
  
  // KYC helper functions
  const isKycRequiredForTasksContext = useCallback(() => {
    return isKycRequiredForTasks(settings);
  }, [settings]);

  const getKycRequirementMessage = useCallback(() => {
    return settings?.kyc_requirement_message || 'KYC-Verifizierung erforderlich für den Zugriff auf Aufgaben.';
  }, [settings?.kyc_requirement_message]);

  // Always show payment management for admins since they manage users with different payment modes
  const shouldShowPaymentManagement = useCallback(() => {
    return true; // Admins need to see payment features to manage users with task-based payment
  }, []);


  // Compute derived color values from settings
  const colors = useMemo(() => {
    const primaryColor = settings?.primary_color || defaultContextValue.colors.primary;
    const accentColor = settings?.accent_color || defaultContextValue.colors.accent;
    
    const primaryRgb = hexToRgb(primaryColor) || defaultContextValue.colors.primaryRgb;
    const accentRgb = hexToRgb(accentColor) || defaultContextValue.colors.accentRgb;
    
    const primaryDerived = getDerivedColors(primaryColor);
    const accentDerived = getDerivedColors(accentColor);
    
    return {
      primary: primaryColor,
      primaryRgb,
      primaryHover: primaryDerived.hover,
      primaryLight: primaryDerived.light,
      primaryDark: primaryDerived.dark,
      accent: accentColor,
      accentRgb,
      accentHover: accentDerived.hover,
      accentLight: accentDerived.light,
      accentDark: accentDerived.dark
    };
  }, [settings?.primary_color, settings?.accent_color]);
  
  // Create value object
  const value = useMemo(() => ({
    settings,
    loading,
    error,
    updateSettings,
    uploadImage,
    refreshSettings,
    isKycRequiredForTasks: isKycRequiredForTasksContext,
    getKycRequirementMessage,
    shouldShowPaymentManagement,
    colors
  }), [settings, loading, error, updateSettings, uploadImage, refreshSettings, isKycRequiredForTasksContext, getKycRequirementMessage, shouldShowPaymentManagement, colors]);
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Hook to use the settings context
 */
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  
  return context;
}; 