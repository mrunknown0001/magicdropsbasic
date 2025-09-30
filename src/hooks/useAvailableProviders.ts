import { useState, useEffect } from 'react';
// Remove unused supabase import since we're calling API directly

export interface ProviderInfo {
  available: boolean;
  name: string;
  description: string;
}

export interface AvailableProvidersData {
  providers: Record<string, ProviderInfo>;
  availableCount: number;
  totalCount: number;
}

export const useAvailableProviders = () => {
  const [providers, setProviders] = useState<AvailableProvidersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the backend API directly
      const response = await fetch('/api/phone/providers');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      
      if (result.status === 'success') {
        setProviders(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch providers');
      }
    } catch (err: any) {
      console.error('Error fetching available providers:', err);
      setError(err.message || 'Failed to fetch available providers');
      
      // Fallback: assume all providers are available to prevent UI blocking
      setProviders({
        providers: {
          sms_activate: { available: true, name: 'SMS-Activate', description: 'International SMS service' },
          smspva: { available: true, name: 'SMSPVA', description: 'Russian SMS service' },
          anosim: { available: true, name: 'Anosim', description: 'German SMS service' },
          gogetsms: { available: true, name: 'GoGetSMS', description: 'International SMS service' },
          receive_sms_online: { available: true, name: 'Receive SMS Online', description: 'Manual SMS collection' }
        },
        availableCount: 5,
        totalCount: 5
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableProviders();
  }, []);

  return {
    providers,
    loading,
    error,
    refetch: fetchAvailableProviders
  };
};
