import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';

// Simplified stats interface
export interface AdminDashboardStats {
  employeeCount: number;
  activeTasksCount: number;
  contractsCount: number;
  bankdropsCount: number;
  totalWorkedHours: number;
  kycPendingCount: number;
  lastFetchTime: number;
}

// Video chat submission interface
export interface VideoSubmission {
  id: string;
  employee_name: string;
  task_name: string;
  status: string;
  date: string;
}

// Task submission interface for activity feed
export interface TaskSubmission {
  id: string;
  employee_name: string;
  task_name: string;
  status: string;
  date: string;
  type: 'task' | 'video' | 'kyc';
}

// Job application interface for latest applications
export interface JobApplicationSummary {
  id: string;
  applicant_name: string;
  email: string;
  status: string;
  date: string;
  preferred_job_type?: string;
}

// Helper function to format date as DD.MM.YYYY
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Default stats
const defaultStats: AdminDashboardStats = {
  employeeCount: 0,
  activeTasksCount: 0,
  contractsCount: 0,
  bankdropsCount: 0,
  totalWorkedHours: 0,
  kycPendingCount: 0,
  lastFetchTime: 0
};

/**
 * Hook for fetching admin dashboard statistics
 */
export const useAdminDashboardStats = () => {
  const [stats, setStats] = useState<AdminDashboardStats>(() => {
    // Try to load from session storage first
    try {
      const storedStats = sessionStorage.getItem('adminDashboardStats');
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats);
        // Return cached data if it's not older than 5 minutes
        if (parsedStats.lastFetchTime && (Date.now() - parsedStats.lastFetchTime < 5 * 60 * 1000)) {
          return { ...defaultStats, ...parsedStats };
        }
      }
    } catch (error) {
      console.error('Error retrieving stored stats:', error);
    }
    return defaultStats;
  });
  
  const [videoSubmissions, setVideoSubmissions] = useState<VideoSubmission[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplicationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent multiple fetches
  const isFetchingRef = useRef(false);
  
  // Fetch video chat submissions
  const fetchVideoSubmissions = useCallback(async () => {
    try {
      // First, get the task assignments with their IDs only
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('task_assignments')
        .select(`
          id,
          assignee_id,
          video_chat_status,
          updated_at,
          task_template:task_templates(title)
        `)
        .eq('video_chat_status', 'accepted')
        .order('updated_at', { ascending: false })
        .limit(4);
      
      if (assignmentError) throw assignmentError;
      
      if (assignmentData && assignmentData.length > 0) {
        // Extract the assignee IDs
        const assigneeIds = assignmentData.map(item => item.assignee_id).filter(Boolean);
        
        if (assigneeIds.length === 0) {
          setVideoSubmissions([]);
          return;
        }
        
        try {
          // Use the secure database function to get profiles with emails
          const { data: profilesData, error: profilesError } = await supabase.rpc(
            'get_profiles_with_emails_by_ids',
            { profile_ids: assigneeIds }
          );
          
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            // Continue with what we have
          }
          
          if (profilesData && profilesData.length > 0) {
            // Create a map for quick profile lookup
            const profilesMap = new Map<string, any>();
            
            // Populate the map
            profilesData.forEach((profile: { id: string; [key: string]: any }) => {
              profilesMap.set(profile.id, profile);
            });
            
            // Combine profiles with task assignments
            const submissions: VideoSubmission[] = assignmentData.map(item => {
              const profile = profilesMap.get(item.assignee_id);
              const taskTemplate = item.task_template as Record<string, any> || {};
              
              return {
                id: item.id,
                employee_name: profile 
                  ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
                  : 'Unbekannt',
                task_name: taskTemplate.title || 'Unbekannte Aufgabe',
                status: item.video_chat_status,
                date: formatDate(new Date(item.updated_at))
              };
            });
            
            setVideoSubmissions(submissions);
            return;
          }
        } catch (profileErr) {
          console.error('Error in profile fetch:', profileErr);
          // Continue with what we have
        }
        
        // Fallback if profile fetch fails
        const submissions: VideoSubmission[] = assignmentData.map(item => {
          const taskTemplate = item.task_template as Record<string, any> || {};
          
          return {
            id: item.id,
            employee_name: 'Unbekannt',
            task_name: taskTemplate.title || 'Unbekannte Aufgabe',
            status: item.video_chat_status,
            date: formatDate(new Date(item.updated_at))
          };
        });
        
        setVideoSubmissions(submissions);
      } else {
        setVideoSubmissions([]);
      }
    } catch (err) {
      console.error('Error fetching video submissions:', err);
      setVideoSubmissions([]);
    }
  }, []);
  
  // Fetch task submissions and KYC submissions for activity feed
  const fetchTaskSubmissions = useCallback(async () => {
    try {
      const submissions: TaskSubmission[] = [];
      
      // Fetch pending task submissions
      const { data: taskSubmissionData, error: taskError } = await supabase
        .from('task_submissions')
        .select(`
          id,
          assignee_id,
          created_at,
          status,
          task_assignment:task_assignments(
            task_template:task_templates(title)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!taskError && taskSubmissionData) {
        // Get assignee profiles for task submissions
        const assigneeIds = taskSubmissionData.map(item => item.assignee_id).filter(Boolean);
        
        if (assigneeIds.length > 0) {
          try {
            const { data: profilesData, error: profilesError } = await supabase.rpc(
              'get_profiles_with_emails_by_ids',
              { profile_ids: assigneeIds }
            );
            
            if (!profilesError && profilesData) {
              const profilesMap = new Map<string, any>();
              profilesData.forEach((profile: { id: string; [key: string]: any }) => {
                profilesMap.set(profile.id, profile);
              });
              
              taskSubmissionData.forEach(item => {
                const profile = profilesMap.get(item.assignee_id);
                const taskAssignment = item.task_assignment as any;
                const taskTemplate = taskAssignment?.task_template;
                
                submissions.push({
                  id: item.id,
                  employee_name: profile 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
                    : 'Unbekannt',
                  task_name: taskTemplate?.title || 'Unbekannte Aufgabe',
                  status: item.status,
                  date: formatDate(new Date(item.created_at)),
                  type: 'task'
                });
              });
            }
          } catch (profileErr) {
            console.error('Error fetching profiles for task submissions:', profileErr);
          }
        }
      }
      
      // Fetch recent KYC submissions
      const { data: kycData, error: kycError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, kyc_status, updated_at')
        .eq('kyc_status', 'in_review')
        .eq('role', 'employee')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (!kycError && kycData) {
        console.log('KYC activity data:', kycData);
        kycData.forEach(profile => {
          submissions.push({
            id: `kyc-${profile.id}`,
            employee_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unbekannt',
            task_name: 'KYC-Verifizierung',
            status: profile.kyc_status,
            date: formatDate(new Date(profile.updated_at)),
            type: 'kyc'
          });
        });
      } else {
        console.error('Error fetching KYC activity data:', kycError);
      }
      
      // Sort all submissions by date (newest first) and limit to 8
      const sortedSubmissions = submissions
        .sort((a, b) => {
          const dateA = new Date(a.date.split('.').reverse().join('-'));
          const dateB = new Date(b.date.split('.').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 8);
      
      setTaskSubmissions(sortedSubmissions);
    } catch (err) {
      console.error('Error fetching task submissions:', err);
      setTaskSubmissions([]);
    }
  }, []);
  
  // Fetch latest job applications
  const fetchJobApplications = useCallback(async () => {
    try {
      const { data: applicationData, error: applicationError } = await supabaseAdmin
        .from('job_applications')
        .select('id, first_name, last_name, email, status, preferred_job_type, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (!applicationError && applicationData) {
        const applications: JobApplicationSummary[] = applicationData.map(app => ({
          id: app.id,
          applicant_name: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unbekannt',
          email: app.email,
          status: app.status || 'pending',
          date: formatDate(new Date(app.created_at)),
          preferred_job_type: app.preferred_job_type || undefined
        }));
        
        setJobApplications(applications);
        console.log('Job applications loaded:', applications.length);
      } else {
        console.error('Error fetching job applications:', applicationError);
        setJobApplications([]);
      }
    } catch (err) {
      console.error('Error fetching job applications:', err);
      setJobApplications([]);
    }
  }, []);
  
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (force = false) => {
    // Check if we're already fetching
    if (isFetchingRef.current) {
      console.log('Data fetch already in progress, skipping');
      return;
    }
    
    // Check for cooling period (5 seconds between fetches, unless forced)
    const now = Date.now();
    const coolingPeriod = 5000; // 5 seconds
    
    if (!force && stats.lastFetchTime && (now - stats.lastFetchTime < coolingPeriod)) {
      console.log(`In cooling period, not fetching again. Last fetch: ${new Date(stats.lastFetchTime).toLocaleTimeString()}`);
      return;
    }
    
    // If we have data in cache that's not too old (< 5 minutes), don't show loading state
    const hasRecentData = stats.lastFetchTime && (now - stats.lastFetchTime < 5 * 60 * 1000);
    if (!hasRecentData) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    setError(null);
    
    try {
      console.log('Fetching admin dashboard data...');
      
      // Initialize stats object with defaults and timestamp
      let statsData = { 
        ...defaultStats,
        lastFetchTime: Date.now()
      };
      
      // Fetch employee count
      try {
        // Use the secure RPC function
        const { data: profilesData, error: rpcError } = await supabase.rpc(
          'get_profiles_with_emails'
        );
        
        if (!rpcError && profilesData) {
          // Count employees by filtering out admins
          statsData.employeeCount = profilesData.filter(
            (emp: any) => emp.role !== 'admin'
          ).length;
        } else if (rpcError) {
          // Fallback to traditional query if RPC fails
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, role');
            
          if (!profilesError && profiles) {
            statsData.employeeCount = profiles.filter(
              emp => emp.role !== 'admin'
            ).length;
          }
        }
      } catch (err) {
        console.error('Error fetching employee count:', err);
      }
      
      // Fetch active task assignments
      try {
        const { count: activeTasksCount, error: tasksError } = await supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .not('status', 'eq', 'completed');
          
        if (!tasksError && activeTasksCount !== null) {
          statsData.activeTasksCount = activeTasksCount;
        }
      } catch (err) {
        console.warn('Could not fetch task_assignments:', err);
      }
      
      // Fetch contracts count
      try {
        const { count: contractsCount, error: contractsError } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true });
          
        if (!contractsError && contractsCount !== null) {
          statsData.contractsCount = contractsCount;
        }
      } catch (err) {
        console.warn('Could not fetch contracts:', err);
      }
      
      // Fetch count of bankdrops (task assignments with documents)
      try {
        // First, get all task templates of type 'bankdrop'
        const { data: templates, error: templatesError } = await supabase
          .from('task_templates')
          .select('id')
          .eq('type', 'bankdrop');
          
        if (!templatesError && templates && templates.length > 0) {
          const templateIds = templates.map(t => t.id);
          
          // Get all task assignments for bankdrop templates
          const { data: assignments, error: assignmentsError } = await supabase
            .from('task_assignments')
            .select('id, task_id')
            .in('task_template_id', templateIds);
            
          if (!assignmentsError && assignments && assignments.length > 0) {
            // Get task IDs
            const taskIds = assignments.map(a => a.task_id).filter(Boolean);
            
            if (taskIds.length > 0) {
              // Count assignments with documents
              const { data: attachments, error: attachmentsError } = await supabase
                .from('task_attachments')
                .select('task_id')
                .in('task_id', taskIds);
                
              if (!attachmentsError && attachments) {
                // Count unique task IDs with attachments
                const tasksWithDocuments = new Set(attachments.map(a => a.task_id));
                statsData.bankdropsCount = tasksWithDocuments.size;
                console.log('Bankdrops count (tasks with documents):', tasksWithDocuments.size);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch bankdrops count:', err);
      }
      
      // Calculate total worked hours for all employees this month
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const { data: timeEntries, error: timeEntriesError } = await supabase
          .from('time_entries')
          .select('hours')
          .eq('status', 'approved')
          .gte('entry_date', firstDayOfMonth.toISOString().split('T')[0]);
          
        if (!timeEntriesError && timeEntries) {
          statsData.totalWorkedHours = timeEntries.reduce((total, entry) => total + (entry.hours || 0), 0);
        }
      } catch (err) {
        console.warn('Could not fetch total worked hours:', err);
      }
      
      // Fetch KYC pending count (only "in_review" status)
      try {
        const { count: kycPendingCount, error: kycError } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('kyc_status', 'in_review')
          .eq('role', 'employee');
          
        if (!kycError && kycPendingCount !== null) {
          statsData.kycPendingCount = kycPendingCount;
          console.log('KYC pending count:', kycPendingCount);
        } else {
          console.error('Error fetching KYC count:', kycError);
        }
      } catch (err) {
        console.warn('Could not fetch KYC pending count:', err);
      }
      
      // Store in state and session storage
      setStats(statsData);
      sessionStorage.setItem('adminDashboardStats', JSON.stringify(statsData));
      
      // Also fetch video submissions, task submissions, and job applications
      await fetchVideoSubmissions();
      await fetchTaskSubmissions();
      await fetchJobApplications();
      
      return statsData;
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchVideoSubmissions, fetchTaskSubmissions, fetchJobApplications, stats.lastFetchTime]);
  
  // Load data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  return {
    stats,
    videoSubmissions,
    taskSubmissions,
    jobApplications,
    loading,
    error,
    fetchData: fetchDashboardData
  };
}; 