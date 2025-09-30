import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TaskAssignment } from '../types/database';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getKycRequirementStatus } from '../utils/kycValidation';
import { useSettingsContext } from '../context/SettingsContext';

// Helper function to generate a random code for video chat
const generateRandomCode = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

interface UseTaskAssignmentOptions {
  initialRefresh?: boolean;
}

// Define possible states for the task assignment
type TaskAssignmentStatus = 'pending' | 'submitted' | 'completed' | 'rejected' | 'canceled';
// CRITICAL FIX: Database requires 'accepted' as the correct value for video chat status
type VideoChatStatus = 'not_started' | 'accepted' | 'declined' | 'completed';

export function useTaskAssignment(assignmentId?: string, options: UseTaskAssignmentOptions = {}) {
  const { initialRefresh = true } = options;
  const { user, profile } = useAuth();
  const { settings } = useSettingsContext();
  
  // Store subscription reference
  const subscriptionRef = useRef<{ subscription: any; channelId: string } | null>(null);
  
  // Track if initial fetch has been done to prevent duplicate fetches
  const initialFetchDoneRef = useRef<boolean>(false);
  
  // Track state changes to prevent unnecessary renders
  const hasLoadedRef = useRef<boolean>(false);
  
  const [taskAssignment, setTaskAssignment] = useState<TaskAssignment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Store the last requested assignment ID to detect changes
  const lastAssignmentIdRef = useRef<string | undefined>(assignmentId);

  // Fetch the current task assignment
  const fetchTaskAssignment = useCallback(async () => {
    if (!assignmentId || !user) {
      return null;
    }
    
    // Check KYC status - if blocked, don't allow assignment access
    const kycStatus = getKycRequirementStatus(profile, settings);
    if (kycStatus.isBlocked) {
      console.log('🛡️ KYC verification required, blocking task assignment access');
      setTaskAssignment(null);
      setIsLoading(false);
      setError(new Error('KYC-Verifizierung erforderlich für den Zugriff auf Aufgaben.'));
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Verify session is valid before making the request
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('Session invalid when fetching task assignment');
        throw new Error('Your session has expired. Please refresh the page and log in again.');
      }
      
      const { data, error } = await supabase
        .from('task_assignments')
        .select('*, task_template:task_template_id(*)')
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error('Database error in fetchTaskAssignment:', error);
        throw error;
      }
      
      if (!data) {
        setTaskAssignment(null);
        return null;
      }
      
      setTaskAssignment(data);
      return data;
    } catch (err) {
      console.error('Error fetching task assignment:', err);
      // Handle authentication errors separately
      if (err instanceof Error && err.message.includes('session has expired')) {
        toast.error('Ihre Sitzung ist abgelaufen. Bitte aktualisieren Sie die Seite und melden Sie sich erneut an.');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task assignment';
        console.error('Error details:', JSON.stringify(err, null, 2));
        setError(new Error(errorMessage));
        toast.error(`Fehler beim Laden der Aufgabe: ${errorMessage}`);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user, profile, settings]);

  // Update the current step of a task assignment
  const updateCurrentStep = useCallback(async (stepNumber: number) => {
    console.log(`updateCurrentStep called with stepNumber: ${stepNumber}`);
    console.log(`Current assignmentId: ${assignmentId}, userId: ${user?.id}`);
    
    if (!assignmentId || !user) {
      console.error('Missing assignmentId or user in updateCurrentStep');
      return null;
    }
    
    // Check KYC status - if blocked, don't allow assignment updates
    const kycStatus = getKycRequirementStatus(profile, settings);
    if (kycStatus.isBlocked) {
      console.log('🛡️ KYC verification required, blocking task assignment updates');
      toast.error('KYC-Verifizierung erforderlich für Aufgaben-Updates.');
      return null;
    }
    
    // Check if we have a current task assignment (we should always have this when updateCurrentStep is called)
    if (!taskAssignment) {
      console.error('Cannot update step: no current task assignment available');
      toast.error('Fehler: Aufgabendaten nicht verfügbar');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Executing Supabase update query in updateCurrentStep...');
      console.log(`Query parameters: id=${assignmentId}, assignee_id=${user.id}, current_step=${stepNumber}`);
      
      // Use the database function to update the current step
      const { data, error } = await supabase
        .from('task_assignments')
        .update({ current_step: stepNumber, updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .select()
        .maybeSingle();
        
      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error in updateCurrentStep:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (data) {
        console.log('Successfully updated task step:', data);
        setTaskAssignment(prevState => {
          if (!prevState) return data as TaskAssignment;
          return { ...prevState, current_step: stepNumber } as TaskAssignment;
        });
        
        // Note: Flow step navigation is handled in the TaskFlow component
        
        return data as TaskAssignment;
      } else {
        console.warn('No data returned from Supabase update operation');
        
        // Even if no data is returned but there's no error, update the local state
        // to allow the flow to continue (this handles cases where the DB update worked
        // but the return data was lost)
        setTaskAssignment(prevState => {
          if (!prevState) return null;
          return { ...prevState, current_step: stepNumber } as TaskAssignment;
        });
        
        // Create a replacement object that can be returned
        const fallbackAssignment = taskAssignment ? 
          { ...taskAssignment, current_step: stepNumber } as TaskAssignment : 
          null;
          
        if (fallbackAssignment) {
          console.log('Using fallback assignment data:', fallbackAssignment);
          return fallbackAssignment;
        }
      }
      
      console.log('Returning null from updateCurrentStep - no data found');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task step';
      console.error('Error in updateCurrentStep:', err);
      console.error('Stack trace:', new Error().stack);
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
      console.log('updateCurrentStep operation completed');
    }
  }, [assignmentId, fetchTaskAssignment, taskAssignment, user, profile, settings]);

  // Update video chat status
  const updateVideoChatStatus = useCallback(async (status: VideoChatStatus): Promise<TaskAssignment | null> => {
    if (!assignmentId || !user) {
      console.error('Cannot update video chat status: assignmentId or user is missing');
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    // Debug logging
    console.log('Updating video chat status:', {
      assignmentId,
      userId: user.id,
      newStatus: status
    });

    try {
      // Generate a video chat code if status is 'accepted'
      const videoCode = status === 'accepted' ? generateRandomCode(6) : null;
      
      // Get current task assignment to preserve current_step
      const { data: currentAssignment } = await supabase
        .from('task_assignments')
        .select('current_step')
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .single();
        
      // CRITICAL: Ensure we always have a valid current_step
      const currentStep = currentAssignment?.current_step;
      console.log('Current step from database:', currentStep);
      
      if (currentStep === undefined || currentStep === null) {
        console.warn('Could not retrieve current_step from the database! Using fallback value of 1');
      }
      
      // SOLUTION: Use our new database function that bypasses RLS policies
      console.log('Using database function to bypass RLS policies');
      const { data, error } = await supabase
        .rpc('update_task_assignment_video_chat_status', {
          p_assignment_id: assignmentId,
          p_user_id: user.id,
          p_status: status,
          p_current_step: currentStep !== undefined && currentStep !== null ? currentStep : 1,
          p_code: videoCode
        });
        
      // Log exactly what we got back
      console.log('RPC function response:', { data, error });
      
      if (error) {
        console.error('Database function error:', error);
        console.error('Error details:', {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        });
        
        // Display appropriate error message
        if (error.message && error.message.includes('permission')) {
          toast.error('Keine Berechtigung für diese Aktion');
        } else if (error.message && error.message.includes('not found')) {
          toast.error('Aufgabe wurde nicht gefunden');
        } else {
          toast.error(`Fehler: ${error.message || 'Unbekannter Fehler beim Speichern'}`);
        }
        
        setError(new Error(`Fehler beim Aktualisieren des Video-Chat-Status: ${error.message || 'Unbekannter Fehler'}`));
        return null;
      }
      
      // Database function returns a set - could be empty or with one row
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('Database function returned no rows - update likely failed');
        toast.error('Update fehlgeschlagen: Keine Zeilen aktualisiert');
        return null;
      }
      
      // Get the first row from the result set
      const updatedAssignment = data[0] as unknown as TaskAssignment;
      console.log('Successfully updated task using database function:', updatedAssignment);
      
      // Update our local state with the result and return it
      setTaskAssignment(updatedAssignment);
      return updatedAssignment;
      
    } catch (err) {
      console.error('Error in updateVideoChatStatus:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update video chat status';
      setError(new Error(errorMessage));
      toast.error(`Fehler beim Aktualisieren des Video-Chat-Status: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  // Complete a task assignment
  const completeTaskAssignment = useCallback(async () => {
    if (!assignmentId || !user) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({ 
          status: 'completed' as TaskAssignmentStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setTaskAssignment(prevState => {
          if (!prevState) return data as TaskAssignment;
          return { ...prevState, status: 'completed' } as TaskAssignment;
        });
        toast.success('Aufgabe erfolgreich abgeschlossen!');
        return data as TaskAssignment;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  // Submit a task rating
  const submitTaskRating = useCallback(async (formData: any) => {
    if (!assignmentId || !user) {
      return null;
    }

    console.log('Submitting task rating with form data:', formData);
    setIsLoading(true);
    setError(null);

    try {
      // Structure the data correctly for the database schema
      // The rating_data field should contain all the form values
      const ratingSubmission = {
        task_assignment_id: assignmentId,
        user_id: user.id,
        rating_data: formData, // Nest all form fields in rating_data
        submitted_at: new Date().toISOString()
      };
      
      console.log('Structured rating submission:', ratingSubmission);
      
      // Submit the rating
      const { data: ratingResult, error: ratingError } = await supabase
        .from('task_ratings')
        .insert(ratingSubmission)
        .select()
        .maybeSingle();

      if (ratingError) {
        throw new Error(ratingError.message);
      }

      // CRITICAL FIX: Don't complete the task after rating submission.
      // The task should only be completed after the video chat flow is completed.
      // This allows the video chat decision to be shown after rating.
      console.log('Rating submitted successfully, but not marking task as completed yet.');
      console.log('This allows the video chat flow to continue.');

      toast.success('Bewertung erfolgreich übermittelt!');
      return ratingResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit rating';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  // Submit a video call rating
  const submitVideoCallRating = useCallback(async (formData: any) => {
    if (!assignmentId || !user) {
      console.log('Cannot submit video call rating: missing assignmentId or user');
      return null;
    }

    console.log('Submitting video call rating with form data:', formData);
    setIsLoading(true);
    setError(null);

    try {
      // Structure the data correctly for the database schema
      const ratingSubmission = {
        task_assignment_id: assignmentId,
        user_id: user.id,
        rating_data: formData,
        rating_type: 'video_call',
        submitted_at: new Date().toISOString()
      };
      
      console.log('Structured video call rating submission:', ratingSubmission);
      
      // Submit the rating to task_ratings table
      const { data: ratingResult, error: ratingError } = await supabase
        .from('task_ratings')
        .insert(ratingSubmission)
        .select()
        .maybeSingle();

      if (ratingError) {
        throw new Error(ratingError.message);
      }

      // Also update the task assignment to mark the video call rating as completed
      const { data: updateResult, error: updateError } = await supabase
        .from('task_assignments')
        .update({
          video_call_rating_completed: true,
          video_call_rating_data: formData
        })
        .eq('id', assignmentId)
        .select()
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast.success('Video-Chat Bewertung erfolgreich übermittelt!');
      
      // Update the local state
      if (updateResult) {
        setTaskAssignment(updateResult as TaskAssignment);
        return updateResult as TaskAssignment;
      }
      
      return ratingResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit video call rating';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  // Reset the task assignment to initial state
  const resetTaskAssignment = useCallback(async () => {
    if (!assignmentId || !user) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({ 
          current_step: 0,
          video_chat_status: 'not_started' as VideoChatStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setTaskAssignment(prevState => {
          if (!prevState) return data as TaskAssignment;
          return { 
            ...prevState, 
            current_step: 0,
            video_chat_status: 'not_started'
          } as TaskAssignment;
        });
        return data as TaskAssignment;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset task';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  // ADMIN FUNCTIONS
  
  // Track last fetch to prevent browser crashes from repeated requests
  const lastVideoFetchTimeRef = useRef<number>(0);
  const isVideoFetchingRef = useRef<boolean>(false);
  
  // Admin function: Fetch pending video chat submissions with safety mechanisms
  const fetchPendingVideoSubmissions = useCallback(async (status: VideoChatStatus = 'accepted') => {
    // Skip if already fetching to prevent cascading requests
    if (isVideoFetchingRef.current) {
      console.log('Video submissions fetch already in progress, skipping');
      return [];
    }
    
    // Apply cooling period (1.5 seconds between requests)
    const now = Date.now();
    const timeSinceLastFetch = now - lastVideoFetchTimeRef.current;
    if (timeSinceLastFetch < 1500 && lastVideoFetchTimeRef.current > 0) {
      console.log(`Video fetch cooling period active (${timeSinceLastFetch}ms < 1500ms), skipping`);
      return [];
    }
    
    if (!user) {
      console.log('No user found, skipping video submissions fetch');
      return [];
    }
    
    // Set flags to prevent duplicate fetches
    isVideoFetchingRef.current = true;
    lastVideoFetchTimeRef.current = now;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching video submissions with status: ${status}`);
      
      // Use a timeout to prevent hanging requests
      const fetchPromise = new Promise<TaskAssignment[]>(async (resolve, reject) => {
        try {
      // Fix: Use simpler query structure to avoid column name issues
      // First, get the task assignments with their IDs only
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          task_template:task_template_id(id, title, description)
        `)
        .eq('video_chat_status', status)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error in fetchPendingVideoSubmissions:', error);
            reject(error);
            return;
      }

      if (!data || data.length === 0) {
        console.log(`No submissions found with status '${status}'`);
            resolve([]);
            return;
      }
      
      // Now fetch the profiles separately to avoid the schema issue
      console.log(`Fetching profiles for ${data.length} submissions...`);
      
      // Extract the assignee IDs
      const assigneeIds = data.map(item => item.assignee_id).filter(Boolean);
      
      if (assigneeIds.length === 0) {
        console.log('No valid assignee IDs found in task assignments');
            resolve(data as TaskAssignment[]);
            return;
      }
      
      try {
        // Fetch profiles with emails using a secure database function instead of direct API call
        console.log('Fetching profiles with IDs using database function:', assigneeIds);
        
        // Use the secure database function to get profiles with emails
        const { data: profilesData, error: profilesError } = await supabase.rpc(
          'get_profiles_with_emails_by_ids',
          { profile_ids: assigneeIds }
        );
        
        console.log('Using database function to fetch profiles with emails');
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Don't throw - just log and continue with what we have
        }
        
        if (profilesData && profilesData.length > 0) {
          console.log(`Successfully fetched ${profilesData.length} profiles`);
          
          // Create a map for quick profile lookup
          // Define proper type for profile data
          interface ProfileWithEmail {
            id: string;
            first_name?: string;
            last_name?: string;
            email?: string;
            [key: string]: any; // For other fields we might not know about
          }
          
          // Create a map for quick profile lookup with proper typing
          const profilesMap = new Map<string, ProfileWithEmail>();
          
          // Populate the map with proper typing
          profilesData.forEach((profile: ProfileWithEmail) => {
            profilesMap.set(profile.id, profile);
          });
          
          // Attach profiles to task assignments
          const enhancedData = data.map(taskAssignment => {
            const profile = profilesMap.get(taskAssignment.assignee_id);
            return {
              ...taskAssignment,
              assignee: profile || null
            };
          });
          
              resolve(enhancedData as TaskAssignment[]);
              return;
        }
      } catch (profileErr) {
        console.error('Error in profile fetch:', profileErr);
        // Continue with what we have
      }
      
          resolve(data as TaskAssignment[]);
        } catch (err) {
          reject(err);
        }
      });
      
      // Set a timeout to prevent hanging requests
      const timeoutPromise = new Promise<TaskAssignment[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout fetching video submissions'));
        }, 8000); // 8 second timeout
      });
      
      // Use Promise.race to handle potential timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      return result;
    } catch (err) {
      console.error('Error fetching pending video submissions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending submissions';
      setError(new Error(errorMessage));
      // Don't show error toasts for database structure issues to prevent user confusion
      if (!(err instanceof Error) || !err.message.includes('column profiles_1.email does not exist')) {
        // Only show toast for non-timeout errors to avoid UI spam
        if (!(err instanceof Error) || !err.message.includes('Timeout fetching')) {
        toast.error(`Fehler beim Laden der Video-Chat-Anfragen: ${errorMessage}`);
        }
      }
      return [];
    } finally {
      setIsLoading(false);
      
      // Reset the fetching flag after a delay to prevent rapid re-fetches
      setTimeout(() => {
        isVideoFetchingRef.current = false;
      }, 1500);
    }
  }, [user]);
  
  /**
   * Admin function: Update demo test data for a task assignment
   * @param assignmentId ID of the task assignment to update
   * @param demoData Object containing demo data (email, password, etc.)
   */
  const updateDemoData = async (assignmentId: string, demoData: {
    demoEmail?: string;
    demoPassword?: string;
    identCode?: string;
    identUrl?: string;
    phoneNumberId?: string | null;
  }) => {
    if (!assignmentId) {
      console.error('Cannot update demo data: assignmentId is missing');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare update data
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      // Add fields that are provided
      if (demoData.demoEmail !== undefined) updateData.demo_email = demoData.demoEmail;
      if (demoData.demoPassword !== undefined) updateData.demo_password = demoData.demoPassword;
      if (demoData.identCode !== undefined) updateData.ident_code = demoData.identCode;
      if (demoData.identUrl !== undefined) updateData.ident_url = demoData.identUrl;
      if (demoData.phoneNumberId !== undefined) updateData.phone_number_id = demoData.phoneNumberId;
      
      // Also update the demo_data JSON field for backward compatibility
      updateData.demo_data = {
        email: demoData.demoEmail || '',
        password: demoData.demoPassword || '',
        identCode: demoData.identCode || '',
        identUrl: demoData.identUrl || '',
        phoneNumberId: demoData.phoneNumberId || null
      };

      const { data, error } = await supabase
        .from('task_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .select()
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      // Update local state if this is the current assignment
      if (assignmentId === lastAssignmentIdRef.current) {
        setTaskAssignment(prev => {
          if (!prev) return data as TaskAssignment;
          return { ...prev, ...updateData } as TaskAssignment;
        });
      }
      
      toast.success('Testdaten erfolgreich aktualisiert');
      return data as TaskAssignment;
    } catch (err) {
      console.error('Error updating demo data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update demo data';
      setError(new Error(errorMessage));
      toast.error(`Fehler beim Aktualisieren der Testdaten: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // The fetchPendingVideoSubmissions function has been moved above to fix duplicate declarations
  
  /**
   * Admin function: Assign a phone number to a task assignment
   * @param assignmentId ID of the task assignment
   * @param phoneNumberId ID of the phone number to assign
   */
  const assignPhoneNumber = async (assignmentId: string, phoneNumberId: string | null) => {
    if (!assignmentId) {
      console.error('Cannot assign phone number: assignmentId is missing');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          phone_number_id: phoneNumberId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      // Update local state if this is the current assignment
      if (assignmentId === lastAssignmentIdRef.current) {
        setTaskAssignment(prev => {
          if (!prev) return data as TaskAssignment;
          return { ...prev, phone_number_id: phoneNumberId } as TaskAssignment;
        });
      }
      
      toast.success('Telefonnummer erfolgreich zugewiesen');
      return data as TaskAssignment;
    } catch (err) {
      console.error('Error assigning phone number:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign phone number';
      setError(new Error(errorMessage));
      toast.error(`Fehler beim Zuweisen der Telefonnummer: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to changes in the task assignment
  useEffect(() => {
    if (!assignmentId || !user) return;
    
    // Set up real-time subscription if ID changes
    if (assignmentId !== lastAssignmentIdRef.current) {
      lastAssignmentIdRef.current = assignmentId;
      
      // Clean up any existing subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current.subscription);
        subscriptionRef.current = null;
      }
      
      // Start a new subscription
      console.log('Setting up real-time subscription for assignment:', assignmentId);
      const channelId = `task_assignment_${assignmentId}`;
      
      const subscription = supabase
        .channel(channelId)
        .on('postgres_changes', {
          event: '*', 
          schema: 'public', 
          table: 'task_assignments',
          filter: `id=eq.${assignmentId}`
        }, (payload) => {
          console.log('Real-time update received:', payload);
          fetchTaskAssignment();
        })
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });
      
      subscriptionRef.current = { subscription, channelId };
    }
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current.subscription);
        subscriptionRef.current = null;
      }
    };
  }, [assignmentId, fetchTaskAssignment, user]);
  
  // Fetch initial data
  useEffect(() => {
    if (assignmentId && initialRefresh && !initialFetchDoneRef.current && user) {
      console.log(`Fetching initial task assignment data for ID: ${assignmentId}`);
      fetchTaskAssignment();
      initialFetchDoneRef.current = true;
    }
    
    // Update refs on assignmentId change
    if (assignmentId !== lastAssignmentIdRef.current) {
      initialFetchDoneRef.current = false;
      hasLoadedRef.current = false;
    }
    
    if (!assignmentId) {
      // Reset state when assignmentId is undefined
      setTaskAssignment(null);
    }
  }, [assignmentId, fetchTaskAssignment, initialRefresh, user]);

  /**
   * Submit task for admin review
   */
  const submitTaskForReview = useCallback(async (submissionData: Record<string, any>) => {
    if (!assignmentId || !user) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          status: 'submitted' as TaskAssignmentStatus,
          submitted_at: new Date().toISOString(),
          submission_data: submissionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        // CRITICAL FIX: Also update the main task status
        if (data.task_id) {
          console.log(`🔄 Updating task status to submitted for task_id: ${data.task_id}`);
          const { error: taskError } = await supabase
            .from('tasks')
            .update({
              status: 'submitted',
              updated_at: new Date().toISOString()
            })
            .eq('id', data.task_id);
          
          if (taskError) {
            console.error('Error updating task status:', taskError);
            // Don't throw here - assignment was successful, just log the task update error
          } else {
            console.log('✅ Successfully updated both task_assignments and tasks status to submitted');
          }
        }
        
        setTaskAssignment(data as TaskAssignment);
        toast.success('Aufgabe erfolgreich eingereicht!');
        return data as TaskAssignment;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit task';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  /**
   * Admin function: Approve task submission
   */
  const approveTaskSubmission = useCallback(async (taskAssignmentId: string, adminNotes?: string) => {
    if (!user) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Update task assignment status to completed
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          status: 'completed' as TaskAssignmentStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskAssignmentId)
        .eq('status', 'submitted')
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        // Step 2: Create time entry for the approved task
        try {
          console.log(`Creating time entry for approved task: ${taskAssignmentId}`);
          const timeEntryResponse = await fetch('/api/time-entries/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskAssignmentId: taskAssignmentId,
              approvedBy: user.id
            })
          });

          if (!timeEntryResponse.ok) {
            const errorData = await timeEntryResponse.json();
            console.warn('Failed to create time entry:', errorData);
            // Don't throw here - the task approval was successful
            toast.error('Aufgabe genehmigt, aber Zeiterfassung fehlgeschlagen');
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

        return data as TaskAssignment;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve task';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Admin function: Reject task submission
   */
  const rejectTaskSubmission = useCallback(async (taskAssignmentId: string, rejectionReason: string, adminNotes?: string) => {
    if (!user) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          status: 'rejected' as TaskAssignmentStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskAssignmentId)
        .eq('status', 'submitted')
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        toast.success('Aufgabe abgelehnt.');
        return data as TaskAssignment;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject task';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Worker function: Restart rejected task
   */
  const restartRejectedTask = useCallback(async () => {
    if (!assignmentId || !user) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          status: 'pending' as TaskAssignmentStatus,
          current_step: 0,
          video_chat_status: 'not_started' as VideoChatStatus,
          document_step_completed: false,
          video_call_rating_completed: false,
          // Keep rejection data for audit trail but clear submission data
          submission_data: null,
          submitted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .eq('assignee_id', user.id)
        .eq('status', 'rejected')
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        // CRITICAL FIX: Also update the main task status
        if (data.task_id) {
          console.log(`🔄 Updating task status to pending for task_id: ${data.task_id}`);
          const { error: taskError } = await supabase
            .from('tasks')
            .update({
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', data.task_id);
          
          if (taskError) {
            console.error('Error updating task status:', taskError);
            // Don't throw here - assignment was successful, just log the task update error
          } else {
            console.log('✅ Successfully updated both task_assignments and tasks status to pending');
          }
        }
        
        setTaskAssignment(data as TaskAssignment);
        toast.success('Aufgabe wurde neu gestartet!');
        return data as TaskAssignment;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart task';
      setError(new Error(errorMessage));
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, user]);

  // Return hook values and functions
  return {
    taskAssignment,
    isLoading,
    error,
    fetchTaskAssignment,
    updateCurrentStep,
    completeTaskAssignment,
    updateVideoChatStatus,
    submitTaskRating,
    submitVideoCallRating,
    resetTaskAssignment,
    // Submission workflow functions
    submitTaskForReview,
    approveTaskSubmission,
    rejectTaskSubmission,
    restartRejectedTask,
    // Admin functions
    fetchPendingVideoSubmissions,
    updateDemoData,
    assignPhoneNumber
  };
}

export default useTaskAssignment;
