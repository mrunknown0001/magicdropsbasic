import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface TimeEntry {
  id: string;
  employee_id: string;
  task_assignment_id: string;
  hours: number;
  entry_date: string;
  description?: string;
  approved_by: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  // Related data
  task_assignments?: {
    id: string;
    task_templates?: {
      title: string;
    };
  };
}

export interface TimeTrackingStats {
  totalHours: number;
  totalEntries: number;
  averageHoursPerEntry: number;
  dailyBreakdown: Record<string, number>;
  dateRange: {
    start: string;
    end: string;
  };
}

interface UseTimeTrackingOptions {
  employeeId?: string;
  autoRefresh?: boolean;
}

export const useTimeTracking = (options: UseTimeTrackingOptions = {}) => {
  const { employeeId, autoRefresh = false } = options;
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeTrackingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Create a new time entry
   */
  const createTimeEntry = useCallback(async (
    taskAssignmentId: string, 
    approvedBy: string
  ): Promise<TimeEntry | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/time-entries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskAssignmentId,
          approvedBy
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create time entry');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        toast.success(`Time entry created: ${result.data.hours} hours`);
        return result.data;
      } else {
        toast.error(result.message || 'Failed to create time entry');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create time entry';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get time entries for an employee
   */
  const getTimeEntries = useCallback(async (
    targetEmployeeId?: string,
    filters: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<TimeEntry[]> => {
    const targetId = targetEmployeeId || employeeId;
    
    if (!targetId) {
      console.warn('No employee ID provided for getTimeEntries');
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/time-entries/employee/${targetId}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch time entries');
      }

      const result = await response.json();
      
      if (result.success) {
        const entries = result.data || [];
        setTimeEntries(entries);
        return entries;
      } else {
        throw new Error(result.error || 'Failed to fetch time entries');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time entries';
      setError(new Error(errorMessage));
      console.error('Error fetching time entries:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  /**
   * Calculate total hours for an employee
   */
  const calculateTotalHours = useCallback(async (
    targetEmployeeId?: string,
    period: 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<TimeTrackingStats | null> => {
    const targetId = targetEmployeeId || employeeId;
    
    if (!targetId) {
      console.warn('No employee ID provided for calculateTotalHours');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/time-entries/stats/${targetId}?period=${period}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate hours');
      }

      const result = await response.json();
      
      if (result.success) {
        const statsData = result.data;
        setStats(statsData);
        return statsData;
      } else {
        throw new Error(result.error || 'Failed to calculate hours');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate hours';
      setError(new Error(errorMessage));
      console.error('Error calculating hours:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  /**
   * Refresh time entries and stats
   */
  const refreshTimeTracking = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      await Promise.all([
        getTimeEntries(),
        calculateTotalHours()
      ]);
    } catch (err) {
      console.error('Error refreshing time tracking data:', err);
    }
  }, [employeeId, getTimeEntries, calculateTotalHours]);

  /**
   * Get hours worked today
   */
  const getHoursToday = useCallback((): number => {
    if (!timeEntries.length) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    return timeEntries
      .filter(entry => entry.entry_date === today && entry.status === 'approved')
      .reduce((total, entry) => total + entry.hours, 0);
  }, [timeEntries]);

  /**
   * Get hours worked this week
   */
  const getHoursThisWeek = useCallback((): number => {
    if (!timeEntries.length) return 0;
    
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    
    return timeEntries
      .filter(entry => entry.entry_date >= startOfWeekStr && entry.status === 'approved')
      .reduce((total, entry) => total + entry.hours, 0);
  }, [timeEntries]);

  /**
   * Get hours worked this month
   */
  const getHoursThisMonth = useCallback((): number => {
    if (!stats) return 0;
    return stats.totalHours;
  }, [stats]);

  /**
   * Get recent time entries (last 10)
   */
  const getRecentTimeEntries = useCallback((): TimeEntry[] => {
    return timeEntries
      .filter(entry => entry.status === 'approved')
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
      .slice(0, 10);
  }, [timeEntries]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (autoRefresh && employeeId) {
      refreshTimeTracking();
    }
  }, [autoRefresh, employeeId, refreshTimeTracking]);

  return {
    // Data
    timeEntries,
    stats,
    loading,
    error,
    
    // Actions
    createTimeEntry,
    getTimeEntries,
    calculateTotalHours,
    refreshTimeTracking,
    
    // Computed values
    getHoursToday,
    getHoursThisWeek,
    getHoursThisMonth,
    getRecentTimeEntries
  };
}; 