import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EmployeeStats {
  activeTasks: number;
  completedTasks: number;
  signedContracts: number;
  loading: boolean;
  error: string | null;
}

export const useEmployeeStats = (employeeId: string | undefined) => {
  const [stats, setStats] = useState<EmployeeStats>({
    activeTasks: 0,
    completedTasks: 0,
    signedContracts: 0,
    loading: false,
    error: null
  });

  const fetchEmployeeStats = useCallback(async () => {
    if (!employeeId) return;

    setStats(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch active tasks (pending and in_progress)
      const { count: activeTasksCount, error: activeTasksError } = await supabase
        .from('task_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', employeeId)
        .eq('status', 'pending');

      if (activeTasksError) {
        console.error('Error fetching active tasks:', activeTasksError);
      }

      // Fetch completed tasks
      const { count: completedTasksCount, error: completedTasksError } = await supabase
        .from('task_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', employeeId)
        .eq('status', 'completed');

      if (completedTasksError) {
        console.error('Error fetching completed tasks:', completedTasksError);
      }

      // Fetch signed contracts
      const { count: signedContractsCount, error: signedContractsError } = await supabase
        .from('contract_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', employeeId)
        .eq('status', 'signed');

      if (signedContractsError) {
        console.error('Error fetching signed contracts:', signedContractsError);
      }

      setStats({
        activeTasks: activeTasksCount || 0,
        completedTasks: completedTasksCount || 0,
        signedContracts: signedContractsCount || 0,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching employee stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics'
      }));
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployeeStats();
  }, [fetchEmployeeStats]);

  return {
    ...stats,
    refetch: fetchEmployeeStats
  };
}; 