import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskAssignment } from '../../hooks/useTaskAssignment';
import { TaskRating, TaskAssignment } from '../../types/database';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

// Import all task flow components
import TaskDetail from './TaskDetail';
import TaskInstructions from './TaskInstructions';
import TaskRatingForm from './TaskRatingForm';
import VideoCallDecision from './VideoCallDecision';
import VideoCallAccepted from './VideoCallAccepted';
import VideoCallDeclined from './VideoCallDeclined';
import LoadingSpinner from '../ui/LoadingSpinner';
import DocumentUploadStep from './DocumentUploadStep';
import VideoCallRatingForm from './VideoCallRatingForm';

// Define the possible flow steps
enum FlowStep {
  DETAILS = 'details',
  INSTRUCTIONS = 'instructions',
  RATING = 'rating',
  VIDEO_DECISION = 'video_decision',
  VIDEO_ACCEPTED = 'video_accepted',
  VIDEO_DECLINED = 'video_declined',
  VIDEO_CALL_RATING = 'video_call_rating',
  DOCUMENT_UPLOAD = 'document_upload',
  COMPLETED = 'completed'
}

const TaskFlow: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get the user from auth context
  const { 
    taskAssignment, 
    isLoading, 
    error, 
    fetchTaskAssignment, 
    updateCurrentStep, 
    updateVideoChatStatus, 
    submitTaskRating,
    submitVideoCallRating,
    restartRejectedTask
  } = useTaskAssignment(assignmentId);
  
  // Set up auto-refresh interval for video chat accepted state
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refresh function to fetch the latest task assignment data
  const refreshData = async () => {
    console.log('Refreshing task assignment data for ID:', assignmentId);
    if (!assignmentId) {
      console.error('Cannot refresh: No assignment ID available');
      return;
    }
    
    try {
      // Use the fetchTaskAssignment function from the hook to get latest data
      const freshData = await fetchTaskAssignment();
      console.log('Fresh task data fetched:', freshData);
      
      // If we got back data, check if video chat is accepted
      if (freshData && freshData.video_chat_status === 'accepted') {
        console.log('Video chat status is accepted, showing accepted view');
        setCurrentFlowStep(FlowStep.VIDEO_ACCEPTED);
        
        // If this task has a phone number assigned, check for new messages
        if (freshData.phone_number_id) {
          console.log('Task has phone number assigned:', freshData.phone_number_id);
        }
      } else if (freshData) {
        console.log('Task data refreshed but video_chat_status is:', freshData.video_chat_status);
        
        // Determine the current flow step based on the fresh data
        if (freshData.current_step === 0) {
          setCurrentFlowStep(FlowStep.DETAILS);
        } else if (freshData.current_step > 0 && freshData.video_chat_status === 'not_started') {
          setCurrentFlowStep(FlowStep.INSTRUCTIONS);
        }
      } else {
        console.log('No fresh data returned from fetchTaskAssignment');
      }
    } catch (error) {
      console.error('Error refreshing task assignment data:', error);
      toast.error('Fehler beim Aktualisieren der Daten');
    }
  };

  // Initialize flow step based on task state, defaulting to DETAILS
  const getInitialFlowStep = (assignment: TaskAssignment | null): FlowStep => {
    if (!assignment) return FlowStep.DETAILS;
    
    // Handle completed tasks
    if (assignment.status === 'completed') {
      return FlowStep.COMPLETED;
    }
    
    // For platzhalter and andere types, skip document and video steps
    const templateType = assignment.task_template?.type;
    const isSimpleType = templateType === 'platzhalter' || templateType === 'andere' || templateType === 'other';
    
    // Check if video chat is completed but rating is not done yet
    if (!isSimpleType && 
        assignment.video_chat_status === 'completed' && 
        assignment.video_call_rating_completed !== true) {
      return FlowStep.VIDEO_CALL_RATING;
    }
    
    // Document step is only for non-simple types
    if (!isSimpleType && 
        assignment.document_step_required && 
        !assignment.document_step_completed && 
        assignment.video_chat_status === 'completed' &&
        assignment.video_call_rating_completed === true) {
      return FlowStep.DOCUMENT_UPLOAD;
    }
    
    // Handle video chat status - these take precedence over current_step (only for non-simple types)
    if (!isSimpleType) {
      const videoStatus = assignment.video_chat_status as string;
      
      if (videoStatus === 'accepted') {
        return FlowStep.VIDEO_ACCEPTED;
      } else if (videoStatus === 'declined') {
        return FlowStep.VIDEO_DECLINED;
      }
    }

    // Determine flow step based on current_step and video_chat_status
    if (assignment.current_step === 0) {
      return FlowStep.DETAILS;
    } else if (assignment.current_step > 0 && 
              (isSimpleType || assignment.video_chat_status === 'not_started')) {
      if (assignment.current_step < (assignment.task_template?.steps?.length || 0)) {
        return FlowStep.INSTRUCTIONS;
      } else {
        return FlowStep.RATING;
      }
    }
    
    return FlowStep.DETAILS;
  };

  const [currentFlowStep, setCurrentFlowStep] = useState<FlowStep>(() => getInitialFlowStep(taskAssignment));

  // Determine the current flow step based on task assignment state
  // Debug logging
  useEffect(() => {
    console.log('TaskFlow component mounted or updated with assignmentId:', assignmentId);
    console.log('Current taskAssignment state:', taskAssignment);
    console.log('Current flow step:', currentFlowStep);
    
    if (error) {
      // Don't log empty objects as they don't provide useful information
      if (Object.keys(error).length > 0 || error instanceof Error) {
        console.error('TaskFlow error:', error);
      }
    }
  }, [assignmentId, taskAssignment, currentFlowStep, error]);
  
  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      console.log('TaskFlow component unmounting, cleaning up');
      // Clear the auto-refresh interval on unmount
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, []);
  
  // If task assignment is null but we have an assignmentId, try to load it just once
  const hasAttemptedLoadRef = useRef(false);
  useEffect(() => {
    if (assignmentId && !taskAssignment && !isLoading && !hasAttemptedLoadRef.current) {
      console.log('No task assignment loaded, attempting to fetch...');
      hasAttemptedLoadRef.current = true;
      
      fetchTaskAssignment().then(result => {
        if (!result) {
          console.log('Failed to fetch task assignment on initial load');
        }
      });
    }
  }, [assignmentId, taskAssignment, isLoading, fetchTaskAssignment]);
  
  // Reset the attempt flag when assignment ID changes
  useEffect(() => {
    hasAttemptedLoadRef.current = false;
  }, [assignmentId]);

  const prevAssignmentRef = useRef<TaskAssignment | null>(null);
  
  useEffect(() => {
    if (!taskAssignment) {
      console.log('No task assignment data available');
      return;
    }
    
    // Skip if this is the same assignment data as before
    if (prevAssignmentRef.current && 
        JSON.stringify(prevAssignmentRef.current) === JSON.stringify(taskAssignment)) {
      console.log('Task assignment unchanged, skipping flow step update');
      return;
    }
    
    // Skip if we're in the middle of a manual flow change (like starting a task)
    if (manualFlowChangeRef.current) {
      console.log('Manual flow change in progress, skipping automatic flow step determination');
      return;
    }
    
    // Update the previous assignment ref
    prevAssignmentRef.current = taskAssignment;

    console.log('Determining flow step based on task assignment state:', taskAssignment);
    console.log('Current video_chat_status:', taskAssignment.video_chat_status);
    console.log('Video call rating completed:', taskAssignment.video_call_rating_completed);
    console.log('Document step required:', taskAssignment.document_step_required);
    console.log('Document step completed:', taskAssignment.document_step_completed);
    
    // Determine the correct flow step using the same logic as initialization
    const correctFlowStep = getInitialFlowStep(taskAssignment);
    console.log('Setting flow step to:', correctFlowStep);
    setCurrentFlowStep(correctFlowStep);
  }, [taskAssignment]);

  // Handler functions for various flow transitions
  // Use a ref to track if an action is in progress to prevent double-clicks
  const actionInProgressRef = useRef(false);
  // Add a ref to track manual flow changes that should not be overridden by the useEffect
  const manualFlowChangeRef = useRef(false);
  
  const handleStartTask = async () => {
    // Prevent double-clicks and rapid button presses
    if (actionInProgressRef.current) {
      console.log('Action already in progress, ignoring additional click');
      return;
    }
    
    console.log('handleStartTask called, current step:', currentFlowStep);
    try {
      // Set action in progress flag
      actionInProgressRef.current = true;
      
      if (!taskAssignment) {
        console.error('Cannot proceed: taskAssignment is null');
        toast.error('Fehler: Aufgabendaten nicht verfügbar');
        actionInProgressRef.current = false;
        return;
      }
      
      // Mark this as a manual flow change to prevent useEffect from overriding it
      manualFlowChangeRef.current = true;
      
      // First update the UI to provide immediate feedback
      setCurrentFlowStep(FlowStep.INSTRUCTIONS);
      
      // Then update the database in the background (don't block UI)
      console.log('Updating current step to 1...');
      updateCurrentStep(1).then(result => {
        console.log('updateCurrentStep background result:', result);
        // Reset the manual flow change flag after database update completes
        setTimeout(() => {
          manualFlowChangeRef.current = false;
        }, 1000);
      }).catch(err => {
        // Just log the error but don't interrupt the flow
        console.error('Background step update failed:', err);
        // Reset the manual flow change flag on error too
        manualFlowChangeRef.current = false;
      }).finally(() => {
        // Allow new actions after a short delay
        setTimeout(() => {
          actionInProgressRef.current = false;
        }, 500);
      });
    } catch (error) {
      console.error('Error starting task:', error);
      toast.error('Fehler beim Starten der Aufgabe');
      // Still proceed to instructions on error
      setCurrentFlowStep(FlowStep.INSTRUCTIONS);
      actionInProgressRef.current = false;
      manualFlowChangeRef.current = false;
    }
  };

  const handleNextInstruction = async () => {
    if (!taskAssignment) return;
    const nextStep = taskAssignment.current_step + 1;
    const totalSteps = taskAssignment.task_template?.steps?.length || 0;
    
    if (nextStep <= totalSteps) {
      try {
        await updateCurrentStep(nextStep);
        setCurrentFlowStep(FlowStep.INSTRUCTIONS);
      } catch (error) {
        console.error('Error navigating to next instruction:', error);
        toast.error('Fehler beim Navigieren zum nächsten Anweisung');
      }
    } else {
      setCurrentFlowStep(FlowStep.RATING);
    }
  };

  const handlePreviousInstruction = async () => {
    if (!taskAssignment || taskAssignment.current_step <= 1) return;
    try {
      await updateCurrentStep(taskAssignment.current_step - 1);
    } catch (error) {
      console.error('Error navigating to previous instruction:', error);
      toast.error('Fehler beim Navigieren zur vorherigen Anweisung');
    }
  };

  const handleSubmitRating = async (ratingData: Omit<TaskRating, 'id' | 'created_at'>) => {
    if (!taskAssignment) return;
    
    await submitTaskRating(ratingData);
    
    // Check template type - if 'platzhalter' or 'andere', complete task directly
    if (taskAssignment.task_template?.type === 'platzhalter' || 
        taskAssignment.task_template?.type === 'andere' || 
        taskAssignment.task_template?.type === 'other') {
      try {
        console.log('Task type is platzhalter/andere/other, marking as completed directly.');
        
        // Update task status to completed
        const { error } = await supabase
          .from('task_assignments')
          .update({ status: 'completed' })
          .eq('id', taskAssignment.id);
          
        if (error) throw error;
        
        // Refresh task data
        await fetchTaskAssignment();
        setCurrentFlowStep(FlowStep.COMPLETED);
        toast.success('Aufgabe erfolgreich abgeschlossen!');
      } catch (error) {
        console.error('Error completing task:', error);
        toast.error('Fehler beim Abschließen der Aufgabe');
      }
    } else {
      // For bankdrop and exchanger, proceed to video decision as normal
      setCurrentFlowStep(FlowStep.VIDEO_DECISION);
    }
  };

  const handleAcceptVideoCall = async () => {
    if (!taskAssignment) {
      console.error('Cannot accept video chat: no task assignment available');
      toast.error('Fehler: Aufgabe nicht gefunden');
      return;
    }
    
    console.log('Accepting video chat for task:', taskAssignment.id);
    try {
      // Mark this as a manual flow change to prevent useEffect from overriding it
      manualFlowChangeRef.current = true;
      
      // First update the UI immediately to provide feedback
      setCurrentFlowStep(FlowStep.VIDEO_ACCEPTED);
      
      // CRITICAL FIX: Use 'accepted' to match database schema
      console.log('Sending status update to database...');
      const result = await updateVideoChatStatus('accepted');
      console.log('Video chat status update result:', result);
      
      if (result) {
        console.log('Successfully updated video chat status to started');
        
        // Set up auto-refresh for checking demo data
        // Clear any existing interval first
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
        }
        
        // Auto-refresh every 30 seconds
        autoRefreshIntervalRef.current = setInterval(() => {
          console.log('Auto-refreshing data...');
          refreshData();
        }, 30000); // 30 seconds
        
        // Do an immediate refresh
        console.log('Doing immediate refresh...');
        await refreshData();
        
        // Show success message to user
        toast.success('Video-Chat akzeptiert!');
      } else {
        console.error('Failed to update video chat status - null result received');
        throw new Error('Failed to update video chat status');
      }
    } catch (err) {
      console.error('Error accepting video chat:', err);
      toast.error('Fehler beim Akzeptieren des Video-Chats');
      // Still proceed to video accepted view for better UX
      setCurrentFlowStep(FlowStep.VIDEO_ACCEPTED);
    } finally {
      // Reset the manual flow change flag after the operation completes
      setTimeout(() => {
        manualFlowChangeRef.current = false;
      }, 1000);
    }
  };

  const handleCompleteVideoChat = async () => {
    if (!taskAssignment) return;
    
    try {
      // Mark this as a manual flow change
      manualFlowChangeRef.current = true;
      
      console.log('Completing video chat for task:', taskAssignment.id);
      console.log('Current video_chat_status:', taskAssignment.video_chat_status);
      console.log('Current video_call_rating_completed:', taskAssignment.video_call_rating_completed);
      
      // Update video chat status to completed
      const { error } = await supabase
        .from('task_assignments')
        .update({ 
          video_chat_status: 'completed'
        })
        .eq('id', taskAssignment.id);
        
      if (error) throw error;
      
      // Get fresh task data after update
      const updatedTask = await fetchTaskAssignment();
      console.log('Task updated, new state:', updatedTask);
      console.log('Moving to VIDEO_CALL_RATING step');
      
      // Transition to video call rating step
      setCurrentFlowStep(FlowStep.VIDEO_CALL_RATING);
      toast.success('Video-Chat abgeschlossen. Bitte bewerte deine Erfahrung.');
      
    } catch (error) {
      console.error('Error completing video chat:', error);
      toast.error('Fehler beim Abschließen des Video-Chats');
    } finally {
      // Reset the manual flow change flag
      setTimeout(() => {
        manualFlowChangeRef.current = false;
      }, 1000);
    }
  };

  // Handle video call rating submission
  const handleSubmitVideoCallRating = async (ratingData: any) => {
    try {
      // Mark this as a manual flow change
      manualFlowChangeRef.current = true;
      
      console.log('Submitting video call rating with data:', ratingData);
      console.log('Current task assignment state:', taskAssignment);
      
      // Call the hook's submitVideoCallRating function
      const result = await submitVideoCallRating(ratingData);
      
      if (!result) {
        throw new Error('Failed to submit video call rating');
      }
      
      console.log('Video call rating submitted successfully, result:', result);
      console.log('Updated video_call_rating_completed:', result.video_call_rating_completed);
      
      // Now proceed to document upload or complete the task based on document_step_required
      if (taskAssignment?.document_step_required) {
        console.log('Document step is required, moving to DOCUMENT_UPLOAD');
        setCurrentFlowStep(FlowStep.DOCUMENT_UPLOAD);
        toast.success('Bitte laden Sie nun die erforderlichen Dokumente hoch.');
      } else {
        console.log('No document step required, submitting task for review');
        
        // Collect submission data
        const submissionData = {
          completed_at: new Date().toISOString(),
          document_step_completed: false, // No document step required
          video_chat_status: taskAssignment.video_chat_status,
          video_call_rating_completed: true,
          video_call_rating_data: ratingData,
          demo_data: taskAssignment.demo_data
        };
        
        // Submit task for admin review instead of marking as completed
        const { error: submitError } = await supabase
          .from('task_assignments')
          .update({ 
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            submission_data: submissionData
          })
          .eq('id', taskAssignment?.id || '');
          
        if (submitError) {
          throw new Error(submitError.message);
        }
        
        // CRITICAL FIX: Also update the main task status
        if (taskAssignment?.task_id) {
          console.log(`🔄 Updating task status to submitted for task_id: ${taskAssignment.task_id}`);
          const { error: taskError } = await supabase
            .from('tasks')
            .update({
              status: 'submitted',
              updated_at: new Date().toISOString()
            })
            .eq('id', taskAssignment.task_id);
          
          if (taskError) {
            console.error('Error updating task status:', taskError);
            // Don't throw here - assignment was successful, just log the task update error
          } else {
            console.log('✅ Successfully updated both task_assignments and tasks status to submitted');
          }
        }
        
        await fetchTaskAssignment();
        setCurrentFlowStep(FlowStep.COMPLETED);
        toast.success('Aufgabe erfolgreich eingereicht! Sie wird nun von einem Administrator geprüft.');
      }
    } catch (error) {
      console.error('Error submitting video call rating:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Fehler: ${errorMessage}`);
    } finally {
      // Reset the manual flow change flag
      setTimeout(() => {
        manualFlowChangeRef.current = false;
      }, 1000);
    }
  };

  const handleDeclineVideoCall = async () => {
    if (!taskAssignment) return;
    
    console.log('Declining video chat...');
    try {
      const result = await updateVideoChatStatus('declined');
      console.log('Video chat status update result:', result);
      
      if (result) {
        setCurrentFlowStep(FlowStep.VIDEO_DECLINED);
        
        // Also refresh the task assignment data to ensure we have the latest state
        await fetchTaskAssignment();
      } else {
        throw new Error('Failed to update video chat status');
      }
    } catch (err) {
      console.error('Error declining video chat:', err);
      toast.error('Fehler beim Ablehnen des Video-Chats');
      // Still proceed to video declined view for better UX
      setCurrentFlowStep(FlowStep.VIDEO_DECLINED);
    }
  };

  const handleTaskRestart = async () => {
    if (!taskAssignment) return;
    
    // Instead of resetting, update the current step to 0 and video chat status to not_started
    try {
      await updateCurrentStep(0);
      await updateVideoChatStatus('not_started');
      await fetchTaskAssignment();
      setCurrentFlowStep(FlowStep.DETAILS);
      toast.success('Die Aufgabe wurde neu gestartet.');
    } catch (error) {
      console.error('Error restarting task:', error);
      toast.error('Fehler beim Neustarten der Aufgabe');
    }
  };

  const handleRestartRejectedTask = async () => {
    if (!taskAssignment) return;
    
    try {
      const result = await restartRejectedTask();
      if (result) {
        await fetchTaskAssignment();
        setCurrentFlowStep(FlowStep.DETAILS);
        toast.success('Aufgabe wurde erfolgreich neu gestartet!');
      }
    } catch (error) {
      console.error('Error restarting rejected task:', error);
      toast.error('Fehler beim Neustarten der abgelehnten Aufgabe');
    }
  };

  const handleDocumentStepComplete = async () => {
    if (!taskAssignment) return;
    
    try {
      console.log('Submitting task for admin review:', taskAssignment.id);
      
      // Collect submission data
      const submissionData = {
        completed_at: new Date().toISOString(),
        document_step_completed: true,
        video_chat_status: taskAssignment.video_chat_status,
        video_call_rating_completed: taskAssignment.video_call_rating_completed,
        video_call_rating_data: taskAssignment.video_call_rating_data,
        demo_data: taskAssignment.demo_data
      };
      
      // Update the task assignment to submit for review
      const { error } = await supabase
        .from('task_assignments')
        .update({ 
          document_step_completed: true,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submission_data: submissionData
        })
        .eq('id', taskAssignment.id);
        
      if (error) throw error;
      
      // CRITICAL FIX: Also update the main task status
      if (taskAssignment?.task_id) {
        console.log(`🔄 Updating task status to submitted for task_id: ${taskAssignment.task_id}`);
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            status: 'submitted',
            updated_at: new Date().toISOString()
          })
          .eq('id', taskAssignment.task_id);
        
        if (taskError) {
          console.error('Error updating task status:', taskError);
          // Don't throw here - assignment was successful, just log the task update error
        } else {
          console.log('✅ Successfully updated both task_assignments and tasks status to submitted');
        }
      }
      
      // Refresh task assignment data
      await fetchTaskAssignment();
      
      // Move to completed state (shows submission confirmation)
      setCurrentFlowStep(FlowStep.COMPLETED);
      
      toast.success('Aufgabe erfolgreich eingereicht! Sie wird nun von einem Administrator geprüft.');
    } catch (error) {
      console.error('Error submitting task for review:', error);
      toast.error('Fehler beim Einreichen der Aufgabe');
    }
  };

  // Removed unused handleBackToRating function

  const handleBackToTasks = () => {
    navigate('/tasks');
  };
  
  // Error handler with retry option
  const handleRetry = () => {
    if (assignmentId) {
      console.log('Retrying task assignment fetch...');
      fetchTaskAssignment();
    }
  };
  
  // Show loading state
  if (isLoading && !taskAssignment) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </p>
          </div>
          <div className="ml-auto pl-3">
            <button
              type="button"
              className="bg-red-100 text-red-500 hover:bg-red-200 px-3 py-1 rounded-md"
              onClick={handleRetry}
            >
              Wiederholen
            </button>
          </div>
        </div>
        <button 
          onClick={() => fetchTaskAssignment()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Show message if task assignment not found
  if (!taskAssignment) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg text-center max-w-2xl mx-auto my-8">
        <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
          Aufgabe nicht gefunden
        </h2>
        <p className="text-yellow-600 dark:text-yellow-300 mb-4">
          Die angeforderte Aufgabe konnte nicht gefunden werden oder Sie haben keine Berechtigung, darauf zuzugreifen.
        </p>
        <button 
          onClick={handleBackToTasks}
          className="inline-flex items-center px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap min-w-[220px] justify-center"
        >
          <span>Zurück zu meinen Aufträgen</span>
        </button>
      </div>
    );
  }

  // Render the appropriate component based on current flow step
  return (
    <div className="container mx-auto px-4 py-8">
      {currentFlowStep === FlowStep.DETAILS && (
        <TaskDetail 
          taskAssignment={taskAssignment} 
          isLoading={isLoading}
          onStartTask={handleStartTask}
          onRestartTask={handleRestartRejectedTask}
        />
      )}

      {currentFlowStep === FlowStep.INSTRUCTIONS && (
        <TaskInstructions 
          taskAssignment={taskAssignment}
          isLoading={isLoading}
          onNextStep={handleNextInstruction}
          onPreviousStep={handlePreviousInstruction}
          onBack={() => setCurrentFlowStep(FlowStep.DETAILS)}
        />
      )}

      {currentFlowStep === FlowStep.RATING && (
        <TaskRatingForm 
          taskAssignment={taskAssignment}
          onSubmit={handleSubmitRating}
          onBack={handlePreviousInstruction}
        />
      )}

      {currentFlowStep === FlowStep.VIDEO_DECISION && (
        <VideoCallDecision 
          taskAssignment={taskAssignment}
          onAccept={handleAcceptVideoCall}
          onDecline={handleDeclineVideoCall}
          isLoading={isLoading}
        />
      )}

      {currentFlowStep === FlowStep.VIDEO_ACCEPTED && (
        <VideoCallAccepted 
          taskAssignment={taskAssignment}
          onRefresh={refreshData}
          onCompleteVideoChat={handleCompleteVideoChat}
          isLoading={isLoading}
          isAdminView={false}
        />
      )}

      {currentFlowStep === FlowStep.VIDEO_DECLINED && (
        <VideoCallDeclined 
          taskAssignment={taskAssignment}
          onRestart={handleTaskRestart}
          isLoading={isLoading}
        />
      )}
      
      {currentFlowStep === FlowStep.VIDEO_CALL_RATING && (
        <VideoCallRatingForm 
          taskAssignment={taskAssignment}
          onSubmit={handleSubmitVideoCallRating}
          onBack={() => {
            // Go back to the video accepted step if the user wants to change something
            setCurrentFlowStep(FlowStep.VIDEO_ACCEPTED);
          }}
        />
      )}

      {currentFlowStep === FlowStep.DOCUMENT_UPLOAD && (
        <DocumentUploadStep
          taskAssignment={taskAssignment}
          onComplete={handleDocumentStepComplete}
          onBack={() => navigate('/mitarbeiter/tasks')}
        />
      )}

      {currentFlowStep === FlowStep.COMPLETED && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-5xl text-green-500 mb-4">✅</div>
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
            Aufgabe erfolgreich abgeschlossen!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Vielen Dank für deine Arbeit.
          </p>
                  <Button 
            onClick={() => navigate('/mitarbeiter/tasks')}
            className="inline-flex items-center px-8 py-2 whitespace-nowrap min-w-[200px] justify-center"
          >
            <span>Zurück zur Aufgabenliste</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default TaskFlow;
