import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Task } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { connectionManager } from '../lib/connectionManager';
import { retryOperation } from '../utils/apiUtils';

export const useTasks = (skipInitialFetch = false) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<Error | null>(null);
  const { user, isAdmin } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching tasks with admin client...');
      let query = supabaseAdmin.from('tasks').select('*');
      
      // If not admin, only fetch assigned tasks
      if (!isAdmin()) {
        query = query.eq('assignee_id', user.id);
      }
      
      console.log('Query built:', { isAdmin: isAdmin(), userId: user.id });

      const { data, error } = await retryOperation(async () => {
        return await query.order('created_at', { ascending: false });
      });

      if (error) throw error;
      setTasks(data as Task[]);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
      toast.error('Failed to fetch tasks');
      // Schedule a reconnection attempt
      connectionManager.scheduleReconnect('tasks-channel');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Reference to store the subscription
  const subscriptionRef = useRef<{ subscription: any; channelId: string } | null>(null);
  
  // Setup subscription with proper error handling
  const setupSubscription = useCallback(() => {
    // Clean up any existing subscription first
    if (subscriptionRef.current?.subscription) {
      // Use the same instance of supabase that created the channel
      try {
        supabaseAdmin.removeChannel(subscriptionRef.current.subscription);
      } catch (e) {
        console.error('Error removing existing channel:', e);
      }
      subscriptionRef.current = null;
    }
    
    // Don't set up subscription if user is not authenticated
    if (!user) return;
    
    // Use a stable channel ID based on user ID to prevent creating multiple channels
    const channelId = `tasks-channel-${user.id}`;
    
    // Create new subscription
    const subscription = supabaseAdmin
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Tasks change received:', payload);
          
          // Use fetchTasks directly without dispatching events
          fetchTasks();
        }
      )
      .subscribe((status) => {
        // Only log status changes in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Tasks subscription status: ${status}`);
        }
        
        // Improved status handling
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          // Only reconnect if we're not already trying to reconnect
          if (subscriptionRef.current) {
            connectionManager.scheduleReconnect(channelId, 3000);
          }
        }
      });
    
    subscriptionRef.current = { subscription, channelId };
    return subscription;
  }, [user, fetchTasks]); // Only depend on user and fetchTasks

  useEffect(() => {
    let mounted = true;
    
    // Setup function to ensure proper cleanup
    const setup = async () => {
      if (!user || !mounted) return;
      
      try {
        // Don't automatically fetch tasks on mount if skipInitialFetch is true
        if (!skipInitialFetch) {
          await fetchTasks();
        }
        
        // Setup subscription only once
        setupSubscription();
      } catch (err) {
        console.error('Error in setup:', err);
      }
    };
    
    // Listen for reconnect events only once
    const handleReconnect = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.channel === subscriptionRef.current?.channelId) {
        console.log('Reconnecting tasks subscription');
        
        // Fetch first, then re-setup subscription to avoid multiple setups
        fetchTasks().finally(() => {
          if (mounted) setupSubscription();
        });
      }
    };
    
    // Call setup and add event listener
    setup();
    window.addEventListener('supabase-reconnect', handleReconnect);
    
    // Cleanup function
    return () => {
      mounted = false;
      
      // Remove event listener
      window.removeEventListener('supabase-reconnect', handleReconnect);
      
      // Clean up subscription
      if (subscriptionRef.current?.subscription) {
        try {
          supabaseAdmin.removeChannel(subscriptionRef.current.subscription);
          subscriptionRef.current = null;
        } catch (e) {
          console.error('Error removing channel on cleanup:', e);
        }
      }
    };
  }, [user, fetchTasks, setupSubscription, skipInitialFetch]); // Only depend on stable references

  const createTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();
      });

      if (error) throw error;
      
      // Refresh tasks list after successful creation
      fetchTasks();
      toast.success('Task created successfully');
      return data as Task;
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Failed to create task');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
      });

      if (error) throw error;
      
      // Refresh tasks list after successful update
      fetchTasks();
      toast.success('Task updated successfully');
      return data as Task;
    } catch (err) {
      console.error('Failed to update task:', err);
      toast.error('Failed to update task');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const getTaskById = async (id: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();
      });

      if (error) throw error;
      return data as Task;
    } catch (err) {
      console.error('Failed to fetch task:', err);
      toast.error('Failed to fetch task');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { error } = await retryOperation(async () => {
        return await supabase
          .from('tasks')
          .delete()
          .eq('id', id);
      });

      if (error) throw error;
      
      // Refresh tasks list after successful deletion
      fetchTasks();
      toast.success('Task deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error('Failed to delete task');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    fetchTasks, // Export fetchTasks for manual refetching
  };
};