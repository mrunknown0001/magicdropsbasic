import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useEmployees } from '../../hooks/useEmployees';
import { Task } from '../../types/database';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ArrowLeft, Calendar, Clock, Edit, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import EditTaskModal from '../../components/admin/EditTaskModal';
import TaskComments from '../../components/admin/TaskComments';
import toast from 'react-hot-toast';

// Status-Labels für die Anzeige
const statusLabels = {
  'pending': 'Ausstehend',
  'in_progress': 'In Bearbeitung',
  'completed': 'Abgeschlossen'
};

// Priorität-Labels für die Anzeige
const priorityLabels = {
  'low': 'Niedrig',
  'medium': 'Mittel',
  'high': 'Hoch'
};

// Status-Farben
const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-300 dark:text-yellow-900',
  'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-300 dark:text-blue-900',
  'completed': 'bg-green-100 text-green-800 dark:bg-green-300 dark:text-green-900'
};

// Priorität-Farben
const priorityColors = {
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-blue-200',
  'high': 'bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-200'
};

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, loading, error, updateTask, deleteTask } = useTasks();
  const { employees } = useEmployees();
  const [task, setTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignee, setAssignee] = useState<string>('');

  useEffect(() => {
    if (tasks.length > 0 && id) {
      const foundTask = tasks.find(t => t.id === id);
      if (foundTask) {
        setTask(foundTask);
        
        // Find assignee name
        if (foundTask.assignee_id) {
          const assignedEmployee = employees.find(e => e.id === foundTask.assignee_id);
          if (assignedEmployee) {
            setAssignee(assignedEmployee.name || assignedEmployee.email || assignedEmployee.id);
          }
        }
      } else {
        // Task not found
        toast.error('Aufgabe nicht gefunden');
        navigate('/admin/tasks');
      }
    }
  }, [tasks, id, employees, navigate]);

  const handleEditTask = async (taskId: string, data: Partial<Task>) => {
    try {
      await updateTask(taskId, data);
      setIsEditModalOpen(false);
      toast.success('Aufgabe erfolgreich aktualisiert');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    try {
      await deleteTask(task.id);
      toast.success('Aufgabe erfolgreich gelöscht');
      navigate('/admin/tasks');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Ein Fehler ist aufgetreten beim Laden der Aufgabe.
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Aufgabe nicht gefunden.</p>
        <Button onClick={() => navigate('/admin/tasks')}>
          Zurück zur Aufgabenliste
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/tasks')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Zurück zur Aufgabenliste
          </Button>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              leftIcon={<Edit size={16} />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Bearbeiten
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Löschen
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>{task.title}</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ID: {task.id}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                  <Clock size={12} className="mr-1" />
                  {statusLabels[task.status]}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Beschreibung</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {task.description || 'Keine Beschreibung vorhanden.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Details</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                    {task.assignee_id && (
                      <div className="flex items-center">
                        <User size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Zugewiesen an: {assignee}
                        </span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center">
                        <Calendar size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Fällig am: {format(new Date(task.due_date), 'dd. MMMM yyyy', { locale: de })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock size={16} className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        Erstellt am: {format(new Date(task.created_at), 'dd. MMMM yyyy, HH:mm', { locale: de })}
                      </span>
                    </div>
                    {task.updated_at && task.updated_at !== task.created_at && (
                      <div className="flex items-center">
                        <Clock size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          Aktualisiert am: {format(new Date(task.updated_at), 'dd. MMMM yyyy, HH:mm', { locale: de })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <TaskComments taskId={task.id} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditTask}
        task={task}
        isLoading={loading}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md mx-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aufgabe löschen
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Sind Sie sicher, dass Sie die Aufgabe "{task.title}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTask}
                isLoading={loading}
              >
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskDetails;
