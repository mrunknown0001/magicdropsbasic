import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * Hook for fetching tasks with simplified data management
 */
export const useTasksStats = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Try to load from session storage first
    try {
      const storedData = sessionStorage.getItem('adminTasksList');
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, isAdmin } = useAuth();
  
  // Last fetch time tracking
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => {
    try {
      const storedData = sessionStorage.getItem('adminTasksList');
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
   * Fetch tasks from the database
   */
  const fetchTasks = useCallback(async (force = false) => {
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
      console.log('Fetching tasks data...');
      
      // Build query based on user role
      let query = supabase.from('tasks').select('*');
      
      // If not admin, only fetch assigned tasks
      if (!isAdmin()) {
        query = query.eq('assignee_id', user.id);
      }
      
      // Execute query
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Update state with fetched data
      setTasks(data || []);
      
      // Update last fetch time
      const fetchTimestamp = Date.now();
      setLastFetchTime(fetchTimestamp);
      
      // Store in session storage
      try {
        sessionStorage.setItem('adminTasksList', JSON.stringify({
          tasks: data,
          lastFetchTime: fetchTimestamp
        }));
      } catch (storageError) {
        console.error('Error storing tasks in session storage:', storageError);
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, isAdmin, lastFetchTime]);
  
  /**
   * Create a new task
   */
  const createTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      
      const { data, error: createError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Refresh tasks list
      await fetchTasks(true);
      
      toast.success('Task created successfully');
      return data as Task;
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Failed to create task');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update an existing task
   */
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      setLoading(true);
      
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Refresh tasks list
      await fetchTasks(true);
      
      toast.success('Task updated successfully');
      return data as Task;
    } catch (err) {
      console.error('Failed to update task:', err);
      toast.error('Failed to update task');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Get a task by ID
   */
  const getTaskById = async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      return data as Task;
    } catch (err) {
      console.error('Failed to fetch task:', err);
      toast.error('Failed to fetch task');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Delete a task
   */
  const deleteTask = async (id: string) => {
    try {
      setLoading(true);
      
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      // Refresh tasks list
      await fetchTasks(true);
      
      toast.success('Task deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error('Failed to delete task');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [fetchTasks, user]);
  
  return {
    tasks,
    loading,
    error,
    lastFetchTime,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    fetchTasks
  };
}; 