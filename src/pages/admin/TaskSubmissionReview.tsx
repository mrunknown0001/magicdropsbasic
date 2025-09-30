import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Search, Clock, CheckCircle, AlertCircle, Upload, User, Filter, RefreshCw } from 'lucide-react';
import { FiCalendar, FiEye } from 'react-icons/fi';
import { motion } from 'framer-motion';
import ShimmerEffect from '../../components/ui/ShimmerEffect';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import { useTaskSubmissions } from '../../hooks/useTaskSubmissions';

// Status mapping for display
const statusMap = {
  'submitted': { 
    label: 'Eingereicht', 
    bg: 'bg-blue-100', 
    text: 'text-blue-800', 
    icon: Upload,
    darkBg: 'dark:bg-blue-900/30', 
    darkText: 'dark:text-blue-400' 
  }
};

const TaskSubmissionReview: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use the new hook for better loading management
  const {
    submittedTasks,
    loading,
    error,
    refreshSubmittedTasks,
    approveTask,
    rejectTask
  } = useTaskSubmissions();

  // Handle task approval
  const handleApproveTask = async (taskId: string) => {
    if (!user || processingTasks.has(taskId)) return;

    setProcessingTasks(prev => new Set(prev).add(taskId));

    try {
      await approveTask(taskId);
    } catch (err) {
      console.error('Error approving task:', err);
    } finally {
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Handle task rejection with reason
  const handleRejectTask = async (taskId: string, reason: string, adminNotes?: string) => {
    if (!user || !reason.trim() || processingTasks.has(taskId)) return;

    setProcessingTasks(prev => new Set(prev).add(taskId));

    try {
      await rejectTask(taskId, reason, adminNotes);
    } catch (err) {
      console.error('Error rejecting task:', err);
    } finally {
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd. MMM yyyy, HH:mm', { locale: de });
    } catch {
      return 'Ungültiges Datum';
    }
  };

  // Filter tasks based on search and date
  const filteredTasks = useMemo(() => {
    let filtered = submittedTasks;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.task_template?.title?.toLowerCase().includes(term) ||
        task.profile?.first_name?.toLowerCase().includes(term) ||
        task.profile?.last_name?.toLowerCase().includes(term) ||
        task.profile?.email?.toLowerCase().includes(term) ||
        task.id.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(task => {
            if (!task.submitted_at) return false;
            const taskDate = new Date(task.submitted_at);
            return taskDate.toDateString() === now.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(task => {
            if (!task.submitted_at) return false;
            return new Date(task.submitted_at) >= weekAgo;
          });
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(task => {
            if (!task.submitted_at) return false;
            return new Date(task.submitted_at) >= monthAgo;
          });
          break;
      }
    }

    return filtered;
  }, [submittedTasks, searchTerm, dateFilter]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="space-y-8 w-full px-4 py-6">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <ShimmerEffect width="300px" height="32px" className="mb-2" />
          <ShimmerEffect width="500px" height="20px" />
        </div>
        
        {/* Filters Skeleton */}
        <div className="flex flex-col md:flex-row gap-4">
          <ShimmerEffect width="300px" height="40px" />
          <ShimmerEffect width="150px" height="40px" />
          <ShimmerEffect width="120px" height="40px" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <ShimmerEffect width="70%" height="24px" className="mb-2" />
                  <ShimmerEffect width="40%" height="16px" />
                </div>
                <ShimmerEffect width="80px" height="24px" borderRadius="12px" />
              </div>
              <div className="space-y-2 mb-4">
                <ShimmerEffect width="100%" height="16px" />
                <ShimmerEffect width="80%" height="16px" />
              </div>
              <div className="flex gap-2">
                <ShimmerEffect width="100px" height="36px" />
                <ShimmerEffect width="100px" height="36px" />
                <ShimmerEffect width="80px" height="36px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full px-4 py-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 shadow-sm border border-blue-100 dark:border-blue-800"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Aufgaben-Prüfung
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Prüfen und genehmigen Sie eingereichte Aufgaben von Mitarbeitern
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
              <Upload size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {filteredTasks.length} Eingereicht
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSubmittedTasks}
              disabled={loading}
              leftIcon={<RefreshCw size={16} />}
            >
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Suchen nach Mitarbeiter, Aufgabe oder ID..."
            className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Alle Zeiten</option>
            <option value="today">Heute</option>
            <option value="week">Letzte Woche</option>
            <option value="month">Letzter Monat</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <Filter size={16} className="text-gray-400" />
          </div>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-center">
            <AlertCircle className="mr-2 text-red-600 dark:text-red-400" size={20} />
            <p className="text-red-700 dark:text-red-300">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSubmittedTasks}
              className="ml-auto"
            >
              Erneut versuchen
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Upload className="text-gray-500 dark:text-gray-400" size={28} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Keine eingereichten Aufgaben
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            {searchTerm || dateFilter !== 'all' 
              ? 'Keine Aufgaben entsprechen Ihren Suchkriterien.' 
              : 'Derzeit sind keine Aufgaben zur Prüfung eingereicht.'}
          </p>
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredTasks.map((task) => (
            <TaskSubmissionCard
              key={task.id}
              task={task}
              onApprove={handleApproveTask}
              onReject={handleRejectTask}
              onViewDetails={() => navigate(`/admin/bankdrops/${task.task_template_id}?assignment=${task.id}`)}
              isProcessing={processingTasks.has(task.id)}
              formatDate={formatDate}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};

interface TaskSubmissionCardProps {
  task: any; // Using any to avoid complex type issues
  onApprove: (taskId: string) => void;
  onReject: (taskId: string, reason: string, adminNotes?: string) => void;
  onViewDetails: () => void;
  isProcessing: boolean;
  formatDate: (date: string) => string;
}

const TaskSubmissionCard: React.FC<TaskSubmissionCardProps> = ({
  task,
  onApprove,
  onReject,
  onViewDetails,
  isProcessing,
  formatDate
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const handleApprove = () => {
    onApprove(task.id);
    setShowApprovalModal(false);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Bitte geben Sie einen Ablehnungsgrund an');
      return;
    }
    
    onReject(task.id, rejectReason, adminNotes);
    setShowRejectModal(false);
    setRejectReason('');
    setAdminNotes('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setAdminNotes('');
  };

  return (
    <>
      <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
        <Card className="hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  {task.task_template?.title || 'Unbekannte Aufgabe'}
                </CardTitle>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <User size={12} className="mr-1" />
                  <span>
                    {task.profile ? 
                      `${task.profile.first_name || ''} ${task.profile.last_name || ''}`.trim() || task.profile.email :
                      'Unbekannter Mitarbeiter'
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                <Upload size={10} className="mr-1" />
                Eingereicht
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-2 mb-3">
              {/* Submission Date */}
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <FiCalendar size={12} className="mr-1.5" />
                <span>{task.submitted_at ? formatDate(task.submitted_at) : 'Unbekannt'}</span>
              </div>
              
              {/* Estimated Hours - Compact */}
              {task.task_template?.estimated_hours && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock size={12} className="text-gray-600 dark:text-gray-400 mr-1.5" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Arbeitszeit:</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{task.task_template.estimated_hours}h</span>
                  </div>
                </div>
              )}
              
              {/* Submission Details - Compact */}
              {task.submission_data && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {task.submission_data.document_step_completed && (
                      <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                        <CheckCircle size={10} className="mr-1" />
                        <span>Dokumente</span>
                      </div>
                    )}
                    {task.submission_data.video_call_rating_completed && (
                      <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                        <CheckCircle size={10} className="mr-1" />
                        <span>Bewertung</span>
                      </div>
                    )}
                    {task.submission_data.video_chat_status === 'completed' && (
                      <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                        <CheckCircle size={10} className="mr-1" />
                        <span>Video-Chat</span>
                      </div>
                    )}
                    {task.submission_data.demo_data && (
                      <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                        <CheckCircle size={10} className="mr-1" />
                        <span>Demo-Daten</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="success"
                onClick={() => setShowApprovalModal(true)}
                disabled={isProcessing}
                leftIcon={<CheckCircle size={12} />}
                className="flex-1 text-xs py-2"
              >
                {isProcessing ? 'Bearbeitung...' : 'Genehmigen'}
              </Button>
              
              <Button
                size="sm"
                variant="danger"
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                leftIcon={<AlertCircle size={12} />}
                className="flex-1 text-xs py-2"
              >
                Ablehnen
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={onViewDetails}
                leftIcon={<FiEye size={12} />}
                className="text-xs py-2 px-3"
              >
                Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Approval Confirmation Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aufgabe genehmigen
            </h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  Aufgaben-Details:
                </h4>
                <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                  <div className="flex justify-between">
                    <span>Aufgabe:</span>
                    <span className="font-medium">{task.task_template?.title || 'Unbekannt'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mitarbeiter:</span>
                    <span className="font-medium">
                      {task.profile ? `${task.profile.first_name} ${task.profile.last_name}` : 'Unbekannt'}
                    </span>
                  </div>
                  {task.task_template?.estimated_hours && (
                    <div className="flex justify-between">
                      <span>Arbeitszeit:</span>
                      <span className="font-bold text-green-800 dark:text-green-200">
                        +{task.task_template.estimated_hours}h
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {task.task_template?.estimated_hours ? (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center text-blue-700 dark:text-blue-300">
                    <Clock size={16} className="mr-2" />
                    <p className="text-sm">
                      <span className="font-bold">{task.task_template.estimated_hours} Stunden</span> werden automatisch 
                      zum Arbeitszeitkonto des Mitarbeiters hinzugefügt.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center text-amber-700 dark:text-amber-300">
                    <AlertCircle size={16} className="mr-2" />
                    <p className="text-sm">
                      Keine geschätzte Arbeitszeit für diese Aufgabe definiert.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowApprovalModal(false)}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                variant="success"
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1"
                leftIcon={<CheckCircle size={16} />}
              >
                {isProcessing ? 'Bearbeitung...' : 'Genehmigen'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aufgabe ablehnen
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ablehnungsgrund *
                </label>
                <textarea
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
                  rows={3}
                  placeholder="Beschreiben Sie, warum die Aufgabe abgelehnt wird..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin-Notizen (optional)
                </label>
                <textarea
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none resize-none"
                  rows={2}
                  placeholder="Zusätzliche Hinweise für den Mitarbeiter..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={closeRejectModal}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectReason.trim() || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Bearbeitung...' : 'Ablehnen'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default TaskSubmissionReview; 