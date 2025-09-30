import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TaskAssignment } from '../types/database';
import toast from 'react-hot-toast';

interface SubmittedTaskWithDetails {
  // All TaskAssignment fields
  id: string;
  task_template_id: string;
  assignee_id: string;
  due_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  task_id?: string;
  current_step: number;
  video_chat_status: string;
  demo_data?: any;
  video_chat_code?: string;
  demo_email?: string;
  demo_password?: string;
  ident_code?: string;
  ident_url?: string;
  phone_number_id?: string;
  play_store_url?: string;
  app_store_url?: string;
  document_step_completed: boolean;
  document_step_required: boolean;
  video_call_rating_completed: boolean;
  video_call_rating_data?: any;
  submission_data?: any;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  
  // Additional enriched data
  task_template?: {
    id: string;
    title: string;
    description?: string;
    type?: string;
    estimated_hours?: number;
    priority?: string;
  };
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface UseTaskSubmissionsOptions {
  initialRefresh?: boolean;
}

export const useTaskSubmissions = (options: UseTaskSubmissionsOptions = {}) => {
  const { initialRefresh = true } = options;
  
  const [submittedTasks, setSubmittedTasks] = useState<SubmittedTaskWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  
  /**
   * Fetch submitted tasks with related data
   */
  const fetchSubmittedTasks = useCallback(async (force = false) => {
    // Check if we're already fetching
    if (isFetchingRef.current && !force) {
      console.log('Already fetching submitted tasks, skipping');
      return;
    }
    
    // Check if we've already fetched and not forcing
    if (hasFetchedRef.current && !force) {
      console.log('Already fetched submitted tasks, using cached data');
      return;
    }
    
    setLoading(true);
    setError(null);
    isFetchingRef.current = true;
    
    try {
      console.log('Fetching submitted tasks...');
      
      // First, get all submitted task assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
      
      if (assignmentsError) {
        console.error('Error fetching task assignments:', assignmentsError);
        throw assignmentsError;
      }
      
      if (!assignments || assignments.length === 0) {
        console.log('No submitted tasks found');
        setSubmittedTasks([]);
        hasFetchedRef.current = true;
        return;
      }
      
      console.log(`Found ${assignments.length} submitted tasks`);
      
      // Get unique template IDs and assignee IDs
      const templateIds = [...new Set(assignments.map(a => a.task_template_id).filter(Boolean))];
      const assigneeIds = [...new Set(assignments.map(a => a.assignee_id).filter(Boolean))];
      
      // Fetch task templates
      let templatesMap: Record<string, any> = {};
      if (templateIds.length > 0) {
        const { data: templates, error: templatesError } = await supabase
          .from('task_templates')
          .select('id, title, description, type, estimated_hours, priority')
          .in('id', templateIds);
          
        if (!templatesError && templates) {
          templatesMap = templates.reduce((acc, template) => {
            acc[template.id] = template;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      // Fetch profiles with better error handling
      let profilesMap: Record<string, any> = {};
      if (assigneeIds.length > 0) {
        console.log('Fetching profiles for IDs:', assigneeIds);
        
        try {
          // Try using the RPC function first for better reliability
          // The RPC function expects UUID array, but Supabase client handles the conversion
          const { data: profilesData, error: rpcError } = await supabase.rpc(
            'get_profiles_with_emails_by_ids',
            { profile_ids: assigneeIds }
          );
          
          if (!rpcError && profilesData && profilesData.length > 0) {
            console.log('Successfully fetched profiles via RPC:', profilesData);
            profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, any>);
          } else {
            console.log('RPC failed, trying direct profile query:', rpcError);
            
            // Fallback to direct profile query
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .in('id', assigneeIds);
              
            if (!profilesError && profiles) {
              console.log('Successfully fetched profiles via direct query:', profiles);
              profilesMap = profiles.reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
              }, {} as Record<string, any>);
            } else {
              console.error('Failed to fetch profiles:', profilesError);
            }
          }
        } catch (profileFetchError) {
          console.error('Error during profile fetch:', profileFetchError);
        }
      }
      
      // Combine all data
      const enrichedTasks: SubmittedTaskWithDetails[] = assignments.map(assignment => ({
        ...assignment,
        task_template: assignment.task_template_id ? templatesMap[assignment.task_template_id] : undefined,
        profile: assignment.assignee_id ? profilesMap[assignment.assignee_id] : undefined
      }));
      
      console.log(`Successfully enriched ${enrichedTasks.length} submitted tasks`);
      setSubmittedTasks(enrichedTasks);
      hasFetchedRef.current = true;
      
    } catch (err) {
      console.error('Error in fetchSubmittedTasks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch submitted tasks';
      setError(new Error(errorMessage));
      toast.error(`Fehler beim Laden der eingereichten Aufgaben: ${errorMessage}`);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);
  
  /**
   * Refresh submitted tasks
   */
  const refreshSubmittedTasks = useCallback(() => {
    hasFetchedRef.current = false; // Reset fetch flag to allow refresh
    return fetchSubmittedTasks(true);
  }, [fetchSubmittedTasks]);
  
  /**
   * Approve a task submission
   */
  const approveTask = useCallback(async (taskId: string, adminNotes?: string) => {
    try {
      // Get current user for time entry creation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First update the task assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('task_assignments')
        .update({
          status: 'completed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', taskId)
        .eq('status', 'submitted')
        .select('task_id')
        .single();
      
      if (assignmentError) throw assignmentError;
      
      // CRITICAL FIX: Also update the main task status
      if (assignmentData?.task_id) {
        console.log(`🔄 Updating task status for task_id: ${assignmentData.task_id}`);
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentData.task_id);
        
        if (taskError) {
          console.error('Error updating task status:', taskError);
          // Don't throw here - assignment was successful, just log the task update error
        } else {
          console.log('✅ Successfully updated both task_assignments and tasks status');
        }
      }
      
      // Create time entry for the approved task
      try {
        console.log(`Creating time entry for approved task: ${taskId}`);
        const timeEntryResponse = await fetch('/api/time-entries/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskAssignmentId: taskId,
            approvedBy: user.id
          })
        });

        if (!timeEntryResponse.ok) {
          const errorData = await timeEntryResponse.json();
          console.warn('Failed to create time entry:', errorData);
          // Don't throw here - the task approval was successful
          toast.success('Aufgabe genehmigt (Zeiterfassung fehlgeschlagen)');
        } else {
          const timeEntryResult = await timeEntryResponse.json();
          if (timeEntryResult.success && timeEntryResult.data) {
            console.log('Time entry created successfully:', timeEntryResult.data);
            toast.success(`Aufgabe genehmigt und ${timeEntryResult.data.hours || 0} Stunden hinzugefügt!`);
          } else {
            console.log('Time entry creation completed:', timeEntryResult.message);
      toast.success('Aufgabe erfolgreich genehmigt!');
          }
        }
      } catch (timeEntryError) {
        console.error('Error creating time entry:', timeEntryError);
        // Don't throw here - the task approval was successful
        toast.success('Aufgabe genehmigt (Zeiterfassung fehlgeschlagen)');
      }
      
      await refreshSubmittedTasks(); // Refresh the list
      return assignmentData;
    } catch (err) {
      console.error('Error approving task:', err);
      toast.error('Fehler beim Genehmigen der Aufgabe');
      throw err;
    }
  }, [refreshSubmittedTasks]);
  
  /**
   * Reject a task submission
   */
  const rejectTask = useCallback(async (taskId: string, reason: string, adminNotes?: string) => {
    if (!reason.trim()) {
      throw new Error('Rejection reason is required');
    }
    
    try {
      // First update the task assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('task_assignments')
        .update({
          status: 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason.trim(),
          admin_notes: adminNotes?.trim() || null
        })
        .eq('id', taskId)
        .eq('status', 'submitted')
        .select('task_id')
        .single();
      
      if (assignmentError) throw assignmentError;
      
      // CRITICAL FIX: Also update the main task status to rejected
      if (assignmentData?.task_id) {
        console.log(`🔄 Updating task status to rejected for task_id: ${assignmentData.task_id}`);
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentData.task_id);
        
        if (taskError) {
          console.error('Error updating task status:', taskError);
          // Don't throw here - assignment was successful, just log the task update error
        } else {
          console.log('✅ Successfully updated both task_assignments and tasks status to rejected');
        }
      }
      
      toast.success('Aufgabe abgelehnt und Feedback gesendet!');
      await refreshSubmittedTasks(); // Refresh the list
      return assignmentData;
    } catch (err) {
      console.error('Error rejecting task:', err);
      toast.error('Fehler beim Ablehnen der Aufgabe');
      throw err;
    }
  }, [refreshSubmittedTasks]);
  
  // Initial fetch
  useEffect(() => {
    if (initialRefresh) {
      fetchSubmittedTasks();
    }
  }, [initialRefresh, fetchSubmittedTasks]);
  
  return {
    submittedTasks,
    loading,
    error,
    fetchSubmittedTasks,
    refreshSubmittedTasks,
    approveTask,
    rejectTask
  };
}; 