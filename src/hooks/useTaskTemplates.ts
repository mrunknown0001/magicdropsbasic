import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { TaskTemplate } from '../types/database';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { connectionManager } from '../lib/connectionManager';
import { retryOperation } from '../utils/apiUtils';
import { getKycRequirementStatus } from '../utils/kycValidation';
import { useSettingsContext } from '../context/SettingsContext';

export const useTaskTemplates = () => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user, profile } = useAuth();
  const { settings } = useSettingsContext();

  const fetchTemplates = useCallback(async () => {
    // Remove the user check to ensure templates are always fetched
    // Templates should be visible to all authenticated users regardless of role
    try {
      console.log('Fetching task templates...');
      setLoading(true);
      setError(null);
      
      // Test if supabaseAdmin is properly initialized
      console.log('supabaseAdmin available:', !!supabaseAdmin);
      
      const { data, error } = await retryOperation(async () => {
        console.log('Executing Supabase RPC for task templates using admin client');
        
        // Try first with the RPC function that bypasses RLS
        try {
          const result = await supabaseAdmin
            .rpc('get_all_task_templates');
          
          console.log('RPC response:', { data: result.data, error: result.error });
          return result;
        } catch (rpcError) {
          console.error('RPC error, falling back to direct query:', rpcError);
          
          // Fall back to direct query if RPC fails
          const result = await supabaseAdmin
            .from('task_templates')
            .select('*')
            .order('created_at', { ascending: false });
          
          console.log('Fallback query response:', { data: result.data, error: result.error });
          return result;
        }
      });

      if (error) {
        console.error('Error fetching task templates:', error);
        throw error;
      }
      
      console.log('Task templates fetched successfully:', data ? data.length : 0, 'templates');
      console.log('Templates data:', data);
      
      // Apply KYC filtering for employees (admins should see all templates)
      let filteredTemplates = data as TaskTemplate[];
      
      if (profile?.role === 'employee') {
        const kycStatus = getKycRequirementStatus(profile, settings);
        if (kycStatus.isBlocked) {
          console.log('🛡️ KYC verification required for employee, returning empty templates array');
          filteredTemplates = [];
        }
      }
      
      setTemplates(filteredTemplates);
    } catch (err) {
      console.error('Failed to fetch task templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch task templates'));
      toast.error('Failed to fetch task templates');
      // Schedule a reconnection attempt
      connectionManager.scheduleReconnect('task-templates-channel');
    } finally {
      setLoading(false);
    }
  }, [profile, settings]);

  // Reference to store the subscription
  const subscriptionRef = useRef<{ subscription: any; channelId: string } | null>(null);
  
  // Setup subscription with proper error handling
  const setupSubscription = useCallback(() => {
    // Clean up any existing subscription
    if (subscriptionRef.current?.subscription) {
      supabaseAdmin.removeChannel(subscriptionRef.current.subscription);
    }
    
    // Use a stable channel ID to prevent creating multiple channels
    const channelId = `task-templates-channel-stable`;
    
    const subscription = supabaseAdmin
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_templates',
        },
        (payload) => {
          console.log('Task templates change received:', payload);
          // Dispatch fetch-start and fetch-end events to properly handle loading state
          window.dispatchEvent(new CustomEvent('fetch-start'));
          fetchTemplates().finally(() => {
            window.dispatchEvent(new CustomEvent('fetch-end'));
          });
        }
      )
      .subscribe((status) => {
        // Only log status changes in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Task templates subscription status: ${status}`);
        }
        
        // Handle more status types to improve reconnection
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          connectionManager.scheduleReconnect(channelId, 2000); // Reduced reconnect delay
        } else if (status === 'SUBSCRIBED') {
          // Force a refresh when subscription is established
          fetchTemplates();
        }
      });
    
    subscriptionRef.current = { subscription, channelId };
  }, [fetchTemplates]);

  useEffect(() => {
    // Always fetch templates on component mount, regardless of user state
    fetchTemplates();
    setupSubscription();
    
    // Listen for reconnect events
    const handleReconnect = () => {
      console.log('Reconnecting task templates subscription');
      fetchTemplates();
      setupSubscription();
    };
    
    window.addEventListener('supabase-reconnect', handleReconnect);
    
    return () => {
      // Clean up subscription
      if (subscriptionRef.current) {
        supabaseAdmin.removeChannel(subscriptionRef.current.subscription);
      }
      window.removeEventListener('supabase-reconnect', handleReconnect);
    };
  }, [user, fetchTemplates, setupSubscription]);

  const createTemplate = async (templateData: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await retryOperation(async () => {
        return await supabaseAdmin
          .from('task_templates')
          .insert([{
            ...templateData,
            created_by: user?.id || ''
          }])
          .select()
          .single();
      });

      if (error) throw error;
      
      // No need to call fetchTemplates() here as the real-time subscription will handle it
      toast.success('Task template created successfully');
      return data as TaskTemplate;
    } catch (err) {
      console.error('Failed to create task template:', err);
      toast.error('Failed to create task template');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const updateTemplate = async (id: string, updates: Partial<TaskTemplate>) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { data, error } = await retryOperation(async () => {
        return await supabaseAdmin
          .from('task_templates')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
      });

      if (error) throw error;
      
      // Refresh templates list after successful update
      fetchTemplates();
      toast.success('Task template updated successfully');
      return data as TaskTemplate;
    } catch (err) {
      console.error('Failed to update task template:', err);
      toast.error('Failed to update task template');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      
      const { error } = await retryOperation(async () => {
        return await supabaseAdmin
          .from('task_templates')
          .delete()
          .eq('id', id);
      });

      if (error) throw error;
      
      // Refresh templates list after successful deletion
      fetchTemplates();
      toast.success('Task template deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete task template:', err);
      toast.error('Failed to delete task template');
      throw err;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  const getTemplateById = async (id: string): Promise<TaskTemplate | null> => {
    console.log('getTemplateById called with id:', id);
    try {
      // Dispatch fetch-start event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-start'));
      console.log('Using supabaseAdmin client to fetch template');
      
      const { data, error } = await retryOperation(async () => {
        console.log('Executing Supabase query for template with id:', id);
        return await supabaseAdmin
          .from('task_templates')
          .select('*')
          .eq('id', id)
          .single();
      });

      console.log('Template query result:', { data, error });
      
      if (error) {
        console.error('Error in getTemplateById query:', error);
        throw error;
      }
      
      if (!data) {
        console.log('No template data found for id:', id);
        return null;
      }
      
      console.log('Successfully retrieved template data:', data);
      return data as TaskTemplate;
    } catch (err) {
      console.error('Failed to get task template:', err);
      toast.error('Failed to get task template');
      return null;
    } finally {
      // Dispatch fetch-end event for loading indicator
      window.dispatchEvent(new CustomEvent('fetch-end'));
      console.log('getTemplateById finished');
    }
  };

  const createTaskFromTemplate = async (templateId: string, assigneeId?: string, dueDate?: string, customPaymentAmount?: number) => {
    // Always dispatch fetch-start event before any async operations
    window.dispatchEvent(new CustomEvent('fetch-start'));
    
    try {
      // Validate inputs early to prevent unnecessary operations
      if (!templateId) {
        throw new Error('Template ID is required');
      }
      
      if (!assigneeId) {
        throw new Error('Assignee ID is required');
      }
      
      // First, get the template with timeout handling
      const templatePromise = getTemplateById(templateId);
      
      // Set a timeout for the template fetch to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Template fetch timed out')), 5000);
      });
      
      // Race the template fetch against the timeout
      const template = await Promise.race([templatePromise, timeoutPromise]) as TaskTemplate;
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Log template info for debugging
      console.log('Assigning template to employee:', {
        templateId,
        assigneeId,
        dueDate
      });
      
      // Get the template to check for required attachments and its type
      const templateType = template.type;
      const isSimpleType = templateType === 'platzhalter' || templateType === 'andere' || templateType === 'other';
      
      // Only set document_step_required for non-simple types (bankdrop, exchanger)
      const documentStepRequired = !isSimpleType && 
        template && 
        template.required_attachments && 
        Array.isArray(template.required_attachments) && 
        template.required_attachments.length > 0;
      
      console.log('Creating task with document step required:', documentStepRequired, 'Template type:', templateType);
      
      // FIXED: Create both task and task_assignment records in a transaction-like manner
      
      // First, create the main task record
      const { data: taskData, error: taskError } = await retryOperation(async () => {
        return await supabase
          .from('tasks')
          .insert([{
            title: template.title,
            description: template.description,
            client: template.type === 'bankdrop' ? 'Bank' : 'Client',
            status: 'pending',
            priority: template.priority,
            assignee_id: assigneeId,
            due_date: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            task_template_id: templateId,
            type: template.type,
            payment_amount: customPaymentAmount !== undefined ? customPaymentAmount : template.payment_amount
          }])
          .select()
          .single();
      }, 3, 1000);
      
      if (taskError) {
        console.error('Error creating task:', JSON.stringify(taskError, null, 2));
        throw taskError;
      }
      
      console.log('Task created successfully:', taskData);
      
      // Now create the task assignment with the task_id reference
      const { data: assignmentData, error: assignmentError } = await retryOperation(async () => {
        return await supabase
          .from('task_assignments')
          .insert([{
            task_template_id: templateId,
            assignee_id: assigneeId,
            due_date: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            current_step: 0,
            video_chat_status: 'not_started',
            created_by: user?.id,
            task_id: taskData.id, // CRITICAL: Link to the task record
            // Add these fields
            document_step_required: documentStepRequired,
            document_step_completed: false,
            // Add custom payment amount if provided (for Vergütung mode)
            custom_payment_amount: customPaymentAmount || null
          }])
          .select()
          .single();
      }, 3, 1000);
      
      if (assignmentError) {
        console.error('Error creating task assignment:', JSON.stringify(assignmentError, null, 2));
        
        // Clean up the task record if assignment creation failed
        await supabase
          .from('tasks')
          .delete()
          .eq('id', taskData.id);
          
        throw assignmentError;
      }
      
      console.log('Task assignment created successfully:', assignmentData);
      
      toast.success('Task assigned successfully');
      return assignmentData;
    } catch (err) {
      console.error('Failed to assign task from template:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to assign task from template');
      throw err;
    } finally {
      // Always dispatch fetch-end event in finally block to ensure it runs
      // even if there's an error or the promise is rejected
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  // Calculate KYC blocked status for employees
  const kycStatus = profile?.role === 'employee' 
    ? getKycRequirementStatus(profile, settings) 
    : { isBlocked: false };
  
  return {
    templates,
    loading,
    error,
    isKycBlocked: kycStatus.isBlocked,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    createTaskFromTemplate
  };
};
