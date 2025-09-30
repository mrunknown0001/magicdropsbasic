import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeft, Download, ExternalLink, FileText, Database, CreditCard as CreditCardIcon, User, Clock, AlertCircle, Briefcase, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { TaskAssignment, Profile, TaskRating } from '../../types/database';
import { format as formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { TaskAttachment } from '../../hooks/useTaskAttachments';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { useTaskAssignment } from '../../hooks/useTaskAssignment';
import { useAuth } from '../../context/AuthContext';

// Extended TaskAssignment type that includes the task_id field
interface ExtendedTaskAssignment extends TaskAssignment {
  task_id?: string;
  assignee?: Profile;
  ratings?: TaskRating[];
  demo_email?: string;
  demo_password?: string;
  ident_code?: string;
  ident_url?: string;
}

// Simple template version with needed fields including app URLs
interface SimpleTaskTemplate {
  id: string;
  title: string;
  play_store_url?: string;
  app_store_url?: string;
}

const BankdropDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [template, setTemplate] = useState<SimpleTaskTemplate | null>(null);
  const [assignment, setAssignment] = useState<ExtendedTaskAssignment | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  
  // Admin actions state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  const { user } = useAuth();
  const { approveTaskSubmission, rejectTaskSubmission } = useTaskAssignment();
  
  // Refs to prevent multiple fetches and infinite loops
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const subscriptionRef = useRef<any>(null);
  
  // Get the assignment ID from the URL query parameter
  const assignmentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('assignment');
  }, [location.search]);
  
  // Fetch specific assignment and documents
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !assignmentId) return;
      
      // Check if we're already fetching
      if (isFetchingRef.current) {
        console.log('Data fetch already in progress for BankdropDetails, skipping');
        return;
      }
      
      // Add a cooling period to prevent rapid re-fetches
      const now = Date.now();
      const coolingPeriod = 5000; // 5 seconds
      
      if ((now - lastFetchTimeRef.current < coolingPeriod) && lastFetchTimeRef.current > 0) {
        console.log(`In cooling period for BankdropDetails, not fetching again. Last fetch: ${new Date(lastFetchTimeRef.current).toLocaleTimeString()}`);
        return;
      }
      
      // Check if we've already fetched
      if (hasFetchedRef.current && assignment) {
        console.log('BankdropDetails data already fetched, using cached data');
        return;
      }
      
      console.log('Fetching BankdropDetails data...');
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      
      try {
        // Fetch template basic info (just for the title)
        const { data: templateData, error: templateError } = await supabase
          .from('task_templates')
          .select('id, title, play_store_url, app_store_url')
          .eq('id', id)
          .single();
          
        if (templateError) throw templateError;
        setTemplate(templateData);
        
        console.log('Looking for assignment with ID:', assignmentId);
        
        // Fetch specific assignment with all fields
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('task_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single();
          
        if (assignmentError) {
          console.error('Error fetching assignment data:', assignmentError);
          throw assignmentError;
        }
        
        // Debug the assignment data
        console.log('Assignment data fetched:', assignmentData);
        
        if (assignmentData && assignmentData.task_id) {
          console.log('Associated task ID:', assignmentData.task_id);
        }
        
        if (assignmentData) {
          // Fetch employee data
          if (assignmentData.assignee_id) {
            const { data: profileData, error: profileError } = await supabase.rpc(
              'get_profiles_with_emails_by_ids',
              { profile_ids: [assignmentData.assignee_id] }
            );
            
            if (!profileError && profileData && profileData.length > 0) {
              assignmentData.assignee = profileData[0];
            }
          }
          
          // Fetch phone number if available
          if (assignmentData.phone_number_id) {
            console.log('Fetching phone number for ID:', assignmentData.phone_number_id);
            const { data: phoneData, error: phoneError } = await supabase
              .from('phone_numbers')
              .select('phone_number')
              .eq('id', assignmentData.phone_number_id)
              .single();
              
            if (!phoneError && phoneData) {
              console.log('Found phone number:', phoneData.phone_number);
              setPhoneNumber(phoneData.phone_number);
            } else {
              console.error('Error fetching phone number:', phoneError);
            }
          }
          
          // Fetch attachments for this task
          if (assignmentData.task_id) {
            const { data: attachmentsData, error: attachmentsError } = await supabase
              .from('task_attachments')
              .select('*')
              .eq('task_id', assignmentData.task_id);
              
            if (!attachmentsError && attachmentsData) {
              setAttachments(attachmentsData);
            }
          }
          
          setAssignment(assignmentData);
        }
        
        // Mark as fetched to avoid unnecessary fetches
        hasFetchedRef.current = true;
        setError(null);
      } catch (err) {
        console.error('Error fetching bankdrop details:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch bankdrop details'));
        toast.error('Fehler beim Laden der Bankdrop-Details');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchData();
    
    // Setup real-time subscription
    if (!subscriptionRef.current && assignmentId) {
      console.log('Setting up real-time subscription for BankdropDetails');
      
      const channel = supabase.channel(`bankdrop-assignment-${assignmentId}`);
      
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_assignments', filter: `id=eq.${assignmentId}` },
          (payload) => {
            console.log('Task assignment change detected:', payload);
            if (!isFetchingRef.current) {
              const now = Date.now();
              if (now - lastFetchTimeRef.current > 5000) {
                console.log('Refetching data after task assignment change');
                hasFetchedRef.current = false;
                fetchData();
              } else {
                console.log('Change detected but in cooling period, not refetching');
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`Bankdrop details subscription status: ${status}`);
        });
      
      subscriptionRef.current = channel;
    }
    
    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up Bankdrop details subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [id, assignmentId]);
  
  const downloadAttachment = async (attachment: TaskAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(attachment.file_path);
        
      if (error) throw error;
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Dokument erfolgreich heruntergeladen');
    } catch (err) {
      console.error('Error downloading attachment:', err);
      toast.error('Fehler beim Herunterladen des Dokuments');
    }
  };
  
  const formatDateString = (dateString: string) => {
    try {
      return formatDate(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (e) {
      return 'Ungültiges Datum';
    }
  };
  
  const goBackToList = () => {
    navigate('/admin/bankdrops');
  };

  // Admin action handlers
  const handleApproveTask = async () => {
    if (!assignment || !user || isProcessing) return;

    setIsProcessing(true);
    try {
      await approveTaskSubmission(assignment.id);
      toast.success('Aufgabe erfolgreich genehmigt!');
      
      // Refresh the data to show the updated status
      hasFetchedRef.current = false;
      const refreshData = async () => {
        const { data: refreshedData, error: refreshError } = await supabase
          .from('task_assignments')
          .select('*')
          .eq('id', assignment.id)
          .single();
          
        if (!refreshError && refreshedData) {
          setAssignment(prev => ({ ...prev, ...refreshedData }));
        }
      };
      await refreshData();
      
    } catch (err) {
      console.error('Error approving task:', err);
      toast.error('Fehler beim Genehmigen der Aufgabe');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectTask = async () => {
    if (!assignment || !user || !rejectReason.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await rejectTaskSubmission(assignment.id, rejectReason, adminNotes);
      toast.success('Aufgabe abgelehnt und Feedback gesendet!');
      
      // Refresh the data to show the updated status
      hasFetchedRef.current = false;
      const refreshData = async () => {
        const { data: refreshedData, error: refreshError } = await supabase
          .from('task_assignments')
          .select('*')
          .eq('id', assignment.id)
          .single();
          
        if (!refreshError && refreshedData) {
          setAssignment(prev => ({ ...prev, ...refreshedData }));
        }
      };
      await refreshData();
      
      // Close modal and reset form
      setShowRejectModal(false);
      setRejectReason('');
      setAdminNotes('');
      
    } catch (err) {
      console.error('Error rejecting task:', err);
      toast.error('Fehler beim Ablehnen der Aufgabe');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = () => {
    setRejectReason('');
    setAdminNotes('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setAdminNotes('');
  };
  
  if (loading && !assignment) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error || !assignment) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Fehler beim Laden der Bankdrop-Details
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Die angeforderte Aufgabe konnte nicht gefunden werden.
          </p>
          <Button onClick={goBackToList}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }
  
  const { colors } = useSettingsContext();
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={goBackToList}
          className="mr-4 dark:text-white"
        >
          <ArrowLeft size={16} className="mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <CreditCardIcon size={24} className={`mr-3 text-[${colors.primary}] dark:text-white`} />
          {template?.title || 'Bankdrop-Details'}
        </h1>
      </div>
      
      {/* Admin Actions for Submitted Tasks */}
      {assignment.status === 'submitted' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-start mb-4 md:mb-0">
              <MessageSquare className="mt-0.5 mr-3 text-blue-600 dark:text-blue-400" size={20} />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Aufgabe wartet auf Prüfung
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Diese Aufgabe wurde von {assignment.assignee?.first_name} {assignment.assignee?.last_name} eingereicht 
                  {assignment.submitted_at && ` am ${formatDateString(assignment.submitted_at)}`}. 
                  Prüfen Sie die Unterlagen und genehmigen oder lehnen Sie die Aufgabe ab.
                </p>
                {assignment.submission_data && (
                  <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                    📎 {Object.keys(assignment.submission_data).length} zusätzliche Datenfelder übermittelt
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="success"
                onClick={handleApproveTask}
                disabled={isProcessing}
                leftIcon={<CheckCircle size={16} />}
              >
                {isProcessing ? 'Wird genehmigt...' : 'Genehmigen'}
              </Button>
              
              <Button
                variant="danger"
                onClick={openRejectModal}
                disabled={isProcessing}
                leftIcon={<XCircle size={16} />}
              >
                Ablehnen
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Display for Reviewed Tasks */}
      {(assignment.status === 'completed' || assignment.status === 'rejected') && assignment.reviewed_at && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 border-l-4 rounded-r-lg mb-6 ${
            assignment.status === 'completed'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}
        >
          <div className="flex items-start">
            {assignment.status === 'completed' ? (
              <CheckCircle className="mt-0.5 mr-3 text-green-600 dark:text-green-400" size={20} />
            ) : (
              <XCircle className="mt-0.5 mr-3 text-red-600 dark:text-red-400" size={20} />
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-1 ${
                assignment.status === 'completed'
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {assignment.status === 'completed' ? 'Aufgabe genehmigt' : 'Aufgabe abgelehnt'}
              </h3>
              <p className={`text-sm mb-2 ${
                assignment.status === 'completed'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                Geprüft am {formatDateString(assignment.reviewed_at)}
              </p>
              
              {assignment.status === 'rejected' && assignment.rejection_reason && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                  <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                    Ablehnungsgrund:
                  </h4>
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    {assignment.rejection_reason}
                  </p>
                  {assignment.admin_notes && (
                    <>
                      <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mt-2 mb-1">
                        Zusätzliche Hinweise:
                      </h4>
                      <p className="text-red-800 dark:text-red-200 text-sm">
                        {assignment.admin_notes}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Bank Account Alert Banner */}
      <div className={`p-4 border-l-4 border-[${colors.primary}] dark:border-[${colors.primary}] bg-[${colors.primary}]/5 dark:bg-gray-800 rounded-r-md mb-6`}>
        <div className="flex items-start">
          <AlertCircle className={`mt-0.5 mr-3 text-[${colors.primary}] dark:text-white`} size={20} />
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Bankkonto-Informationen</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Diese Daten sind vertraulich und ausschließlich für autorisierte Mitarbeiter bestimmt. Bitte behandeln Sie alle Informationen mit angemessener Sorgfalt. 😉
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content - Bank Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Holder Information */}
        <Card className="col-span-1 border-0 shadow-sm overflow-hidden dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className={`border-b border-gray-100 dark:border-gray-700 bg-[${colors.primary}]/5 dark:bg-gray-700/50`}>
            <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white flex items-center">
              <User size={18} className={`mr-2 text-[${colors.primary}] dark:text-white`} />
              Kontoinhaber
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="ml-0">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {assignment.assignee 
                      ? `${assignment.assignee.first_name} ${assignment.assignee.last_name}`
                      : 'Unbekannter Kontoinhaber'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Erfasst am {formatDateString(assignment.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Kontostatus</h4>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center w-fit ${
                  assignment.status === 'completed' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-white' 
                    : assignment.status === 'submitted'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-white'
                    : assignment.status === 'rejected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-white'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-white'
                }`}>
                  {assignment.status === 'completed' ? (
                    <>
                      <CheckCircle size={14} className="mr-1" />
                      Genehmigt
                    </>
                  ) : assignment.status === 'submitted' ? (
                    <>
                      <Clock size={14} className="mr-1" />
                      Eingereicht
                    </>
                  ) : assignment.status === 'rejected' ? (
                    <>
                      <XCircle size={14} className="mr-1" />
                      Abgelehnt
                    </>
                  ) : (
                    <>
                  <Clock size={14} className="mr-1" />
                      Ausstehend
                    </>
                  )}
                </span>
              </div>
              
              {assignment.phone_number_id && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Telefonnummer</h4>
                  <p className="text-gray-900 dark:text-white font-mono flex items-center">
                    {phoneNumber || 'Lädt...'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Details */}
        <Card className="col-span-1 lg:col-span-2 border-0 shadow-sm overflow-hidden dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className={`border-b border-gray-100 dark:border-gray-700 bg-[${colors.primary}]/5 dark:bg-gray-700/50`}>
            <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white flex items-center">
              <CreditCardIcon size={18} className={`mr-2 text-[${colors.primary}] dark:text-white`} />
              Bankkonto-Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-6">
              {/* Login Credentials */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                    <Database size={16} className="mr-2 text-gray-500 dark:text-gray-300" />
                    Online-Banking Zugangsdaten
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400 mb-1 sm:mb-0">Benutzername:</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {assignment?.demo_email || 'Nicht verfügbar'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400 mb-1 sm:mb-0">Passwort:</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {assignment?.demo_password || 'Nicht verfügbar'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400 mb-1 sm:mb-0">Ident-Code:</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {assignment?.ident_code || 'Nicht verfügbar'}
                    </span>
                  </div>
                  {assignment.ident_url && (
                    <div className="flex flex-col sm:flex-row sm:items-center py-2">
                      <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400 mb-1 sm:mb-0">Ident-URL:</span>
                      <a 
                        href={assignment.ident_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[${colors.primary}] dark:text-blue-400 hover:underline flex items-center`}
                      >
                        <span className="truncate max-w-xs">Link öffnen</span>
                        <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Banking */}
              {(template?.play_store_url || template?.app_store_url) && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                      <Briefcase size={16} className="mr-2 text-gray-500 dark:text-gray-300" />
                      Mobile Banking
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {template?.play_store_url && (
                      <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400 mb-1 sm:mb-0">Android App:</span>
                        <a 
                          href={template.play_store_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[${colors.primary}] dark:text-blue-400 hover:underline flex items-center`}
                        >
                          <span className="truncate max-w-xs">Google Play Store</span>
                          <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    {template?.app_store_url && (
                      <div className="flex flex-col sm:flex-row sm:items-center py-2">
                        <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400 mb-1 sm:mb-0">iOS App:</span>
                        <a 
                          href={template.app_store_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[${colors.primary}] dark:text-blue-400 hover:underline flex items-center`}
                        >
                          <span className="truncate max-w-xs">Apple App Store</span>
                          <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                    <FileText size={16} className="mr-2 text-gray-500 dark:text-gray-300" />
                    Bankunterlagen
                  </h3>
                </div>
                <div className="p-4">
                  {attachments.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-sm p-2">
                      Keine Bankunterlagen verfügbar
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center overflow-hidden">
                            <FileText size={16} className={`text-[${colors.primary}] dark:text-gray-300 mr-2 flex-shrink-0`} />
                            <div className="overflow-hidden">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(attachment.file_size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => downloadAttachment(attachment)}
                            size="sm"
                            variant="primary"
                            className="text-white"
                            style={{
                              backgroundColor: colors.primary,
                              borderColor: colors.primary
                            }}
                          >
                            <Download size={16} className="mr-2" />
                            Herunterladen
                          </Button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
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
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  rows={3}
                  placeholder="Beschreiben Sie, warum die Aufgabe abgelehnt wird..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zusätzliche Hinweise (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  rows={2}
                  placeholder="Weitere Hinweise für den Mitarbeiter..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={closeRejectModal}
                disabled={isProcessing}
              >
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectTask}
                disabled={!rejectReason.trim() || isProcessing}
              >
                {isProcessing ? 'Wird abgelehnt...' : 'Ablehnen'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BankdropDetails; 