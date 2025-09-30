import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskAssignment } from '../../hooks/useTaskAssignment';
import TaskDetail from '../../components/tasks/TaskDetail';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardContent } from '../../components/ui/Card';
import AnimatedButton from '../../components/ui/AnimatedButton';
import ShimmerEffect from '../../components/ui/ShimmerEffect';

const TaskDetailPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { taskAssignment, isLoading, error, restartRejectedTask } = useTaskAssignment(assignmentId);

  // Check if we need to redirect to flow page for document upload
  useEffect(() => {
    if (taskAssignment && !isLoading) {
      // Check if video chat is completed and document step is required but not completed
      if (
        taskAssignment.video_chat_status === 'completed' &&
        taskAssignment.document_step_required === true && 
        taskAssignment.document_step_completed === false
      ) {
        console.log('Video chat completed with pending document step, redirecting to flow');
        navigate(`/task-assignments/${assignmentId}/flow`);
      }
    }
  }, [taskAssignment, isLoading, assignmentId, navigate]);

  const handleStartTask = () => {
    if (assignmentId) {
      navigate(`/task-assignments/${assignmentId}/flow`);
    }
  };

  const handleBack = () => {
    navigate('/mitarbeiter/tasks');
  };

  const handleRestartRejectedTask = async () => {
    if (!taskAssignment) return;
    
    try {
      const result = await restartRejectedTask();
      if (result) {
        // Task was successfully restarted, navigate back to My Tasks view
        console.log('Task successfully restarted, navigating to My Tasks');
        navigate('/mitarbeiter/tasks');
      }
    } catch (error) {
      console.error('Error restarting rejected task:', error);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2" size={16} />
          Zurück zur Übersicht
        </Button>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle size={48} className="text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Fehler beim Laden der Aufgabe
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              {error.message || 'Die Aufgabe konnte nicht geladen werden.'}
            </p>
            <AnimatedButton
              variant="primary"
              size="md"
              onClick={handleBack}
            >
              Zurück zur Übersicht
            </AnimatedButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add loading indicator to prevent flash of task detail before redirect
  if (isLoading || (taskAssignment && 
      taskAssignment.video_chat_status === 'completed' && 
      taskAssignment.document_step_required === true && 
      taskAssignment.document_step_completed === false)) {
    return (
      <div className="p-6">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2" size={16} />
          Zurück zur Übersicht
        </Button>

        <div className="space-y-4">
          <ShimmerEffect className="h-8 w-1/3" />
          <Card>
            <CardContent className="p-6">
              <ShimmerEffect className="h-6 w-3/4 mb-4" />
              <ShimmerEffect className="h-4 w-full mb-3" />
              <ShimmerEffect className="h-4 w-full mb-3" />
              <ShimmerEffect className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button 
        variant="ghost" 
        className="mb-6"
        onClick={handleBack}
      >
        <ArrowLeft className="mr-2" size={16} />
        Zurück zur Übersicht
      </Button>

      {taskAssignment ? (
        <TaskDetail
          taskAssignment={taskAssignment}
          onStartTask={handleStartTask}
          onRestartTask={handleRestartRejectedTask}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aufgabe nicht gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Die angeforderte Aufgabe konnte nicht gefunden werden.
            </p>
            <AnimatedButton
              variant="primary"
              size="md"
              onClick={handleBack}
            >
              Zurück zur Übersicht
            </AnimatedButton>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskDetailPage;
