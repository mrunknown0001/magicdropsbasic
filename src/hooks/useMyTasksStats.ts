import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Task, TaskAssignment } from '../types/database';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import { getKycRequirementStatus } from '../utils/kycValidation';
import { useSettingsContext } from '../context/SettingsContext';

/**
 * Hook for fetching employee's tasks with optimized data management
 */
export const useMyTasksStats = () => {
  const { user, profile } = useAuth();
  const { settings } = useSettingsContext();
  
  // Tasks state with session storage caching
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('myTasksList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Return cached data if it's not older than 5 minutes
        if (parsedData.lastFetchTime && (Date.now() - parsedData.lastFetchTime < 5 * 60 * 1000)) {
          return parsedData.tasks || [];
        }
      }
    } catch (error) {
      console.error('Error retrieving stored tasks:', error);
    }
    return [];
  });
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('myTasksList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return parsedData.lastFetchTime || 0;
      }
    } catch (error) {
      console.error('Error retrieving last fetch time:', error);
    }
    return 0;
  });
  
  // Task assignments with assignments by task ID
  const [taskAssignments, setTaskAssignments] = useState<Record<string, TaskAssignment[]>>({});
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  
  /**
   * Format date for display
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Kein Datum';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
    } catch (error) {
      console.error('Invalid date format:', dateString);
      return dateString;
    }
  };
  
  /**
   * Fetch task assignments for a specific task
   */
  const fetchAssignmentsForTask = useCallback(async (taskId: string, force = false) => {
    if (!user) return;
    if (!force && loadingAssignments[taskId]) return; // Prevent duplicate requests unless forced
    
    try {
      setLoadingAssignments(prev => ({ ...prev, [taskId]: true }));
      
      const { data, error: fetchError } = await supabase
        .from('task_assignments')
        .select('*, task_template:task_template_id(*)')
        .eq('task_id', taskId)
        .eq('assignee_id', user.id);
      
      if (fetchError) throw fetchError;
      
      console.log(`📋 Updated task assignments for task ${taskId}:`, data);
      setTaskAssignments(prev => ({
        ...prev,
        [taskId]: data as TaskAssignment[]
      }));
    } catch (err) {
      console.error('Error fetching task assignments:', err);
    } finally {
      setLoadingAssignments(prev => ({ ...prev, [taskId]: false }));
    }
  }, [user]);
  
  /**
   * Fetch all user tasks
   */
  const fetchTasks = useCallback(async (force = false) => {
    if (!user) {
      console.log('No user found, skipping fetch');
      return;
    }
    
    // Check KYC status - if blocked, return empty tasks array
    const kycStatus = getKycRequirementStatus(profile, settings);
    if (kycStatus.isBlocked) {
      console.log('🛡️ KYC verification required, returning empty tasks array');
      setTasks([]);
      setTaskAssignments({});
      setLoading(false);
      setError(null);
      return [];
    }
    
    // If forced, clear session storage cache
    if (force) {
      console.log('🧹 Force refresh: Clearing session storage cache');
      try {
        sessionStorage.removeItem('myTasksList');
      } catch (error) {
        console.error('Error clearing session storage:', error);
      }
      // Reset loading assignments cache
      setLoadingAssignments({});
    }
    
    // Check if we're already fetching
    if (!force && isFetchingRef.current) {
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
      console.log('Fetching my tasks data...');
      
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      const fetchedTasks = data || [];
      setTasks(fetchedTasks);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('myTasksList', JSON.stringify({
          tasks: fetchedTasks,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing tasks in session storage:', storageError);
      }
      
      // Fetch assignments for tasks
      for (const task of fetchedTasks) {
        fetchAssignmentsForTask(task.id, force);
      }
      
      return fetchedTasks;
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, profile, settings, lastFetchTime, fetchAssignmentsForTask]);
  
  /**
   * Helper to get assignment status display
   */
  const getAssignmentStatusDisplay = useCallback((assignment: TaskAssignment) => {
    // Priority 1: Check task submission status first
    if (assignment.status === 'submitted') {
      return {
        label: 'Eingereicht - Warten auf Prüfung',
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: 'Upload',
        darkBg: 'dark:bg-blue-300',
        darkText: 'dark:text-blue-900'
      };
    } else if (assignment.status === 'rejected') {
      return {
        label: 'Abgelehnt - Grund anzeigen',
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: 'AlertCircle',
        darkBg: 'dark:bg-red-300',
        darkText: 'dark:text-red-900'
      };
    } else if (assignment.status === 'completed') {
      return {
        label: 'Abgeschlossen',
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: 'CheckCircle',
        darkBg: 'dark:bg-green-300',
        darkText: 'dark:text-green-900'
      };
    } else if (assignment.status === 'canceled') {
      return {
        label: 'Abgebrochen',
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: 'XCircle',
        darkBg: 'dark:bg-gray-300',
        darkText: 'dark:text-gray-900'
      };
    }
    
    // Priority 2: Check video chat status for pending tasks
    if (assignment.video_chat_status === 'accepted') {
      return {
        label: 'Video-Chat akzeptiert',
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: 'Clock',
        darkBg: 'dark:bg-blue-300',
        darkText: 'dark:text-blue-900'
      };
    } else if (assignment.video_chat_status === 'declined') {
      return {
        label: 'Video-Chat abgelehnt',
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: 'AlertCircle',
        darkBg: 'dark:bg-red-300',
        darkText: 'dark:text-red-900'
      };
    } else if (assignment.video_chat_status === 'completed') {
      return {
        label: 'Video-Chat abgeschlossen',
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: 'CheckCircle',
        darkBg: 'dark:bg-green-300',
        darkText: 'dark:text-green-900'
      };
    }
    
    // Priority 3: Check task progress for pending tasks
    if (assignment.current_step && assignment.current_step > 0) {
      return {
        label: 'In Bearbeitung',
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: 'Clock',
        darkBg: 'dark:bg-blue-300',
        darkText: 'dark:text-blue-900'
      };
    } else {
      return {
        label: 'Ausstehend',
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: 'AlertCircle',
        darkBg: 'dark:bg-yellow-300',
        darkText: 'dark:text-yellow-900'
      };
    }
  }, []);
  
  // Real-time subscription for task assignments
  useEffect(() => {
    if (!user) return;

    console.log(`🔌 Setting up real-time subscription for user: ${user.id}`);

    // Setup subscription for task_assignments changes for this user
    const channel = supabase
      .channel(`user-task-assignments-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
          filter: `assignee_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Task assignment change detected for user:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New record:', payload.new);
          console.log('Old record:', payload.old);
          
          // If this is the update event we care about (status change)
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            console.log(`📊 Status change detected: ${oldStatus} → ${newStatus}`);
            
            // Clear specific assignment cache for this task
            if (payload.new.task_id) {
              console.log(`🗑️ Clearing assignment cache for task: ${payload.new.task_id}`);
              setTaskAssignments(prev => {
                const updated = { ...prev };
                delete updated[payload.new.task_id];
                return updated;
              });
            }
          }
          
          // Force refresh the tasks and assignments data
          console.log('🔄 Forcing refresh of task data...');
          fetchTasks(true);
        }
      )
      .subscribe((status) => {
        console.log(`User task assignments subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTasks]);
  
  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [fetchTasks, user]);
  
  // Calculate KYC blocked status
  const kycStatus = getKycRequirementStatus(profile, settings);
  
  return {
    tasks,
    taskAssignments,
    loading,
    loadingAssignments,
    error,
    lastFetchTime,
    isKycBlocked: kycStatus.isBlocked,
    fetchTasks,
    fetchAssignmentsForTask,
    formatDate,
    getAssignmentStatusDisplay
  };
}; 