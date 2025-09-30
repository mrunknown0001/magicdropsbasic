import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface NotificationCounts {
  pendingSubmissions: number;
  newSubmissions: number;
  totalNotifications: number;
}

interface TaskStatusChange {
  id: string;
  status: string;
  previousStatus?: string;
  assignee_id: string;
  task_template?: {
    title: string;
  };
  profile?: {
    first_name: string;
    last_name: string;
  };
}

export const useNotifications = () => {
  const { user, isAdmin } = useAuth();
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    pendingSubmissions: 0,
    newSubmissions: 0,
    totalNotifications: 0
  });

  // Fetch current notification counts
  const fetchNotificationCounts = useCallback(async () => {
    if (!user) return;

    try {
      if (isAdmin()) {
        // Admin notifications: count submitted tasks
        const { data: submittedTasks, error } = await supabase
          .from('task_assignments')
          .select('id, submitted_at')
          .eq('status', 'submitted');

        if (!error && submittedTasks) {
          const pendingSubmissions = submittedTasks.length;
          
          // Count "new" submissions (submitted in last 24 hours)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const newSubmissions = submittedTasks.filter(task => 
            task.submitted_at && new Date(task.submitted_at) > oneDayAgo
          ).length;

          setNotificationCounts({
            pendingSubmissions,
            newSubmissions,
            totalNotifications: pendingSubmissions
          });
        }
      } else {
        // Worker notifications: check for status changes on their tasks
        const { data: workerTasks, error } = await supabase
          .from('task_assignments')
          .select('id, status, reviewed_at')
          .eq('assignee_id', user.id)
          .in('status', ['completed', 'rejected']);

        if (!error && workerTasks) {
          // Count recently reviewed tasks (in last 24 hours)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentlyReviewed = workerTasks.filter(task => 
            task.reviewed_at && new Date(task.reviewed_at) > oneDayAgo
          ).length;

          setNotificationCounts({
            pendingSubmissions: 0,
            newSubmissions: recentlyReviewed,
            totalNotifications: recentlyReviewed
          });
        }
      }
    } catch (err) {
      console.error('Error fetching notification counts:', err);
    }
  }, [user, isAdmin]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchNotificationCounts();

    let channel: any;

    if (isAdmin()) {
      // Admin: Subscribe to task assignment changes (especially new submissions)
      channel = supabase.channel('admin-notifications')
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'task_assignments',
            filter: 'status=eq.submitted'
          },
          (payload) => {
            console.log('New task submission detected:', payload);
            
            // Show toast notification
            toast.success('🔔 Neue Aufgabe eingereicht!', {
              duration: 5000,
              position: 'top-right',
            });

            // Refresh counts
            fetchNotificationCounts();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'task_assignments',
            filter: 'status=in.(completed,rejected)'
          },
          (payload) => {
            console.log('Task reviewed:', payload);
            // Refresh counts when tasks are reviewed
            fetchNotificationCounts();
          }
        )
        .subscribe();

    } else {
      // Worker: Subscribe to status changes on their tasks
      channel = supabase.channel('worker-notifications')
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'task_assignments',
            filter: `assignee_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Task status change for worker:', payload);
            
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;
            
            // Show notification for status changes
            if (newRecord.status !== oldRecord.status) {
              if (newRecord.status === 'completed') {
                toast.success('✅ Ihre Aufgabe wurde genehmigt!', {
                  duration: 6000,
                  position: 'top-right',
                });
              } else if (newRecord.status === 'rejected') {
                toast.error('❌ Ihre Aufgabe wurde abgelehnt. Bitte prüfen Sie die Details.', {
                  duration: 8000,
                  position: 'top-right',
                });
              }
            }

            // Refresh counts
            fetchNotificationCounts();
          }
        )
        .subscribe();
    }

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, isAdmin, fetchNotificationCounts]);

  // Clear notification counts (mark as read)
  const clearNotifications = useCallback(() => {
    setNotificationCounts(prev => ({
      ...prev,
      newSubmissions: 0,
      totalNotifications: prev.pendingSubmissions // Keep pending count but clear "new" count
    }));
  }, []);

  // Manual refresh
  const refreshNotifications = useCallback(() => {
    return fetchNotificationCounts();
  }, [fetchNotificationCounts]);

  return {
    notificationCounts,
    clearNotifications,
    refreshNotifications,
    fetchNotificationCounts
  };
}; 