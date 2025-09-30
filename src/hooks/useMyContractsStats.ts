import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contract, ContractAssignment } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export interface AssignedContract extends ContractAssignment {
  contract?: Contract;
  contract_title?: string;
}

/**
 * Hook for fetching and managing assigned contracts with improved data management
 */
export const useMyContractsStats = () => {
  // Assigned contracts state with session storage caching
  const [assignedContracts, setAssignedContracts] = useState<AssignedContract[]>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('myContractsList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 5 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 5 * 60 * 1000)) {
          return parsedData.assignedContracts || [];
        }
      }
    } catch (error) {
      console.error('Error retrieving stored contracts:', error);
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('myContractsList');
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
   * Fetch assigned contracts from the database
   */
  const fetchAssignedContracts = useCallback(async (force = false) => {
    if (!user?.id) {
      console.log('No user ID available, skipping contract fetch');
      return [];
    }
    
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Data fetch already in progress, skipping');
      return assignedContracts;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && lastFetchTime && (now - lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(lastFetchTime).toLocaleTimeString()}`);
      return assignedContracts;
    }
    
    // If we have data in cache that's not too old (< 5 minutes), don't show loading state
    const hasRecentData = lastFetchTime && (now - lastFetchTime < 5 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log('Fetching assigned contracts for user:', user.id);
      
      // Get assigned contracts with contract details
      const { data, error: fetchError } = await supabase
        .from('contract_assignments')
        .select('*, contract:contracts(*)')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      console.log('Received assignments:', data?.length || 0);
      
      // Process the fetched data
      const processedData = (data || []).map(item => ({
        ...item,
        contract_title: item.contract?.title || 'Unknown Contract'
      }));
      
      // Update state with fetched data
      setAssignedContracts(processedData);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('myContractsList', JSON.stringify({
          assignedContracts: processedData,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing assigned contracts in session storage:', storageError);
      }
      
      return processedData;
    } catch (err) {
      console.error('Error fetching assigned contracts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch assigned contracts'));
      
      // Log detailed error for debugging
      if (err instanceof Error && err.stack) {
        console.error('Error stack:', err.stack);
      }
      
      toast.error('Failed to fetch assigned contracts');
      return [];
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, lastFetchTime, assignedContracts]);
  
  /**
   * Get contract by ID
   */
  const getContractById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      return data as Contract;
    } catch (err) {
      console.error('Error fetching contract by ID:', err);
      toast.error('Failed to fetch contract details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Sign a contract
   */
  const signContract = useCallback(async (assignmentId: string, signatureData: string) => {
    try {
      setLoading(true);
      
      const { data, error: signError } = await supabase
        .from('contract_assignments')
        .update({
          status: 'signed',
          signature_data: signatureData,
          signed_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();
      
      if (signError) throw signError;
      
      // Force refresh assigned contracts
      await fetchAssignedContracts(true);
      
      toast.success('Contract signed successfully');
      return data as ContractAssignment;
    } catch (err) {
      console.error('Error signing contract:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sign contract');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAssignedContracts]);
  
  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchAssignedContracts();
    }
  }, [fetchAssignedContracts, user]);
  
  return {
    assignedContracts,
    loading,
    error,
    lastFetchTime,
    fetchAssignedContracts,
    getContractById,
    signContract
  };
}; 