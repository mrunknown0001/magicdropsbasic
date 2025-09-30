import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TaskTemplate, TaskAssignment, Profile } from '../../types/database';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Search, Filter, User, Clock, CheckCircle, AlertCircle, Edit, RefreshCw, FileText, Database, Briefcase } from 'lucide-react';
import { useSettingsContext } from '../../context/SettingsContext';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import ShimmerEffect from '../../components/ui/ShimmerEffect';
// Using a custom date formatter to avoid date-fns import issues

interface BankdropSubmission {
  id: string;
  task_id?: string;
  task_template_id: string;
  template_title: string;
  template_type: string;
  assignee_id: string;
  employee_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  demo_email?: string;
  demo_password?: string;
  ident_code?: string;
}

// Custom date formatter
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }
    
    // Format as dd.MM.yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (e) {
    return 'Ungültiges Datum';
  }
};

const Bankdrops: React.FC = () => {
  const navigate = useNavigate();
  const { colors } = useSettingsContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [submissions, setSubmissions] = useState<BankdropSubmission[]>([]);
  
  // Refs to prevent multiple fetches and infinite loops
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const subscriptionRef = useRef<any>(null);

  // Filter submissions based on search term
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission =>
      searchTerm === '' ||
      submission.template_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.demo_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.ident_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [submissions, searchTerm]);

  // Fetch all bankdrop submissions with documents
  useEffect(() => {
    const fetchBankdropSubmissions = async () => {
      // Check if we're already fetching
      if (isFetchingRef.current) {
        console.log('Data fetch already in progress for Bankdrops, skipping');
        return;
      }
      
      // Add a cooling period to prevent rapid re-fetches
      const now = Date.now();
      const coolingPeriod = 5000; // 5 seconds
      
      if ((now - lastFetchTimeRef.current < coolingPeriod) && lastFetchTimeRef.current > 0) {
        console.log(`In cooling period for Bankdrops, not fetching again. Last fetch: ${new Date(lastFetchTimeRef.current).toLocaleTimeString()}`);
        return;
      }
      
      // Check if we've already fetched
      if (hasFetchedRef.current && submissions.length > 0) {
        console.log('Bankdrops data already fetched, using cached data');
        return;
      }
      
      console.log('Fetching Bankdrops data...');
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      
      try {
        // First, get all task templates of type 'bankdrop'
        const { data: templates, error: templatesError } = await supabase
          .from('task_templates')
          .select('id, title, type')
          .eq('type', 'bankdrop');
          
        if (templatesError) throw templatesError;
        
        if (!templates || templates.length === 0) {
          console.log('No bankdrop templates found');
          setSubmissions([]);
          setLoading(false);
          isFetchingRef.current = false;
          hasFetchedRef.current = true;
          return;
        }
        
        const templateIds = templates.map(t => t.id);
        
        // Get all task assignments for bankdrop templates
        const { data: assignments, error: assignmentsError } = await supabase
          .from('task_assignments')
          .select(`
            id,
            task_id,
            task_template_id,
            assignee_id,
            status,
            created_at,
            updated_at,
            demo_email,
            demo_password,
            ident_code,
            task_template:task_templates(title, type)
          `)
          .in('task_template_id', templateIds)
          .order('updated_at', { ascending: false });
          
        if (assignmentsError) throw assignmentsError;
        
        if (!assignments || assignments.length === 0) {
          console.log('No bankdrop assignments found');
          setSubmissions([]);
          setLoading(false);
          isFetchingRef.current = false;
          hasFetchedRef.current = true;
          return;
        }
        
        // Get all employee data
        const assigneeIds = assignments.map(a => a.assignee_id).filter(Boolean);
        const { data: profiles, error: profilesError } = await supabase.rpc(
          'get_profiles_with_emails_by_ids',
          { profile_ids: assigneeIds }
        );
        
        // Create a map for profile lookup
        const profileMap: Record<string, Profile> = {};
        if (profiles && !profilesError) {
          profiles.forEach((profile: Profile) => {
            profileMap[profile.id] = profile;
          });
        }
        
        // Count documents for each assignment
        const taskIds = assignments.map(a => a.task_id).filter(Boolean);
        let documentCounts: Record<string, number> = {};
        
        if (taskIds.length > 0) {
          // Get all attachments for these tasks
          const { data: attachments, error: attachmentsError } = await supabase
            .from('task_attachments')
            .select('task_id, id')
            .in('task_id', taskIds);
            
          if (!attachmentsError && attachments) {
            // Count documents per task
            attachments.forEach(attachment => {
              if (attachment.task_id) {
                documentCounts[attachment.task_id] = (documentCounts[attachment.task_id] || 0) + 1;
              }
            });
          }
        }
        
        // Combine all data
        const bankdropSubmissions: BankdropSubmission[] = assignments.map(assignment => {
          const taskTemplate = assignment.task_template as any;
          const profile = profileMap[assignment.assignee_id];
          
          return {
            id: assignment.id,
            task_id: assignment.task_id,
            task_template_id: assignment.task_template_id,
            template_title: taskTemplate?.title || 'Unbekannte Vorlage',
            template_type: taskTemplate?.type || 'bankdrop',
            assignee_id: assignment.assignee_id,
            employee_name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
              : 'Unbekannter Mitarbeiter',
            status: assignment.status,
            created_at: assignment.created_at,
            updated_at: assignment.updated_at,
            document_count: assignment.task_id ? documentCounts[assignment.task_id] || 0 : 0,
            demo_email: assignment.demo_email,
            demo_password: assignment.demo_password,
            ident_code: assignment.ident_code
          };
        });
        
        // Filter to only show submissions with documents
        const submissionsWithDocuments = bankdropSubmissions.filter(sub => sub.document_count > 0);
        
        setSubmissions(submissionsWithDocuments);
        hasFetchedRef.current = true;
      } catch (err) {
        console.error('Error fetching bankdrop submissions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch bankdrop submissions'));
        toast.error('Fehler beim Laden der Bankdrop-Daten');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };
    
    // Setup subscription for task_assignments and task_attachments tables
    const setupSubscriptions = () => {
      if (subscriptionRef.current) {
        // Clean up existing subscription
        supabase.removeChannel(subscriptionRef.current);
      }
      
      const channel = supabase.channel('bankdrops-changes');
      
      // Subscribe to task assignments changes
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_assignments' },
          (payload) => {
            console.log('Task assignment change detected:', payload);
            // Reset fetch flag to force a refresh, but respect cooling period
            if (!isFetchingRef.current) {
              const now = Date.now();
              if (now - lastFetchTimeRef.current > 5000) {
                console.log('Changes detected, refreshing data');
                hasFetchedRef.current = false;
                fetchBankdropSubmissions();
              } else {
                console.log('Changes detected but in cooling period');
              }
            }
          }
        )
        // Subscribe to task attachments changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_attachments' },
          (payload) => {
            console.log('Task attachment change detected:', payload);
            // Reset fetch flag to force a refresh, but respect cooling period
            if (!isFetchingRef.current) {
              const now = Date.now();
              if (now - lastFetchTimeRef.current > 5000) {
                console.log('Changes detected, refreshing data');
                hasFetchedRef.current = false;
                fetchBankdropSubmissions();
              } else {
                console.log('Changes detected but in cooling period');
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`Bankdrops subscription status: ${status}`);
        });
      
      subscriptionRef.current = channel;
    };
    
    fetchBankdropSubmissions();
    setupSubscriptions();
    
    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up Bankdrops subscriptions');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, []);

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

  // Loading state UI
  const renderLoading = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <ShimmerEffect width="250px" height="32px" className="mb-2" />
            <ShimmerEffect width="350px" height="20px" />
          </div>
          <ShimmerEffect width="150px" height="40px" className="mt-4 md:mt-0" />
        </div>
        
        <Card>
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <ShimmerEffect width="200px" height="24px" />
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
              <ShimmerEffect width="200px" height="40px" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <ShimmerEffect width="200px" height="24px" className="mb-2" />
                      <ShimmerEffect width="300px" height="16px" />
                    </div>
                    <ShimmerEffect width="100px" height="32px" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading && submissions.length === 0) {
    return renderLoading();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Fehler beim Laden der Bankdrops
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            Es gab ein Problem beim Laden der Bankdrop-Informationen. Bitte versuchen Sie es erneut.
          </p>
          <Button onClick={() => { hasFetchedRef.current = false; window.location.reload(); }}>
            Erneut versuchen
          </Button>
        </div>
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
              <Briefcase size={24} className={`text-[${colors.primary}] dark:text-white`} />
            </div>
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white flex items-center">
                Bankdrops
                {loading && submissions.length === 0 && (
                  <span className="ml-3 inline-block">
                    <LoadingSpinner size="sm" />
                  </span>
                )}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 font-app">
                Alle Bankdrop-Aufträge mit hochgeladenen Dokumenten
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Button
              onClick={() => navigate('/admin/task-templates/create')}
              leftIcon={<Edit size={16} />}
              style={{ backgroundColor: colors.primary, color: 'white' }}
              className="hover:opacity-90 transition-opacity"
            >
              Neuer Bankdrop
            </Button>
          </div>
        </div>
      </motion.div>
      
      <Card className="border-0 shadow-sm overflow-hidden dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="relative flex-1 w-full mb-6">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-[${colors.primary}]/60 dark:text-gray-300`} size={18} />
            <input
              type="text"
              placeholder="Nach Titel, Mitarbeiter oder Code suchen..."
              className={`pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[${colors.primary}]/30 focus:border-[${colors.primary}] transition-colors`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Briefcase className="text-gray-500 dark:text-gray-300" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Bankdrops gefunden</h3>
              <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                Es wurden keine Bankdrop-Aufträge mit hochgeladenen Dokumenten gefunden
              </p>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {filteredSubmissions.map((submission) => (
                <motion.div 
                  key={submission.id}
                  variants={item}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {submission.template_title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-[${colors.primary}]/10 text-[${colors.primary}] dark:bg-gray-700 dark:text-white flex items-center`}>
                          <AlertCircle size={12} className="mr-1" />
                          {submission.template_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          submission.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-white' 
                            : `bg-[${colors.accent}]/10 text-[${colors.accent}] dark:bg-gray-700 dark:text-white`
                        }`}>
                          {submission.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <div className="flex items-center">
                          <User size={14} className="mr-1.5 text-gray-500 dark:text-gray-300" />
                          {submission.employee_name}
                        </div>
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1.5 text-gray-500 dark:text-gray-300" />
                          {formatDate(submission.updated_at)}
                        </div>
                        <div className="flex items-center">
                          <FileText size={14} className="mr-1.5 text-gray-500 dark:text-gray-300" />
                          {submission.document_count} Dokumente
                        </div>
                        {submission.demo_email && (
                          <div className="flex items-center">
                            <Database size={14} className="mr-1.5 text-gray-500 dark:text-gray-300" />
                            {submission.demo_email}
                          </div>
                        )}
                        {submission.ident_code && (
                          <div className="flex items-center">
                            <Database size={14} className="mr-1.5 text-gray-500 dark:text-gray-300" />
                            Code: {submission.ident_code}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action button */}
                    <div className="flex items-center space-x-2 mt-4 md:mt-0">
                      <Button
                        onClick={() => navigate(`/admin/bankdrops/${submission.task_template_id}?assignment=${submission.id}`)}
                        variant="outline"
                        size="sm"
                        className={`border-[${colors.primary}] dark:border-gray-600 text-[${colors.primary}] dark:text-white hover:bg-[${colors.primary}]/10 dark:hover:bg-gray-600`}
                        leftIcon={<Edit size={16} />}
                      >
                        Details anzeigen
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Bankdrops; 