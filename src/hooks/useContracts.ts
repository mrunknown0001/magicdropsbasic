import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contract, ContractAssignment } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useContracts = (skipInitialFetch = false, pauseRealtimeUpdates = false) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user, isAdmin } = useAuth();
  
  // Track if fetch is in progress to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  // Track last fetch time for throttling
  const lastFetchTimeRef = useRef(0);

  // Function to fetch contracts data - only called on navigation or manual refresh
  const fetchContracts = useCallback(async () => {
    if (!user) return;
    
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping duplicate request');
      return;
    }
    
    // Apply throttling - no more than once every 2 seconds
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    if (timeSinceLastFetch < 2000 && lastFetchTimeRef.current > 0) {
      console.log(`Throttling contract fetch (${timeSinceLastFetch}ms < 2000ms)`);
      return;
    }
    
    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setLoading(true);
      setError(null);
      
      // For admins, fetch all templates by default
      // For employees, fetch contracts assigned to them
      let query = supabase
        .from('contracts')
        .select('*');
        
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
          // If no contracts assigned, return empty array
          setContracts([]);
          setLoading(false);
          return;
        }
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setContracts(data as Contract[]);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch contracts'));
      toast.error('Failed to fetch contracts');
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, isAdmin]);

  // Initial fetch if needed
  useEffect(() => {
    if (!skipInitialFetch && user) {
      fetchContracts();
    }
  }, [skipInitialFetch, fetchContracts, user]);

  // Create a new contract or contract template
  const createContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh contracts list after successful creation
      fetchContracts();
      toast.success('Contract created successfully');
      return data as Contract;
    } catch (err) {
      console.error('Failed to create contract:', err);
      toast.error('Failed to create contract');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  // Create a contract template (legacy function for backward compatibility)
  const createContractTemplate = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    return createContract({
      ...contractData,
      is_template: true,
      version_number: contractData.version_number || 1,
    });
  };

  // Update an existing contract or contract template
  const updateContract = async (id: string, updates: Partial<Contract>) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh contracts list after successful update
      fetchContracts();
      toast.success('Contract updated successfully');
      return data as Contract;
    } catch (err) {
      console.error('Failed to update contract:', err);
      toast.error('Failed to update contract');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  // Delete a contract
  const deleteContract = async (id: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh contracts list after successful deletion
      fetchContracts();
      toast.success('Contract deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete contract:', err);
      toast.error('Failed to delete contract');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  // Get a contract by ID
  const getContractById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Contract;
    } catch (err) {
      console.error('Failed to get contract by ID:', err);
      throw err;
    }
  };

  // Get an assigned contract by ID
  const getAssignedContractById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('contract_assignments')
        .select('*, contract:contracts(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ContractAssignment;
    } catch (err) {
      console.error('Failed to get assigned contract by ID:', err);
      throw err;
    }
  };

  // Assign a contract to a user
  const assignContract = async (contractId: string, userId: string, dueDate?: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      // First, create a new instance of the contract template
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      
      const contract = contractData as Contract;
      
      // Create a new instance of the contract
      const newContract: Partial<Contract> = {
        title: contract.title,
        content: contract.content,
        category: contract.category,
        is_template: false,
        parent_id: contract.id,
        version_number: contract.version_number,
        template_data: contract.template_data,
      };
      
      const { data: newContractData, error: newContractError } = await supabase
        .from('contracts')
        .insert([newContract])
        .select()
        .single();

      if (newContractError) throw newContractError;
      
      // Then, create the assignment
      const assignment = {
        contract_id: newContractData.id,
        user_id: userId,
        status: 'pending',
        due_date: dueDate || null,
      };
      
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('contract_assignments')
        .insert([assignment])
        .select()
        .single();

      if (assignmentError) throw assignmentError;
      
      toast.success('Contract assigned successfully');
      return assignmentData as ContractAssignment;
    } catch (err) {
      console.error('Failed to assign contract:', err);
      toast.error('Failed to assign contract');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  // Get contract assignments for a contract
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

  // Get contracts assigned to a user
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

  // Sign a contract
  const signContract = async (assignmentId: string, signatureData: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
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
      
      console.log('Contract signed successfully:', data);
      
      // Refresh contracts list
      fetchContracts();
      
      toast.success('Contract signed successfully');
      return data as ContractAssignment;
    } catch (err) {
      console.error('Failed to sign contract:', err);
      toast.error('Failed to sign contract');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    createContract,
    createContractTemplate,
    updateContract,
    deleteContract,
    assignContract,
    getContractAssignments,
    getAssignedContracts,
    getContractById,
    getAssignedContractById,
    signContract,
    retryCount
  };
};
