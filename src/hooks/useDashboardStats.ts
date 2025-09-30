import { useState, useEffect, useCallback, useRef } from 'react';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { createFetchHook } from '../lib/dataFetching';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/supabase';

export interface EmployeeActivity {
  id: string;
  employee_name: string;
  action: string;
  time: string;
  created_at: string;
}

export interface DashboardStats {
  employeeCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  contractsCount: number;
  contractAssignmentsCount: number;
  userTasksCount: number;
  userCompletedTasksCount: number;
  userDocumentsCount: number;
  userHoursThisMonth: number;
  recentActivity: EmployeeActivity[];
}

// Default stats object
const defaultStats: DashboardStats = {
  employeeCount: 0,
  activeTasksCount: 0,
  completedTasksCount: 0,
  contractsCount: 0,
  contractAssignmentsCount: 0,
  userTasksCount: 0,
  userCompletedTasksCount: 0,
  userDocumentsCount: 0,
  userHoursThisMonth: 0,
  recentActivity: []
};

/**
 * Hook for fetching dashboard statistics based on user role
 * @param skipInitialFetch - Whether to skip the initial fetch (useful for navigation-based refreshes)
 */
export const useDashboardStats = (skipInitialFetch = false) => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Create a fetch function for admin stats
  const fetchAdminStats = useCallback(async (client: SupabaseClient<Database, 'public', any>): Promise<{ data: DashboardStats | null; error: PostgrestError | null }> => {
    try {
      console.log('Fetching admin dashboard stats...');
      
      // Initialize stats with default values
      let stats: DashboardStats = { ...defaultStats };
      
      try {
        // Fetch employee count using the secure database function
        // This will also include email data which we don't need here, but it's more secure
        const { data: profiles, error: profilesError } = await client.rpc(
          'get_profiles_with_emails'
        );
          
        if (!profilesError) {
          stats.employeeCount = profiles?.filter((emp: { role: string }) => emp.role === 'employee').length || 0;
        }
      } catch (error) {
        console.warn('Error fetching profiles with secure function:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch active tasks count
        const { count: activeTasksCount, error: activeTasksError } = await client
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
          
        if (!activeTasksError && activeTasksCount !== null) {
          stats.activeTasksCount = activeTasksCount;
        }
      } catch (error) {
        console.warn('Error fetching active tasks:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch completed tasks count
        const { count: completedTasksCount, error: completedTasksError } = await client
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
          
        if (!completedTasksError && completedTasksCount !== null) {
          stats.completedTasksCount = completedTasksCount;
        }
      } catch (error) {
        console.warn('Error fetching completed tasks:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch contracts count
        const { count: contractsCount, error: contractsError } = await client
          .from('contracts')
          .select('*', { count: 'exact', head: true });
          
        if (!contractsError && contractsCount !== null) {
          stats.contractsCount = contractsCount;
        }
      } catch (error) {
        console.warn('Error fetching contracts:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch contract assignments count
        const { count: contractAssignmentsCount, error: assignmentsError } = await client
          .from('contract_assignments')
          .select('*', { count: 'exact', head: true });
          
        if (!assignmentsError && contractAssignmentsCount !== null) {
          stats.contractAssignmentsCount = contractAssignmentsCount;
        }
      } catch (error) {
        console.warn('Error fetching contract assignments:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch recent activity
        const { data: recentActivity, error: activityError } = await client
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!activityError) {
          stats.recentActivity = recentActivity || [];
        } else if (activityError.code === 'PGRST116' || activityError.message.includes('404')) {
          // PGRST116 is resource not found or table doesn't exist (404)
          console.warn('Activity log table might not exist yet, using empty array');
          stats.recentActivity = [];
        }
      } catch (error) {
        console.warn('Error fetching activity log:', error);
        // Continue with other queries
      }
      
      return {
        data: stats,
        error: null
      };
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      return { data: null, error: error as PostgrestError };
    }
  }, []);

  // Create a fetch function for employee stats
  const fetchEmployeeStats = useCallback(async (client: SupabaseClient<Database, 'public', any>): Promise<{ data: DashboardStats | null; error: PostgrestError | null }> => {
    try {
      if (!user) {
        throw new Error('No user found');
      }
      
      // Initialize stats with default values
      let stats: DashboardStats = { ...defaultStats };
      
      try {
        // Fetch user tasks count
        const { count: userTasksCount, error: userTasksError } = await client
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'pending');
          
        if (!userTasksError && userTasksCount !== null) {
          stats.userTasksCount = userTasksCount;
        }
      } catch (error) {
        console.warn('Error fetching user tasks:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch user completed tasks count
        const { count: userCompletedTasksCount, error: userCompletedTasksError } = await client
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'completed');
          
        if (!userCompletedTasksError && userCompletedTasksCount !== null) {
          stats.userCompletedTasksCount = userCompletedTasksCount;
        }
      } catch (error) {
        console.warn('Error fetching user completed tasks:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch user documents count
        const { count: userDocumentsCount, error: userDocumentsError } = await client
          .from('contract_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'signed');
          
        if (!userDocumentsError && userDocumentsCount !== null) {
          stats.userDocumentsCount = userDocumentsCount;
        }
      } catch (error) {
        console.warn('Error fetching user documents:', error);
        // Continue with other queries
      }
      
      try {
        // Calculate hours this month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const { data: timeEntries, error: timeEntriesError } = await client
          .from('time_entries')
          .select('hours')
          .eq('user_id', user.id)
          .gte('date', firstDayOfMonth.toISOString());
          
        if (!timeEntriesError && timeEntries) {
          stats.userHoursThisMonth = timeEntries.reduce((total, entry) => total + (entry.hours || 0), 0) || 0;
        }
      } catch (error) {
        console.warn('Error fetching time entries:', error);
        // Continue with other queries
      }
      
      try {
        // Fetch recent activity for the user
        const { data: recentActivity, error: activityError } = await client
          .from('activity_log')
          .select('*')
          .or(`user_id.eq.${user.id},target_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!activityError) {
          stats.recentActivity = recentActivity || [];
        } else if (activityError.code === 'PGRST116' || activityError.message.includes('404')) {
          // PGRST116 is resource not found or table doesn't exist (404)
          console.warn('Activity log table might not exist yet, using empty array');
          stats.recentActivity = [];
        }
      } catch (error) {
        console.warn('Error fetching activity log:', error);
        // Continue with other queries
      }
      
      return {
        data: stats,
        error: null
      };
    } catch (error) {
      console.error('Error fetching employee dashboard stats:', error);
      return { data: null, error: error as PostgrestError };
    }
  }, [user]);

  // Create the appropriate hook based on user role
  const useAdminStats = createFetchHook(fetchAdminStats, {
    useAdmin: true, // Use admin client for admin stats
    showErrorToasts: true,
    dependencies: [isAdmin, user?.id],
  });
  
  const useEmployeeStats = createFetchHook(fetchEmployeeStats, {
    useAdmin: false, // Use regular client for employee stats
    showErrorToasts: true,
    dependencies: [user?.id],
  });
  
  // Use the appropriate hook based on user role
  const adminStatsResponse = useAdminStats();
  const employeeStatsResponse = useEmployeeStats();
  
  // Track role change to prevent refresh loops
  const prevIsAdminRef = useRef<boolean | null>(null);
  
  // Combine the stats based on user role
  useEffect(() => {
    // Only update if the loading state or data actually changed
    if (isAdmin() !== prevIsAdminRef.current) {
      console.log(`Role changed from ${prevIsAdminRef.current} to ${isAdmin()}`);
      prevIsAdminRef.current = isAdmin();
    }
    
    setLoading(isAdmin() ? adminStatsResponse.loading : employeeStatsResponse.loading);
    
    // Handle error with proper type casting
    const currentError = isAdmin() ? adminStatsResponse.error : employeeStatsResponse.error;
    if (currentError) {
      // Check if it's already a PostgrestError
      if ('code' in currentError) {
        // It's already a PostgrestError
        setError(currentError as PostgrestError);
      } else {
        // Create a PostgrestError-compatible object
        const postgrestError: PostgrestError = {
          message: currentError.message || 'Unknown error occurred',
          details: '',  // Empty string instead of null
          hint: '',     // Empty string instead of null
          code: 'UNKNOWN_ERROR',
          name: 'Error'
        };
        setError(postgrestError);
      }
    } else {
      setError(null);
    }
    
    // Only update the stats if we have valid data for the current role
    if (isAdmin() && adminStatsResponse.data) {
      setStats(adminStatsResponse.data);
    } else if (!isAdmin() && employeeStatsResponse.data) {
      setStats(employeeStatsResponse.data);
    }
  }, [
    isAdmin,
    adminStatsResponse.data,
    adminStatsResponse.loading,
    adminStatsResponse.error,
    employeeStatsResponse.data,
    employeeStatsResponse.loading,
    employeeStatsResponse.error
  ]);
  
  // Track the last fetch time to prevent too many rapid requests
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const coolingPeriodMs = 5000; // Increased from 2s to 5s to prevent rapid fetches
  const fetchCountRef = useRef<number>(0); // Track fetch count to detect loops
  
  // Refetch function with cooling period and error prevention
  const fetchStats = useCallback(async () => {
    // Skip if we're already fetching
    if (isFetchingRef.current) {
      console.log('Stats fetch already in progress, skipping');
      return null;
    }
    
    // Apply cooling period to prevent rapid re-fetches
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // Increment fetch count for detecting loops
    fetchCountRef.current += 1;
    
    // Log a warning if we're fetching too frequently
    if (fetchCountRef.current > 5 && timeSinceLastFetch < 10000) {
      console.warn(`⚠️ Excessive fetch rate detected! ${fetchCountRef.current} fetches in ${timeSinceLastFetch}ms`);
      // If we're in a clear fetch loop, reset count and skip this fetch
      if (fetchCountRef.current > 10) {
        console.error(`🛑 Fetch loop detected! Blocking fetches for a while.`);
        fetchCountRef.current = 0;
        // Skip this fetch
        return null;
      }
    }
    
    // Reset fetch count if it's been a while since the last fetch
    if (timeSinceLastFetch > 30000) {
      fetchCountRef.current = 0;
    }
    
    if (timeSinceLastFetch < coolingPeriodMs && lastFetchTimeRef.current > 0) {
      console.log(`Cooling period active (${timeSinceLastFetch}ms < ${coolingPeriodMs}ms), skipping fetch`);
      return null;
    }
    
    // Skip if no user (prevents auth errors)
    if (!user) {
      console.warn('Cannot fetch dashboard stats: User not authenticated');
      return null;
    }
    
    // Use a local flag to prevent overlapping fetches
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    console.log('Fetching dashboard stats at', new Date().toISOString());
    
    try {
      // Check if the role is clear before proceeding
      const adminRole = isAdmin();
      console.log(`Fetching dashboard stats as ${adminRole ? 'admin' : 'employee'}`);
      
      // Increment retry counter to track attempts
      setRetryCount(prev => Math.min(prev + 1, 5)); // Cap retries at 5
      
      // Call the appropriate fetch method based on user role
      const result = adminRole ? await adminStatsResponse.refetch() : await employeeStatsResponse.refetch();
      return result;
    } catch (err) {
      // Silent fail - just log the error
      console.warn('Error in dashboard stats fetch:', err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      // Always mark fetching as complete
      setTimeout(() => {
        isFetchingRef.current = false;
      }, coolingPeriodMs / 2);
    }
  }, [user, isAdmin, adminStatsResponse.refetch, employeeStatsResponse.refetch]);
  
  // Alias for backward compatibility
  const refetch = fetchStats;
  
  return {
    stats,
    loading,
    error,
    refetch,
    fetchStats,
    retryCount
  };
};
