import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TaskAssignment } from '../types/database';
import toast from 'react-hot-toast';

interface UseEmployeeTaskAssignmentsOptions {
  initialRefresh?: boolean;
}

export const useEmployeeTaskAssignments = (employeeId?: string, options: UseEmployeeTaskAssignmentsOptions = {}) => {
  const { initialRefresh = true } = options;
  
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actualHoursWorked, setActualHoursWorked] = useState(0);
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  
  /**
   * Fetch task assignments for the specified employee
   */
  const fetchTaskAssignments = useCallback(async (force = false) => {
    if (!employeeId) {
      setTaskAssignments([]);
      return;
    }
    
    // Check if we're already fetching
    if (isFetchingRef.current && !force) {
      return;
    }
    
    setLoading(true);
    setError(null);
    isFetchingRef.current = true;
    
    try {
      console.log(`Fetching task assignments for employee: ${employeeId}`);
      
      const { data, error: fetchError } = await supabase
        .from('task_assignments')
        .select(`
          *,
          task_template:task_template_id(*),
          profile:assignee_id(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('assignee_id', employeeId)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Error fetching task assignments:', fetchError);
        throw fetchError;
      }
      
      const assignments = data || [];
      console.log(`Fetched ${assignments.length} task assignments for employee ${employeeId}`);
      setTaskAssignments(assignments);
      
      return assignments;
    } catch (err) {
      console.error('Error in fetchTaskAssignments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task assignments';
      setError(new Error(errorMessage));
      toast.error(`Fehler beim Laden der Aufgaben: ${errorMessage}`);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [employeeId]);
  
  /**
   * Refresh task assignments
   */
  const refreshTaskAssignments = useCallback(() => {
    return fetchTaskAssignments(true);
  }, [fetchTaskAssignments]);
  
  /**
   * Get task assignments by status
   */
  const getTaskAssignmentsByStatus = useCallback((status: 'pending' | 'submitted' | 'completed' | 'rejected' | 'canceled') => {
    return taskAssignments.filter(assignment => assignment.status === status);
  }, [taskAssignments]);
  
  /**
   * Get task assignment statistics
   */
  const getTaskAssignmentStats = useCallback(() => {
    const pending = taskAssignments.filter(a => a.status === 'pending').length;
    const submitted = taskAssignments.filter(a => a.status === 'submitted').length;
    const completed = taskAssignments.filter(a => a.status === 'completed').length;
    const rejected = taskAssignments.filter(a => a.status === 'rejected').length;
    const canceled = taskAssignments.filter(a => a.status === 'canceled').length;
    const total = taskAssignments.length;
    
    // Use actual worked hours from time_entries table
    const totalHoursWorked = actualHoursWorked;
    
    return {
      pending,
      submitted,
      completed,
      rejected,
      canceled,
      total,
      totalHoursWorked,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [taskAssignments]);
  
  // Fetch worked hours from time_entries table
  useEffect(() => {
    const fetchWorkedHours = async () => {
      if (!employeeId) return;
      
      try {
        const { data: timeEntries, error } = await supabase
          .from('time_entries')
          .select('hours')
          .eq('employee_id', employeeId)
          .eq('status', 'approved');
          
        if (!error && timeEntries) {
          const total = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
          setActualHoursWorked(total);
        }
      } catch (err) {
        console.warn('Could not fetch worked hours:', err);
        // Fallback to estimated hours calculation
        const totalHoursWorked = taskAssignments
          .filter(a => a.status === 'completed')
          .reduce((total, assignment) => {
            const estimatedHours = assignment.task_template?.estimated_hours || 0;
            return total + estimatedHours;
          }, 0);
        setActualHoursWorked(totalHoursWorked);
      }
    };
    
    fetchWorkedHours();
  }, [employeeId, taskAssignments]);
  
  // Initial fetch
  useEffect(() => {
    if (employeeId && initialRefresh) {
      fetchTaskAssignments();
    }
  }, [employeeId, initialRefresh, fetchTaskAssignments]);
  
  return {
    taskAssignments,
    loading,
    error,
    fetchTaskAssignments,
    refreshTaskAssignments,
    getTaskAssignmentsByStatus,
    getTaskAssignmentStats
  };
}; 