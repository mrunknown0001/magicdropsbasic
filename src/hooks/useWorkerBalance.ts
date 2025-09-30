import { useState, useEffect, useCallback } from 'react';
import { WorkerBalance, PaymentTransaction, PayoutRequest } from '../types/database';
import { supabase } from '../lib/supabase';

export interface UseWorkerBalanceReturn {
  balance: WorkerBalance | null;
  transactions: PaymentTransaction[];
  payoutRequests: PayoutRequest[];
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshPayoutRequests: () => Promise<void>;
  createPayoutRequest: (amount: number, paymentMethod?: Record<string, any>) => Promise<boolean>;
}

export const useWorkerBalance = (workerId?: string): UseWorkerBalanceReturn => {
  const [balance, setBalance] = useState<WorkerBalance | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch worker balance
  const fetchBalance = useCallback(async () => {
    if (!workerId) return;

    try {
      const response = await fetch(`/api/balance/${workerId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setBalance(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch balance');
      }
    } catch (err: any) {
      console.error('Error fetching worker balance:', err);
      setError(err.message);
    }
  }, [workerId]);

  // Fetch worker transactions
  const fetchTransactions = useCallback(async () => {
    if (!workerId) return;

    try {
      const response = await fetch(`/api/balance/${workerId}/transactions?limit=50`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setTransactions(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    }
  }, [workerId]);

  // Fetch worker payout requests
  const fetchPayoutRequests = useCallback(async () => {
    if (!workerId) return;

    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('worker_id', workerId)
        .order('requested_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPayoutRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching payout requests:', err);
      setError(err.message);
    }
  }, [workerId]);

  // Create payout request
  const createPayoutRequest = useCallback(async (amount: number, paymentMethod?: Record<string, any>): Promise<boolean> => {
    if (!workerId) return false;

    try {
      const response = await fetch('/api/balance/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          workerId,
          amount,
          paymentMethod
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create payout request: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        // Refresh data after successful request
        await Promise.all([
          fetchBalance(),
          fetchPayoutRequests()
        ]);
        return true;
      } else {
        throw new Error(result.message || 'Failed to create payout request');
      }
    } catch (err: any) {
      console.error('Error creating payout request:', err);
      setError(err.message);
      return false;
    }
  }, [workerId, fetchBalance, fetchPayoutRequests]);

  // Refresh functions
  const refreshBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchBalance();
    setLoading(false);
  }, [fetchBalance]);

  const refreshTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchTransactions();
    setLoading(false);
  }, [fetchTransactions]);

  const refreshPayoutRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPayoutRequests();
    setLoading(false);
  }, [fetchPayoutRequests]);

  // Initial data fetch
  useEffect(() => {
    if (workerId) {
      const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        
        await Promise.all([
          fetchBalance(),
          fetchTransactions(),
          fetchPayoutRequests()
        ]);
        
        setLoading(false);
      };

      fetchAllData();
    }
  }, [workerId, fetchBalance, fetchTransactions, fetchPayoutRequests]);

  return {
    balance,
    transactions,
    payoutRequests,
    loading,
    error,
    refreshBalance,
    refreshTransactions,
    refreshPayoutRequests,
    createPayoutRequest
  };
};
