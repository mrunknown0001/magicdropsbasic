import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import { useAuth } from '../context/AuthContext';
import { TaskAssignment } from '../types/database';
import { getKycRequirementStatus } from '../utils/kycValidation';
import { useSettingsContext } from '../context/SettingsContext';

// Simplified stats interface
export interface EmployeeDashboardStats {
  userTasksCount: number;
  userCompletedTasksCount: number;
  userDocumentsCount: number;
  userHoursThisMonth: number;
  lastFetchTime: number;
}

// Default stats
const defaultStats: EmployeeDashboardStats = {
  userTasksCount: 0,
  userCompletedTasksCount: 0,
  userDocumentsCount: 0,
  userHoursThisMonth: 0,
  lastFetchTime: 0
};

/**
 * Hook for fetching employee dashboard statistics
 */
export const useEmployeeDashboardStats = () => {
  const { user, profile } = useAuth();
  const { settings } = useSettingsContext();
  const [stats, setStats] = useState<EmployeeDashboardStats>(() => {
    // Try to load from session storage first
    try {
      const storedStats = sessionStorage.getItem('employeeDashboardStats');
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats);
        // Return cached data if it's not older than 5 minutes
        if (parsedStats.lastFetchTime && (Date.now() - parsedStats.lastFetchTime < 5 * 60 * 1000)) {
          return { ...defaultStats, ...parsedStats };
        }
      }
    } catch (error) {
      console.error('Error retrieving stored stats:', error);
    }
    return defaultStats;
  });
  
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  
  // Fetch user tasks
  const fetchUserTasks = useCallback(async () => {
    if (!user) return [];
    
    // Check KYC status - if blocked, return empty tasks array
    const kycStatus = getKycRequirementStatus(profile, settings);
    if (kycStatus.isBlocked) {
      console.log('🛡️ KYC verification required, returning empty tasks array');
      return [];
    }
    
    setTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select('*, task_template:task_template_id(*)')
        .eq('assignee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setTasks(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching tasks:', err);
      return [];
    } finally {
      setTasksLoading(false);
    }
  }, [user, profile, settings]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
    } catch (e) {
      return 'Ungültiges Datum';
    }
  };
  
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (force = false) => {
    if (!user) {
      console.log('No user found, skipping fetch');
      return;
    }
    
    // Check KYC status - if blocked, return zero stats
    const kycStatus = getKycRequirementStatus(profile, settings);
    if (kycStatus.isBlocked) {
      console.log('🛡️ KYC verification required, returning zero stats');
      const blockedStats = { 
        ...defaultStats, 
        lastFetchTime: Date.now() 
      };
      setStats(blockedStats);
      setTasks([]);
      setLoading(false);
      setError(null);
      return blockedStats;
    }
    
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Data fetch already in progress, skipping');
      return;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && stats.lastFetchTime && (now - stats.lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(stats.lastFetchTime).toLocaleTimeString()}`);
      return;
    }
    
    // If we have data in cache that's not too old (< 5 minutes), don't show loading state
    const hasRecentData = stats.lastFetchTime && (now - stats.lastFetchTime < 5 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log('Fetching employee dashboard data...');
      
      // Initialize stats object with defaults and timestamp
      let statsData = { 
        ...defaultStats,
        lastFetchTime: Date.now()
      };
      
      // Fetch user active tasks count
      try {
        const { count: userTasksCount, error: tasksError } = await supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'pending');
          
        if (!tasksError && userTasksCount !== null) {
          statsData.userTasksCount = userTasksCount;
        }
      } catch (err) {
        console.warn('Could not fetch user tasks count:', err);
      }
      
      // Fetch user completed tasks count
      try {
        const { count: userCompletedTasksCount, error: completedTasksError } = await supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'completed');
          
        if (!completedTasksError && userCompletedTasksCount !== null) {
          statsData.userCompletedTasksCount = userCompletedTasksCount;
        }
      } catch (err) {
        console.warn('Could not fetch user completed tasks count:', err);
      }
      
      // Fetch user documents count
      try {
        const { count: userDocumentsCount, error: documentsError } = await supabase
          .from('contract_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'signed');
          
        if (!documentsError && userDocumentsCount !== null) {
          statsData.userDocumentsCount = userDocumentsCount;
        }
      } catch (err) {
        console.warn('Could not fetch user documents count:', err);
      }
      
      // Calculate hours this month using new time tracking system
      try {
        const response = await fetch(`/api/time-entries/stats/${user.id}?period=month`);
        if (response.ok) {
          const timeTrackingData = await response.json();
          if (timeTrackingData.success && timeTrackingData.data) {
            statsData.userHoursThisMonth = timeTrackingData.data.totalHours || 0;
          }
        }
      } catch (err) {
        console.warn('Could not fetch worked hours from time tracking API:', err);
        // Fallback to direct database query with new schema
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const { data: timeEntries, error: timeEntriesError } = await supabase
          .from('time_entries')
          .select('hours')
            .eq('employee_id', user.id)
            .eq('status', 'approved')
            .gte('entry_date', firstDayOfMonth.toISOString().split('T')[0]);
          
        if (!timeEntriesError && timeEntries) {
          statsData.userHoursThisMonth = timeEntries.reduce((total, entry) => total + (entry.hours || 0), 0);
        }
        } catch (fallbackErr) {
          console.warn('Could not fetch time entries from database fallback:', fallbackErr);
        }
      }
      
      // Store in state and session storage
      setStats(statsData);
      sessionStorage.setItem('employeeDashboardStats', JSON.stringify(statsData));
      
      // Also fetch user tasks
      await fetchUserTasks();
      
      return statsData;
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchUserTasks, stats.lastFetchTime, user, profile, settings]);
  
  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, user]);
  
  // Calculate KYC blocked status
  const kycStatus = getKycRequirementStatus(profile, settings);
  
  return {
    stats,
    tasks,
    loading,
    tasksLoading,
    error,
    isKycBlocked: kycStatus.isBlocked,
    fetchData: fetchDashboardData,
    formatDate
  };
}; 