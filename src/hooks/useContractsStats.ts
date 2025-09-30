import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contract, ContractAssignment } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * Hook for fetching contracts with improved data management
 */
export const useContractsStats = () => {
  // Contracts state with session storage caching
  const [contracts, setContracts] = useState<Contract[]>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('contractsList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 5 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 5 * 60 * 1000)) {
          return parsedData.contracts || [];
        }
      }
    } catch (error) {
      console.error('Error retrieving stored contracts:', error);
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, isAdmin } = useAuth();
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('contractsList');
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
   * Fetch contracts from the database
   */
  const fetchContracts = useCallback(async (force = false) => {
    if (!user) {
      console.log('No user found, skipping fetch');
      return;
    }
    
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Data fetch already in progress, skipping');
      return;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && lastFetchTime && (now - lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(lastFetchTime).toLocaleTimeString()}`);
      return;
    }
    
    // If we have data in cache that's not too old (< 5 minutes), don't show loading state
    const hasRecentData = lastFetchTime && (now - lastFetchTime < 5 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log('Fetching contracts data...');
      
      // Build query based on user role
      let query = supabase.from('contracts').select('*');
        
      if (isAdmin()) {
        // By default, show only templates for admins
        query = query.eq('is_template', true);
      } else {
        // For employees, fetch their assigned contracts
        // First get the contract IDs assigned to the user
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('contract_assignments')
          .select('contract_id')
          .eq('user_id', user.id);
          
        if (assignmentError) throw assignmentError;
        
        const contractIds = assignmentData?.map(item => item.contract_id) || [];
        
        // Then filter contracts by these IDs
        if (contractIds.length > 0) {
          query = query.in('id', contractIds);
        } else {
          // If no contracts assigned, set empty array and return
          setContracts([]);
          setLoading(false);
          isFetchingRef.current = false;
          
          // Update last fetch time
          const fetchTimestamp = Date.now();
          setLastFetchTime(fetchTimestamp);
          
          // Store in session storage
          try {
            sessionStorage.setItem('contractsList', JSON.stringify({
              contracts: [],
              lastFetchTime: fetchTimestamp
            }));
          } catch (storageError) {
            console.error('Error storing contracts in session storage:', storageError);
          }
          
          return [];
        }
      }
      
      // Execute query
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Update state with fetched data
      const fetchedContracts = data || [];
      setContracts(fetchedContracts);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('contractsList', JSON.stringify({
          contracts: fetchedContracts,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing contracts in session storage:', storageError);
      }
      
      return fetchedContracts;
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch contracts'));
      toast.error('Failed to fetch contracts');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, isAdmin, lastFetchTime]);
  
  /**
   * Create a new contract
   */
  const createContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      
      // Strip out any fields that don't exist in the database schema to prevent errors
      const { 
        title, 
        category, 
        content, 
        is_active, 
        is_template, 
        parent_id, 
        version_number, 
        template_data, 
        version, 
        created_by
      } = contractData;
      
      // Only include fields that exist in the database table
      const validContractData = {
        title,
        category,
        content,
        is_active,
        is_template,
        parent_id,
        version_number,
        template_data,
        version,
        created_by
      };
      
      const { data, error: createError } = await supabase
        .from('contracts')
        .insert([validContractData])
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Refresh contracts list
      await fetchContracts(true);
      
      toast.success('Contract created successfully');
      return data as Contract;
    } catch (err) {
      console.error('Failed to create contract:', err);
      toast.error(`Failed to create contract: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Create a contract template (legacy function for backward compatibility)
   */
  const createContractTemplate = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    return createContract({
      ...contractData,
      is_template: true,
      version_number: contractData.version_number || 1,
    });
  };
  
  /**
   * Update an existing contract
   */
  const updateContract = async (id: string, updates: Partial<Contract>) => {
    try {
      setLoading(true);
      
      const { data, error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Refresh contracts list
      await fetchContracts(true);
      
      toast.success('Contract updated successfully');
      return data as Contract;
    } catch (err) {
      console.error('Failed to update contract:', err);
      toast.error('Failed to update contract');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Delete a contract
   */
  const deleteContract = async (id: string) => {
    try {
      setLoading(true);
      
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      // Refresh contracts list
      await fetchContracts(true);
      
      toast.success('Contract deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete contract:', err);
      toast.error('Failed to delete contract');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Get a contract by ID
   */
  const getContractById = async (id: string) => {
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
      console.error('Failed to get contract by ID:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Get an assigned contract by ID
   */
  const getAssignedContractById = async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('contract_assignments')
        .select('*, contract:contracts(*)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      return data as ContractAssignment;
    } catch (err) {
      console.error('Failed to get assigned contract by ID:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  

  
  /**
   * Get contract assignments for a contract
   */
  const getContractAssignments = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('contract_assignments')
        .select('*, user:profiles(*)')
        .eq('contract_id', contractId);
      
      if (error) throw error;
      return data as ContractAssignment[];
    } catch (err) {
      console.error('Failed to get contract assignments:', err);
      throw err;
    }
  };
  
  /**
   * Get contracts assigned to a user
   */
  const getAssignedContracts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('contract_assignments')
        .select('*, contract:contracts(*)')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;
      return data as ContractAssignment[];
    } catch (err) {
      console.error('Failed to get assigned contracts:', err);
      throw err;
    }
  };
  
  /**
   * Sign a contract
   */
  const signContract = async (assignmentId: string, signatureData: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contract_assignments')
        .update({
          status: 'signed',
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh contracts list
      await fetchContracts(true);
      
      toast.success('Contract signed successfully');
      return data as ContractAssignment;
    } catch (err) {
      console.error('Failed to sign contract:', err);
      toast.error('Failed to sign contract');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [fetchContracts, user]);
  
  return {
    contracts,
    loading,
    error,
    lastFetchTime,
    fetchContracts,
    createContract,
    createContractTemplate,
    updateContract,
    deleteContract,

    getContractAssignments,
    getAssignedContracts,
    getContractById,
    getAssignedContractById,
    signContract
  };
}; 