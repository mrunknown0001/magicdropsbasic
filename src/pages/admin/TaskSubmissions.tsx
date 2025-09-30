import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Search, Filter, User, Video, Clock, CheckCircle, AlertCircle, Edit, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
// We'll use a simple date formatting approach instead of date-fns to avoid import issues
import { supabase } from '../../lib/supabase';
import { TaskAssignment as BaseTaskAssignment, Profile } from '../../types/database';

// Extended TaskAssignment type with properties used in this component
interface TaskAssignment extends Omit<BaseTaskAssignment, 'task_template' | 'video_chat_status'> {
  assignee?: Profile;
  demo_email?: string;
  demo_password?: string;
  video_chat_code?: string;
  video_chat_status?: 'not_started' | 'accepted' | 'declined' | 'completed' | string;
  task_template?: {
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    payment_amount?: number;
  };
}
import { useTaskAssignment } from '../../hooks/useTaskAssignment';
import { useSettingsContext } from '../../context/SettingsContext';

// Video chat status labels
const statusLabels = {
  'not_started': 'Nicht gestartet',
  'accepted': 'Akzeptiert', // CRITICAL FIX: Database expects 'accepted' not 'started'
  'declined': 'Abgelehnt',
  'completed': 'Abgeschlossen'
};

// Status colors will be dynamically generated using branding colors from the settings context

const TaskSubmissions: React.FC = () => {
  const navigate = useNavigate();
  const { colors } = useSettingsContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('accepted'); // Default to showing 'accepted' submissions
  const [submissions, setSubmissions] = useState<TaskAssignment[]>([]);
  const [localLoading, setLocalLoading] = useState(false); 
  const [localError, setLocalError] = useState<Error | null>(null);
  
  // Use our enhanced task assignment hook
  const { 
    isLoading: hookLoading, 
    error: hookError,
    fetchPendingVideoSubmissions
  } = useTaskAssignment();
  
  // Combined loading and error states
  const loading = hookLoading || localLoading;
  const error = hookError || localError;

  // Enhanced fetch submissions function using the hook
  const fetchSubmissions = async () => {
    setLocalLoading(true);
    
    // Create a timeout promise to avoid hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Operation timed out after 10 seconds'));
      }, 10000); // 10 second timeout
    });
    
    try {
      console.log('Fetching submissions using hook with filter:', filter);
      
      // Call the enhanced hook function with timeout control
      const fetchDataPromise = fetchPendingVideoSubmissions(filter as any);
      const data = await Promise.race([fetchDataPromise, timeoutPromise]) as TaskAssignment[];
      
      // Apply search term filtering client-side if needed
      let filteredData = data;
      if (searchTerm && filteredData.length > 0) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(submission => {
          const assignee = submission.assignee as Profile | undefined;
          const template = submission.task_template;
          
          return (
            assignee?.first_name?.toLowerCase().includes(searchLower) ||
            assignee?.last_name?.toLowerCase().includes(searchLower) ||
            template?.title?.toLowerCase().includes(searchLower)
          );
        });
      }
      
      // Log the filtered results
      console.log(`Found ${filteredData.length} submissions after filtering`);
      if (filteredData.length > 0) {
        console.log('First result profile data:', filteredData[0].assignee);
      }
      
      setSubmissions(filteredData);
    } catch (err) {
      console.error('Error in enhanced fetchSubmissions:', err);
      
      // Prevent showing duplicate errors for the same issue
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch submissions';
      
      // Don't show timeout errors as they might be common and create alert fatigue
      if (!(err instanceof Error) || !errorMessage.includes('timed out')) {
      setLocalError(err instanceof Error ? err : new Error('Failed to fetch submissions'));
      toast.error('Fehler beim Laden der Aufgaben-Einreichungen');
      } else {
        console.warn('Request timed out, but not showing error to user to avoid alert fatigue');
        // For timeouts, just set a more user-friendly error that doesn't trigger a toast
        setLocalError(new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.'));
      }
      
      // Return empty array to prevent further errors
      return [];
    } finally {
      setLocalLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    // Use a retry mechanism with exponential backoff
    let retryCount = 0;
    const maxRetries = 3;
    
    const loadData = async () => {
      try {
        await fetchSubmissions();
      } catch (err) {
        console.error(`Attempt ${retryCount + 1} failed:`, err);
        if (retryCount < maxRetries) {
          // Exponential backoff (1s, 2s, 4s)
          const delay = Math.pow(2, retryCount) * 1000;
          retryCount++;
          console.log(`Retrying in ${delay}ms (attempt ${retryCount} of ${maxRetries})...`);
          setTimeout(loadData, delay);
        } else {
          console.error(`Failed after ${maxRetries} attempts`);
          setLocalError(err instanceof Error ? err : new Error('Failed to load data after multiple attempts'));
        }
      }
    };
    
    // Start loading data
    loadData();
    
    // Set up real-time subscription for task assignment changes
    const subscription = supabase
      .channel('taskSubmissionsChanges')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'task_assignments' },
        (payload) => {
          console.log('Task assignment changed:', payload);
          // Only refresh data, don't auto-update UI to prevent refresh loops
          if (payload.eventType === 'INSERT' && payload.new?.video_chat_status === filter) {
            toast.success('Neue Video-Chat-Anfrage eingegangen!');
            fetchSubmissions();
          }
        }
      )
      .subscribe();
      
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [filter, searchTerm]);

  // Handle filter change
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    // Clear any existing errors when changing filters
    setLocalError(null);
  };

  // Format date for display with a custom implementation
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Ungültiges Datum';
      }
      
      // Format as dd.MM.yyyy HH:mm
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (e) {
      return 'Ungültiges Datum';
    }
  };

  // Navigate to submission details
  const handleViewDetails = (id: string) => {
    navigate(`/admin/submissions/${id}`);
  };

  // Function to render status badges with appropriate styling
  const renderStatusBadge = (status: string) => {
    // Define status configurations with appropriate styling
    const getStatusConfig = () => {
      switch (status) {
        case 'accepted':
          return {
            icon: Video,
            bgClass: `bg-[${colors.primary}]/10`,
            textClass: `text-[${colors.primary}]`,
            darkBgClass: `dark:bg-gray-700`,
            darkTextClass: `dark:text-white`
          };
        case 'completed':
          return {
            icon: CheckCircle,
            bgClass: `bg-green-100`,
            textClass: `text-green-800`,
            darkBgClass: `dark:bg-green-700/30`,
            darkTextClass: `dark:text-white`
          };
        case 'declined':
          return {
            icon: AlertCircle,
            bgClass: `bg-[${colors.accent}]/10`,
            textClass: `text-[${colors.accent}]`,
            darkBgClass: `dark:bg-gray-700`,
            darkTextClass: `dark:text-white`
          };
        case 'not_started':
        default:
          return {
            icon: Clock,
            bgClass: `bg-gray-100`,
            textClass: `text-gray-800`,
            darkBgClass: `dark:bg-gray-700`,
            darkTextClass: `dark:text-white`
          };
      }
    };
    
    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.darkBgClass} ${statusConfig.darkTextClass}`}>
        <StatusIcon size={12} className="mr-1" />
        {statusLabels[status as keyof typeof statusLabels] || status}
      </div>
    );
  };

  // Add a retry function
  const handleRetry = () => {
    setLocalError(null);
    fetchSubmissions();
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 mx-auto">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                Video-Chat Anfragen
                {loading && (
                  <span className="ml-3 inline-block">
                    <LoadingSpinner size="sm" />
                  </span>
                )}
              </CardTitle>
              <p className="text-gray-500 dark:text-gray-300 mt-1">
                Verwalte Video-Chat-Anfragen und füge Test-Daten hinzu
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex items-center"
                disabled={loading}
              >
                <RefreshCw size={16} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Wird geladen...' : 'Aktualisieren'}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Search and Filter bar */}
            <div className="flex flex-col sm:flex-row mb-6 gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                </div>
                <input
                  type="text"
                  placeholder="Nach Name oder Aufgabe suchen..."
                  className="pl-10 pr-4 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSubmissions()}
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Filter size={16} className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
                </div>
                
                <select
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="border rounded-md px-2 py-1.5 dark:bg-gray-800 dark:border-gray-700"
                  disabled={loading}
                >
                  <option value="">Alle Status</option>
                  <option value="accepted">Akzeptiert</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="declined">Abgelehnt</option>
                </select>
              </div>
            </div>

            {/* Main Content Area - Show Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-500 dark:text-gray-300">
                  Lade Video-Chat Anfragen...
                </p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <Video className="text-gray-500 dark:text-gray-300" size={24} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Einreichungen gefunden</h3>
                <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                  Es gibt aktuell keine Video-Chat-Anfragen mit dem ausgewählten Filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mitarbeiter</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aufgabe</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Datum</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Test-Daten</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {submissions.map((submission) => {
                      // Type assertion to access profile data safely
                      const assignee = submission.assignee as Profile | undefined;
                      const hasTestData = !!submission.demo_email && !!submission.demo_password;
                      
                      return (
                        <motion.tr 
                          key={submission.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unbekannter Mitarbeiter'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-300">
                                  {assignee?.email || 'Keine E-Mail'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{submission.task_template?.title || 'Unbekannte Aufgabe'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-300">Code: {submission.video_chat_code || 'Kein Code'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(submission.video_chat_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {formatDate(submission.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasTestData ? (
                              <div className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full inline-flex items-center">
                                <CheckCircle size={12} className="mr-1" />
                                Verfügbar
                              </div>
                            ) : (
                              <div className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full inline-flex items-center">
                                <AlertCircle size={12} className="mr-1" />
                                Ausstehend
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => handleViewDetails(submission.id)}
                              size="sm"
                              variant="outline"
                              className="inline-flex items-center whitespace-nowrap"
                            >
                              <Edit size={14} className="mr-1 flex-shrink-0" />
                              <span>{hasTestData ? 'Bearbeiten' : 'Daten hinzufügen'}</span>
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">
          <AlertCircle size={48} />
        </div>
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Fehler beim Laden der Daten</p>
        <p className="text-gray-500 dark:text-gray-300 mb-4">{error.message}</p>
        <Button onClick={handleRetry}>Erneut versuchen</Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center">
            <div className={`p-2 rounded-md bg-[${colors.primary}]/10 dark:bg-gray-700 mr-4`}>
              <Video size={24} className={`text-[${colors.primary}] dark:text-white`} />
            </div>
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white flex items-center">
                Video-Chat Anfragen
                {loading && (
                  <span className="ml-3 inline-block">
                    <LoadingSpinner size="sm" />
                  </span>
                )}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 font-app">
                Verwalte Video-Chat-Anfragen und füge Test-Daten hinzu
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
              disabled={loading}
            >
              {loading ? 'Wird geladen...' : 'Aktualisieren'}
            </Button>
          </div>
        </div>
      </motion.div>
      
      <Card className="border-0 shadow-sm overflow-hidden">
        {/* Card header removed to reduce spacing */}
        <CardContent className="pt-0">
          {/* Search and Filter bar removed as requested */}

          {/* Main Content Area - Show Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-500 dark:text-gray-300">
                Lade Video-Chat Anfragen...
              </p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Video className="text-gray-500 dark:text-gray-300" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Einreichungen gefunden</h3>
              <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                Es gibt aktuell keine Video-Chat-Anfragen mit dem ausgewählten Filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mitarbeiter</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aufgabe</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Datum</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Test-Daten</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {submissions.map((submission) => {
                    // Type assertion to access profile data safely
                    const assignee = submission.assignee as Profile | undefined;
                    const hasTestData = !!submission.demo_email && !!submission.demo_password;
                    
                    return (
                      <motion.tr 
                        key={submission.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unbekannter Mitarbeiter'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-300">
                                {assignee?.email || 'Keine E-Mail'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{submission.task_template?.title || 'Unbekannte Aufgabe'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-300">Code: {submission.video_chat_code || 'Kein Code'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStatusBadge(submission.video_chat_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {formatDate(submission.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasTestData ? (
                            <div className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full inline-flex items-center">
                              <CheckCircle size={12} className="mr-1" />
                              Verfügbar
                            </div>
                          ) : (
                            <div className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full inline-flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              Ausstehend
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            onClick={() => handleViewDetails(submission.id)}
                            size="sm"
                            variant="outline"
                            className="inline-flex items-center whitespace-nowrap"
                          >
                            <Edit size={14} className="mr-1 flex-shrink-0" />
                            <span>{hasTestData ? 'Bearbeiten' : 'Daten hinzufügen'}</span>
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskSubmissions;
