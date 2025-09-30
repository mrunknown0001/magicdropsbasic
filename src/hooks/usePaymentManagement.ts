import { useState, useEffect, useCallback } from 'react';
import { PayoutRequest, TaskAssignment, WorkerBalance, PaymentTransaction } from '../types/database';
import { supabase } from '../lib/supabase';

export interface UsePaymentManagementReturn {
  workerBalances: WorkerBalance[];
  payoutRequests: PayoutRequest[];
  paymentTransactions: PaymentTransaction[];
  pendingTaskPayments: TaskAssignment[];
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
  refreshPayoutRequests: () => Promise<void>;
  refreshPendingTaskPayments: () => Promise<void>;
  approvePayout: (payoutRequestId: string) => Promise<boolean>;
  rejectPayout: (payoutRequestId: string, rejectionReason: string) => Promise<boolean>;
  approveTaskPayment: (taskAssignmentId: string) => Promise<boolean>;
  recordTaskPayment: (taskAssignmentId: string, amount: number) => Promise<boolean>;
  adjustBalance: (workerId: string, amount: number, description: string) => Promise<boolean>;
  processPayoutRequest: (payoutRequestId: string, action: 'approve' | 'reject' | 'mark_paid', rejectionReason?: string, adminNotes?: string) => Promise<boolean>;
}

export const usePaymentManagement = (enabled: boolean = true): UsePaymentManagementReturn => {
  const [workerBalances, setWorkerBalances] = useState<WorkerBalance[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [pendingTaskPayments, setPendingTaskPayments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch worker balances
  const fetchWorkerBalances = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('worker_balances')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      setWorkerBalances(data || []);
    } catch (err: any) {
      console.error('Error fetching worker balances:', err);
      setError(err);
    }
  }, []);

  // Fetch payout requests
  const fetchPayoutRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPayoutRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching payout requests:', err);
      setError(err);
    }
  }, []);

  // Fetch payment transactions
  const fetchPaymentTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      setPaymentTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching payment transactions:', err);
      setError(err);
    }
  }, []);

  // Fetch pending task payments
  const fetchPendingTaskPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          task_templates (
            id,
            title,
            payment_amount
          ),
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'completed')
        .eq('payment_status', 'pending')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPendingTaskPayments(data || []);
    } catch (err: any) {
      console.error('Error fetching pending task payments:', err);
      setError(err);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchWorkerBalances(),
      fetchPayoutRequests(),
      fetchPaymentTransactions(),
      fetchPendingTaskPayments()
    ]);
    
    setLoading(false);
  }, [enabled, fetchWorkerBalances, fetchPayoutRequests, fetchPaymentTransactions, fetchPendingTaskPayments]);

  // Approve payout
  const approvePayout = useCallback(async (payoutRequestId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/balance/process-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          payoutRequestId,
          action: 'approve',
          reviewedBy: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to approve payout: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        await refreshData();
        return true;
      } else {
        throw new Error(result.message || 'Failed to approve payout');
      }
    } catch (err: any) {
      console.error('Error approving payout:', err);
      setError(err);
      return false;
    }
  }, [refreshData]);

  // Reject payout
  const rejectPayout = useCallback(async (payoutRequestId: string, rejectionReason: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/balance/process-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          payoutRequestId,
          action: 'reject',
          reviewedBy: user.id,
          rejectionReason
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to reject payout: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        await refreshData();
        return true;
      } else {
        throw new Error(result.message || 'Failed to reject payout');
      }
    } catch (err: any) {
      console.error('Error rejecting payout:', err);
      setError(err);
      return false;
    }
  }, [refreshData]);

  // Approve task payment
  const approveTaskPayment = useCallback(async (taskAssignmentId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/balance/approve-task-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          taskAssignmentId,
          approvedBy: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to approve task payment: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        await refreshData();
        return true;
      } else {
        throw new Error(result.message || 'Failed to approve task payment');
      }
    } catch (err: any) {
      console.error('Error approving task payment:', err);
      setError(err);
      return false;
    }
  }, [refreshData]);

  // Record task payment (placeholder)
  const recordTaskPayment = useCallback(async (taskAssignmentId: string, amount: number): Promise<boolean> => {
    try {
      // This would call the API to record a manual task payment
      console.log('Recording task payment:', taskAssignmentId, amount);
      await refreshData();
      return true;
    } catch (err: any) {
      console.error('Error recording task payment:', err);
      setError(err);
      return false;
    }
  }, [refreshData]);

  // Adjust balance (placeholder)
  const adjustBalance = useCallback(async (workerId: string, amount: number, description: string): Promise<boolean> => {
    try {
      // This would call the API to manually adjust a worker's balance
      console.log('Adjusting balance:', workerId, amount, description);
      await refreshData();
      return true;
    } catch (err: any) {
      console.error('Error adjusting balance:', err);
      setError(err);
      return false;
    }
  }, [refreshData]);

  // Legacy function for compatibility
  const processPayoutRequest = useCallback(async (
    payoutRequestId: string, 
    action: 'approve' | 'reject' | 'mark_paid', 
    rejectionReason?: string, 
    adminNotes?: string
  ): Promise<boolean> => {
    if (action === 'approve') {
      return await approvePayout(payoutRequestId);
    } else if (action === 'reject' && rejectionReason) {
      return await rejectPayout(payoutRequestId, rejectionReason);
    }
    return false;
  }, [approvePayout, rejectPayout]);

  // Refresh functions
  const refreshPayoutRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPayoutRequests();
    setLoading(false);
  }, [fetchPayoutRequests]);

  const refreshPendingTaskPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPendingTaskPayments();
    setLoading(false);
  }, [fetchPendingTaskPayments]);

  // Initial data fetch
  useEffect(() => {
    if (enabled) {
      refreshData();
    }
  }, [enabled, refreshData]);

  return {
    workerBalances,
    payoutRequests,
    paymentTransactions,
    pendingTaskPayments,
    loading,
    error,
    refreshData,
    refreshPayoutRequests,
    refreshPendingTaskPayments,
    approvePayout,
    rejectPayout,
    approveTaskPayment,
    recordTaskPayment,
    adjustBalance,
    processPayoutRequest
  };
};
