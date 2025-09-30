import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  Search, Filter, Clock, CheckCircle, AlertCircle, 
  Plus, Edit, Trash2, ExternalLink, RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTasksStats } from '../../hooks/useTasksStats';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Task } from '../../types/database';
import EditTaskModal from '../../components/admin/EditTaskModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import AnimatedButton from '../../components/ui/AnimatedButton';

// Status-Typen für Aufgaben
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

// Priorität-Typen für Aufgaben
const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Status-Labels für die Anzeige
const statusLabels = {
  [TaskStatus.PENDING]: 'Ausstehend',
  [TaskStatus.IN_PROGRESS]: 'In Bearbeitung',
  [TaskStatus.COMPLETED]: 'Abgeschlossen'
};

// Priorität-Labels für die Anzeige
const priorityLabels = {
  [TaskPriority.LOW]: 'Niedrig',
  [TaskPriority.MEDIUM]: 'Mittel',
  [TaskPriority.HIGH]: 'Hoch'
};

// Farben für Status
const statusColors = {
  [TaskStatus.PENDING]: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, darkBg: 'dark:bg-yellow-300', darkText: 'dark:text-yellow-900' },
  [TaskStatus.IN_PROGRESS]: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, darkBg: 'dark:bg-blue-300', darkText: 'dark:text-blue-900' },
  [TaskStatus.COMPLETED]: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, darkBg: 'dark:bg-green-300', darkText: 'dark:text-green-900' }
};

// Farben für Priorität
const priorityColors = {
  [TaskPriority.LOW]: { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-600', darkText: 'dark:text-gray-200' },
  [TaskPriority.MEDIUM]: { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-600', darkText: 'dark:text-blue-200' },
  [TaskPriority.HIGH]: { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-600', darkText: 'dark:text-red-200' }
};

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Use the new useTasksStats hook instead of useTasks
  const {
    tasks,
    loading,
    error,
    updateTask,
    deleteTask,
    fetchTasks
  } = useTasksStats();
  
  // Simple retry/refresh function
  const handleRetry = () => {
    fetchTasks(true); // Force refresh
  };

  const renderStatusIcon = (status: string, size: number, className: string) => {
    const IconComponent = statusColors[status]?.icon || AlertCircle;
    return <IconComponent size={size} className={className} />
  };

  const handleEditTask = async (id: string, taskData: Partial<Task>) => {
    try {
      await updateTask(id, taskData);
      setIsEditModalOpen(false);
      setSelectedTask(null);
      toast.success('Aufgabe erfolgreich aktualisiert');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setShowDeleteConfirm(false);
      setSelectedTask(null);
      toast.success('Aufgabe erfolgreich gelöscht');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  };

  // Gefilterte Aufgaben basierend auf der Suche
  const filteredTasks = tasks.filter(task => 
    (task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (task.id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aufgaben</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Verwalten Sie alle Aufgaben und weisen Sie sie Mitarbeitern zu.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mr-3">
              <Clock className="inline-block mr-1" size={16} />
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              disabled={loading}
              className="mr-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
            <Button
              leftIcon={<Plus size={16} />}
              size="md"
              onClick={() => navigate('/admin/task-templates/create')}
            >
              Neue Aufgabe
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Aufgabenliste</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full sm:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Filter size={16} />}
                >
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-6 rounded-lg flex flex-col items-center">
                <div className="flex items-center mb-4">
                  <AlertCircle className="mr-2" size={20} />
                  <p>Ein Fehler ist aufgetreten beim Laden der Aufgaben.</p>
                </div>
                <div className="mt-2">
                  <AnimatedButton
                    onClick={handleRetry}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2" size={16} />
                    Aufgaben neu laden
                  </AnimatedButton>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <motion.table 
                  className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Aufgabe
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Beschreibung
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Priorität
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Fälligkeitsdatum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          {searchTerm ? (
                            <p>Keine Aufgaben gefunden, die "{searchTerm}" entsprechen.</p>
                          ) : (
                            <p>Keine Aufgaben vorhanden. Erstellen Sie Ihre erste Aufgabe!</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <motion.tr key={task.id} variants={item}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white hover:text-accent dark:hover:text-accent-light cursor-pointer" onClick={() => navigate(`/admin/tasks/${task.id}`)}>
                              {task.title}
                              <ExternalLink size={12} className="inline ml-1" />
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{task.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="truncate max-w-[200px]">{task.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]?.bg || ''} ${priorityColors[task.priority]?.text || ''} ${priorityColors[task.priority]?.darkBg || ''} ${priorityColors[task.priority]?.darkText || ''}`}>
                              {priorityLabels[task.priority] || task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {task.due_date ? format(new Date(task.due_date), 'dd.MM.yyyy', { locale: de }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]?.bg || ''} ${statusColors[task.status]?.text || ''} ${statusColors[task.status]?.darkBg || ''} ${statusColors[task.status]?.darkText || ''}`}>
                              {renderStatusIcon(task.status, 12, "mr-1")}
                              {statusLabels[task.status] || task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<ExternalLink size={16} />}
                                onClick={() => navigate(`/admin/tasks/${task.id}`)}
                              >
                                Details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Edit size={16} />}
                                onClick={() => openEditModal(task)}
                              >
                                Bearbeiten
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Trash2 size={16} />}
                                onClick={() => openDeleteConfirm(task)}
                              >
                                Löschen
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </motion.table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditTask}
        task={selectedTask}
        isLoading={loading}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md mx-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aufgabe löschen
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Sind Sie sicher, dass Sie die Aufgabe "{selectedTask.title}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTask(null);
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteTask(selectedTask.id)}
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

export default React.memo(Tasks);
