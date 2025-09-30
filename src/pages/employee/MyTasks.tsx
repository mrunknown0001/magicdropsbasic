import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Search, Clock, CheckCircle, AlertCircle, RefreshCw, FileText, Briefcase, Filter, Video, ChevronDown, Upload } from 'lucide-react';
import { FiCalendar, FiTrendingUp, FiActivity, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { TaskAssignment } from '../../types/database';
import ShimmerEffect from '../../components/ui/ShimmerEffect';
import AnimatedButton from '../../components/ui/AnimatedButton';
import Button from '../../components/ui/Button';
import { useMyTasksStats } from '../../hooks/useMyTasksStats';
import { useSettingsContext } from '../../context/SettingsContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import KycVerificationPrompt from '../../components/common/KycVerificationPrompt';
import KycGate from '../../components/common/KycGate';

// Mapping for status display
const statusMap = {
  'pending': { label: 'Ausstehend', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'AlertCircle', darkBg: 'dark:bg-yellow-300', darkText: 'dark:text-yellow-900' },
  'in_progress': { label: 'In Bearbeitung', bg: 'bg-blue-100', text: 'text-blue-800', icon: 'Clock', darkBg: 'dark:bg-blue-300', darkText: 'dark:text-blue-900' },
  'completed': { label: 'Abgeschlossen', bg: 'bg-green-100', text: 'text-green-800', icon: 'CheckCircle', darkBg: 'dark:bg-green-300', darkText: 'dark:text-green-900' }
};

// Mapping for priority display
const priorityMap = {
  'low': 'Niedrig',
  'medium': 'Mittel',
  'high': 'Hoch'
};

// Icon map for status display
const iconMap = {
  'Clock': Clock,
  'CheckCircle': CheckCircle,
  'AlertCircle': AlertCircle
};

const MyTasks: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { profile, isTaskBasedUser } = useAuth();
  const { colors } = useSettingsContext();
  
  // Use our new stats hook
  const {
    tasks,
    taskAssignments,
    loading,
    loadingAssignments,
    error,
    isKycBlocked,
    fetchTasks,
    formatDate,
    getAssignmentStatusDisplay
  } = useMyTasksStats();
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchTasks(true); // Force refresh
  };
  
  // Navigate to task assignment flow
  const navigateToTaskFlow = (assignmentId: string) => {
    navigate(`/task-assignments/${assignmentId}/flow`);
  };

  // Navigate to task assignment details
  const navigateToTaskDetail = (assignmentId: string) => {
    navigate(`/task-assignments/${assignmentId}`);
  };
  
  // Filtered and sorted tasks based on search and priority
  const filteredTasks = useMemo(() => {
    // Helper function to get the priority of task status for sorting
    const getTaskStatusPriority = (task: any) => {
      const assignments = taskAssignments[task.id] || [];
      
      // If no assignments, treat as pending
      if (assignments.length === 0) {
        return 2; // pending priority
      }
      
      // Check the status of all assignments for this task
      const hasRejected = assignments.some(a => a.status === 'rejected');
      const hasInProgress = assignments.some(a => a.current_step > 0 && a.status === 'pending');
      const hasSubmitted = assignments.some(a => a.status === 'submitted');
      const allCompleted = assignments.length > 0 && assignments.every(a => a.status === 'completed');
      
      // Priority order: unfinished/rejected/in-progress (1) > pending (2) > completed (3)
      if (hasRejected || hasInProgress) {
        return 1; // highest priority - needs attention
      } else if (hasSubmitted) {
        return 1.5; // submitted - waiting for review
      } else if (allCompleted) {
        return 3; // lowest priority - completed
      } else {
        return 2; // pending - medium priority
      }
    };

    // Filter tasks based on search term
    const filtered = tasks.filter(task => 
      (task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.client?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // Sort by priority, then by creation date (newest first)
    return filtered.sort((a, b) => {
      const priorityA = getTaskStatusPriority(a);
      const priorityB = getTaskStatusPriority(b);
      
      // First sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, searchTerm, taskAssignments]);
  
  // Animation variants
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

  // Show error state
  if (error) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Meine Aufträge</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
                Verwalten Sie Ihre aktuellen Aufträge und sehen Sie Ihren Fortschritt ein.
              </p>
            </div>
          </div>
        </motion.div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 mb-6 shadow-sm"
          >
            <div className="flex items-center mb-4">
              <AlertCircle className="mr-2" size={20} />
              <p className="font-app">Fehler beim Laden der Dashboard-Daten.</p>
            </div>
            <div className="mt-2">
              <AnimatedButton
                onClick={handleRefresh}
                variant="danger"
                icon={<RefreshCw size={16} />}
                disabled={loading}
              >
                Daten neu laden
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Show KYC gate if blocked - use consistent styling
  if (isKycBlocked) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Meine Aufträge</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
                Verwalten Sie Ihre aktuellen Aufträge und sehen Sie Ihren Fortschritt ein.
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Use the same KycGate component for consistency */}
        <KycGate 
          profile={profile} 
          settings={null} 
          mode="prompt"
        >
          <div></div>
        </KycGate>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <ShimmerEffect width="250px" height="32px" className="mb-2" />
              <ShimmerEffect width="350px" height="20px" />
            </div>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <ShimmerEffect width="40px" height="40px" borderRadius="9999px" className="mr-3" />
                  <div className="flex-1">
                    <ShimmerEffect width="80%" height="24px" className="mb-2" />
                    <ShimmerEffect width="60%" height="16px" />
                  </div>
                  <ShimmerEffect width="80px" height="24px" borderRadius="9999px" />
                </div>
                <div className="space-y-3">
                  <ShimmerEffect width="100%" height="16px" />
                  <ShimmerEffect width="70%" height="16px" />
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <ShimmerEffect width="50%" height="16px" className="mb-2" />
                    <ShimmerEffect width="100%" height="40px" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white">Meine Aufträge</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 font-app">
              Verwalten Sie Ihre aktuellen Aufträge und sehen Sie Ihren Fortschritt ein.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="relative w-full md:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Suchen..."
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-md w-full md:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-app shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <FileText className="text-gray-500 dark:text-gray-400" size={28} />
          </div>
          <h3 className="text-xl font-app font-app-medium text-gray-900 dark:text-white mb-2">Keine Aufträge gefunden</h3>
          <p className="text-gray-600 dark:text-gray-300 font-app max-w-md mx-auto">
            Es wurden keine Aufträge gefunden, die Ihren Suchkriterien entsprechen.
          </p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredTasks.map((task) => {
            const assignments = taskAssignments[task.id] || [];
            const isLoading = loadingAssignments[task.id] || false;
            const statusInfo = statusMap[task.status] || statusMap.pending;
            const StatusIcon = iconMap[statusInfo.icon as keyof typeof iconMap] || AlertCircle;
            
            return (
              <motion.div key={task.id} variants={item}>
                <div className="h-full">
                  <div className={`relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 hover:shadow-lg ${task.status === 'completed' ? 'border-l-4 border-l-green-400 dark:border-l-green-500' : task.status === 'in_progress' ? 'border-l-4 border-l-blue-400 dark:border-l-blue-500' : 'border-l-4 border-l-yellow-400 dark:border-l-yellow-500'}`}>
                    <div className="p-6">
                      {/* Header with Status and Date Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            <StatusIcon size={16} />
                        </div>
                          <div className={`px-2.5 py-1 rounded-full text-xs font-app font-app-medium flex items-center ${task.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700'}`}>
                            <StatusIcon size={10} className="mr-1" />
                          <span>{statusInfo.label}</span>
                        </div>
                      </div>
                        {task.due_date && (
                          <div className="flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <FiCalendar size={12} className="mr-1.5 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-app text-gray-600 dark:text-gray-300">
                            {formatDate(task.due_date)}
                          </span>
                          </div>
                        )}
                      </div>

                      {/* Task Title - Full Width */}
                      <div className="mb-4">
                        <h3 className="text-lg font-app font-app-semibold text-gray-900 dark:text-white leading-tight">
                          {task.title}
                        </h3>
                      </div>
                      
                      {/* Priority Badge */}
                      {task.priority && (
                        <div className="mb-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-app bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            <span className="capitalize">{priorityMap[task.priority] || 'Unbekannt'}</span>
                          </span>
                        </div>
                      )}
                        
                      {/* Task Assignments */}
                      <div className="space-y-3">
                        {isLoading ? (
                          <div className="space-y-3">
                            {[...Array(2)].map((_, idx) => (
                              <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <ShimmerEffect width="70%" height="20px" className="mb-2" />
                                <ShimmerEffect width="40%" height="16px" />
                              </div>
                            ))}
                          </div>
                        ) : assignments.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Briefcase size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Keine Aufgaben verfügbar</p>
                          </div>
                        ) : (
                          assignments.map((assignment: TaskAssignment) => {
                              const statusInfo = getAssignmentStatusDisplay(assignment);
                              const StatusIcon = iconMap[statusInfo.icon as keyof typeof iconMap] || AlertCircle;
                            const isCompleted = assignment.status === 'completed';
                            const isSubmitted = assignment.status === 'submitted';
                            const isRejected = assignment.status === 'rejected';
                            const canStart = assignment.current_step === 0 && !isCompleted && !isSubmitted && !isRejected;
                            const canContinue = assignment.current_step > 0 && !isCompleted && !isSubmitted && !isRejected;
                              
                            // Get estimated hours from task template
                            const estimatedHours = assignment.task_template?.estimated_hours;
                              
                              return (
                                <div
                                  key={assignment.id}
                                className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                {/* Assignment Status */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <StatusIcon size={16} className={statusInfo.text} />
                                  </div>
                                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center ${
                                    statusInfo.icon === 'CheckCircle' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : statusInfo.icon === 'Clock' 
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }`}>
                                    <StatusIcon size={10} className="mr-1" />
                                    {statusInfo.label}
                                  </div>
                                    </div>

                                {/* Time Tracking Information */}
                                {estimatedHours && (
                                  <div className="mb-3">
                                    <div className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                                      isCompleted 
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                        : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    }`}>
                                      <div className="flex items-center">
                                        <Clock size={12} className={`mr-1.5 ${
                                          isCompleted 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : 'text-blue-600 dark:text-blue-400'
                                        }`} />
                                        <span className={`font-medium ${
                                          isCompleted 
                                            ? 'text-green-700 dark:text-green-300' 
                                            : 'text-blue-700 dark:text-blue-300'
                                        }`}>
                                          {isCompleted ? 'Verdient' : 'Geschätzt'}: {estimatedHours}h
                                        </span>
                                      </div>
                                      {isCompleted && (
                                        <CheckCircle size={12} className="text-green-600 dark:text-green-400" />
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Payment Information (for task-based users only) */}
                                {isTaskBasedUser() && (
                                  <div className="mb-3">
                                    <div className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                                      isCompleted 
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                                        : 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                                    }`}>
                                      <div className="flex items-center">
                                        <span className={`mr-1.5 ${
                                          isCompleted 
                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                            : 'text-indigo-600 dark:text-indigo-400'
                                        }`}>€</span>
                                        <span className={`font-medium ${
                                          isCompleted 
                                            ? 'text-emerald-700 dark:text-emerald-300' 
                                            : 'text-indigo-700 dark:text-indigo-300'
                                        }`}>
                                          {isCompleted ? 'Verdient' : 'Vergütung'}: €{(assignment.custom_payment_amount || assignment.task_template?.payment_amount || 0).toFixed(2)}
                                        </span>
                                      </div>
                                      {isCompleted && assignment.payment_status === 'approved' && (
                                        <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      )}
                                      {isCompleted && assignment.payment_status === 'pending' && (
                                        <Clock size={12} className="text-yellow-600 dark:text-yellow-400" />
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToTaskDetail(assignment.id);
                                    }}
                                    className="flex-1"
                                    leftIcon={<FileText size={14} />}
                                  >
                                    Details
                                  </Button>
                                  
                                  {isCompleted ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="flex-1"
                                      leftIcon={<CheckCircle size={14} />}
                                    >
                                      Abgeschlossen
                                    </Button>
                                  ) : isSubmitted ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="flex-1"
                                      leftIcon={<Upload size={14} />}
                                    >
                                      Eingereicht
                                    </Button>
                                  ) : isRejected ? (
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToTaskDetail(assignment.id);
                                      }}
                                      className="flex-1"
                                      leftIcon={<AlertCircle size={14} />}
                                    >
                                      Grund anzeigen
                                    </Button>
                                  ) : canStart ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToTaskFlow(assignment.id);
                                      }}
                                      className="flex-1"
                                      leftIcon={<FiActivity size={14} />}
                                    >
                                      Starten
                                    </Button>
                                  ) : canContinue ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToTaskFlow(assignment.id);
                                      }}
                                      className="flex-1"
                                      leftIcon={<FiTrendingUp size={14} />}
                                    >
                                      Fortsetzen
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToTaskFlow(assignment.id);
                                      }}
                                      className="flex-1"
                                      leftIcon={<FiActivity size={14} />}
                                    >
                                      Öffnen
                                    </Button>
                                    )}
                                  </div>
                                </div>
                              );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default React.memo(MyTasks);
