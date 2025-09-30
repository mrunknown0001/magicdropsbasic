import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock as CalendarIcon, 
  User, 
  Briefcase, 
  RefreshCw, 
  Search,
  Filter,
  CheckCircle as TrendingIcon,
  Video,
  FileText,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { TaskAssignment } from '../../types/database';
import { useEmployeeTaskAssignments } from '../../hooks/useEmployeeTaskAssignments';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface EmployeeTaskAssignmentsProps {
  employeeId: string;
  employeeName: string;
}

// Status mapping for display
const statusMap = {
  'pending': { 
    label: 'Ausstehend', 
    bg: 'bg-yellow-100', 
    text: 'text-yellow-800', 
    icon: AlertCircle, 
    darkBg: 'dark:bg-yellow-900/30', 
    darkText: 'dark:text-yellow-300',
    borderColor: 'border-yellow-200 dark:border-yellow-700'
  },
  'submitted': { 
    label: 'Eingereicht', 
    bg: 'bg-blue-100', 
    text: 'text-blue-800', 
    icon: Clock, 
    darkBg: 'dark:bg-blue-900/30', 
    darkText: 'dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-700'
  },
  'completed': { 
    label: 'Abgeschlossen', 
    bg: 'bg-green-100', 
    text: 'text-green-800', 
    icon: CheckCircle, 
    darkBg: 'dark:bg-green-900/30', 
    darkText: 'dark:text-green-300',
    borderColor: 'border-green-200 dark:border-green-700'
  },
  'rejected': { 
    label: 'Abgelehnt', 
    bg: 'bg-red-100', 
    text: 'text-red-800', 
    icon: XCircle, 
    darkBg: 'dark:bg-red-900/30', 
    darkText: 'dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-700'
  },
  'canceled': { 
    label: 'Abgebrochen', 
    bg: 'bg-gray-100', 
    text: 'text-gray-800', 
    icon: XCircle, 
    darkBg: 'dark:bg-gray-900/30', 
    darkText: 'dark:text-gray-300',
    borderColor: 'border-gray-200 dark:border-gray-700'
  }
};

// Priority mapping
const priorityMap = {
  'low': { label: 'Niedrig', color: 'text-gray-600 dark:text-gray-400' },
  'medium': { label: 'Mittel', color: 'text-blue-600 dark:text-blue-400' },
  'high': { label: 'Hoch', color: 'text-red-600 dark:text-red-400' }
};

// Video chat status mapping
const videoChatStatusMap = {
  'not_started': { label: 'Nicht gestartet', color: 'text-gray-600 dark:text-gray-400' },
  'accepted': { label: 'Akzeptiert', color: 'text-blue-600 dark:text-blue-400' },
  'declined': { label: 'Abgelehnt', color: 'text-red-600 dark:text-red-400' },
  'completed': { label: 'Abgeschlossen', color: 'text-green-600 dark:text-green-400' }
};

const EmployeeTaskAssignments: React.FC<EmployeeTaskAssignmentsProps> = ({ 
  employeeId, 
  employeeName 
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'completed' | 'rejected' | 'canceled'>('all');
  
  const {
    taskAssignments,
    loading,
    error,
    refreshTaskAssignments,
    getTaskAssignmentStats
  } = useEmployeeTaskAssignments(employeeId);
  
  // Get statistics
  const stats = getTaskAssignmentStats();
  
  // Filter task assignments
  const filteredAssignments = useMemo(() => {
    let filtered = taskAssignments;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(assignment => 
        assignment.task_template?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.task_template?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.task_template?.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [taskAssignments, statusFilter, searchTerm]);
  
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
  
  const handleTaskClick = (assignment: TaskAssignment) => {
    // Navigate to task template details if available, otherwise to submissions
    if (assignment.task_template_id) {
      navigate(`/admin/task-templates/${assignment.task_template_id}`);
    } else {
      navigate(`/admin/submissions`);
    }
  };
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Fehler beim Laden der Aufgaben
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error.message}
            </p>
            <Button onClick={refreshTaskAssignments} leftIcon={<RefreshCw size={16} />}>
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Gesamt</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Ausstehend</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Abgeschlossen</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.completed}</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 rounded-lg">
              <TrendingIcon className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Erfolgsrate</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completionRate}%</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2" size={20} />
              Aufgaben von {employeeName}
            </CardTitle>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Aufgaben durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Alle Status</option>
                  <option value="pending">Ausstehend</option>
                  <option value="submitted">Eingereicht</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="rejected">Abgelehnt</option>
                  <option value="canceled">Abgebrochen</option>
                </select>
              </div>
              
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTaskAssignments}
                disabled={loading}
                leftIcon={loading ? <LoadingSpinner size="sm" /> : <RefreshCw size={16} />}
              >
                Aktualisieren
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading && taskAssignments.length === 0 ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {taskAssignments.length === 0 ? 'Keine Aufgaben gefunden' : 'Keine Aufgaben entsprechen den Filtern'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {taskAssignments.length === 0 
                  ? `${employeeName} hat noch keine Aufgaben zugewiesen bekommen.`
                  : 'Versuchen Sie, die Filter zu ändern oder den Suchbegriff anzupassen.'
                }
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {filteredAssignments.map((assignment) => {
                const status = statusMap[assignment.status];
                const StatusIcon = status.icon;
                const priority = priorityMap[assignment.task_template?.priority || 'medium'];
                const videoChatStatus = videoChatStatusMap[assignment.video_chat_status || 'not_started'];
                
                return (
                  <motion.div
                    key={assignment.id}
                    variants={item}
                    className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${status.borderColor} hover:border-blue-300 dark:hover:border-blue-600`}
                    onClick={() => handleTaskClick(assignment)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {assignment.task_template?.title || 'Unbenannte Aufgabe'}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text} ${status.darkBg} ${status.darkText}`}>
                            <StatusIcon size={12} className="mr-1" />
                            {status.label}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {assignment.task_template?.description || 'Keine Beschreibung verfügbar'}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center text-gray-500 dark:text-gray-400">
                            <Briefcase size={14} className="mr-2" />
                            <span>Typ: {assignment.task_template?.type || 'Unbekannt'}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <TrendingIcon size={14} className="mr-2" />
                            <span className={priority.color}>
                              Priorität: {priority.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <Video size={14} className="mr-2" />
                            <span className={videoChatStatus.color}>
                              Video: {videoChatStatus.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-gray-500 dark:text-gray-400">
                            <CalendarIcon size={14} className="mr-2" />
                            <span>
                              {assignment.due_date 
                                ? `Fällig: ${formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true, locale: de })}`
                                : 'Kein Fälligkeitsdatum'
                              }
                            </span>
                          </div>
                        </div>
                        
                        {assignment.current_step !== undefined && assignment.task_template?.steps && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                              <span>Fortschritt</span>
                              <span>{assignment.current_step || 0} / {assignment.task_template.steps.length}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${assignment.task_template.steps.length > 0 
                                    ? ((assignment.current_step || 0) / assignment.task_template.steps.length) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                          <p>Erstellt:</p>
                          <p>{formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true, locale: de })}</p>
                        </div>
                        <ChevronDown size={20} className="text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeTaskAssignments; 