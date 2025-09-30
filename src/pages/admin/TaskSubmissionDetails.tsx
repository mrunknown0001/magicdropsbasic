import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeft, User, Video, Clock, CheckCircle, Link, Mail, Key, Phone, AlertCircle, Smartphone } from 'lucide-react';
import { useSettingsContext } from '../../context/SettingsContext';

import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
// Using a custom date formatter to avoid date-fns import issues
import { supabase } from '../../lib/supabase';
import { TaskAssignment as BaseTaskAssignment, Profile, PhoneNumber } from '../../types/database';

// Extended TaskAssignment type with properties used in this component
interface TaskAssignment extends Omit<BaseTaskAssignment, 'task_template' | 'video_chat_status'> {
  assignee?: Profile;
  demo_email?: string;
  demo_password?: string;
  ident_code?: string;
  ident_url?: string;
  phone_number_id?: string;
  video_chat_code?: string;
  video_chat_status?: 'not_started' | 'accepted' | 'declined' | 'completed';
  task_name?: string;
  task_description?: string;
  task_template?: {
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    payment_amount?: number;
    priority?: string | number;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
  };
}
import { useTaskAssignment } from '../../hooks/useTaskAssignment';

// Define status labels for readability
const videoStatusLabels = {
  'not_started': 'Nicht gestartet',
  'accepted': 'Akzeptiert',
  'declined': 'Abgelehnt',
  'completed': 'Abgeschlossen'
};

const TaskSubmissionDetails: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { colors } = useSettingsContext();
  
  // Use our enhanced hook with admin functions
  // We pass no assignment ID initially since we'll fetch the submission with a custom function
  const { 
    isLoading,
    error,
    updateDemoData,
    assignPhoneNumber
  } = useTaskAssignment();
  
  const [submission, setSubmission] = useState<TaskAssignment | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [identCode, setIdentCode] = useState('');
  const [identUrl, setIdentUrl] = useState('');
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('');
  
  // Fetch the submission details with improved error handling
  const fetchSubmission = async () => {
    if (!submissionId) return;
    
    try {
      console.log('Fetching submission details for ID:', submissionId);
      
      // Use a more reliable approach: fetch all data separately and combine
      const [assignmentResult, templateResult, profileResult] = await Promise.allSettled([
        // Fetch task assignment
        supabase
        .from('task_assignments')
          .select('*')
        .eq('id', submissionId)
          .single(),
        
        // We'll fetch template after we get the assignment
        Promise.resolve(null),
        
        // We'll fetch profile after we get the assignment
        Promise.resolve(null)
      ]);
      
      if (assignmentResult.status === 'rejected') {
        throw assignmentResult.reason;
      }
      
      const assignmentData = assignmentResult.value.data;
      if (!assignmentData) {
        toast.error('Einreichung nicht gefunden');
        navigate('/admin/submissions');
        return;
      }
      
      console.log('Assignment data loaded:', assignmentData);
        
      // Now fetch template and profile data
      const fetchPromises = [];
      
      // Fetch task template if we have a template ID
      if (assignmentData.task_template_id) {
        fetchPromises.push(
          supabase
            .from('task_templates')
            .select('*')
            .eq('id', assignmentData.task_template_id)
            .single()
            .then(result => ({ type: 'template', result }))
        );
      }
      
      // Fetch assignee profile if we have an assignee ID
      if (assignmentData.assignee_id) {
        fetchPromises.push(
          supabase.rpc(
            'get_profiles_with_emails_by_ids',
            { profile_ids: [assignmentData.assignee_id] }
          ).then(result => ({ type: 'profile', result }))
        );
      }
      
      // Execute all additional fetches
      if (fetchPromises.length > 0) {
        const results = await Promise.allSettled(fetchPromises);
        
        for (const promiseResult of results) {
          if (promiseResult.status === 'fulfilled') {
            const { type, result } = promiseResult.value;
            
            if (type === 'template' && !result.error && result.data) {
              assignmentData.task_template = result.data;
              console.log('Template data loaded:', result.data);
            } else if (type === 'profile' && !result.error && result.data && result.data.length > 0) {
              assignmentData.assignee = result.data[0];
              console.log('Profile data loaded:', result.data[0]);
            }
          } else {
            console.warn('Failed to fetch additional data:', promiseResult.reason);
          }
        }
      }
      
      // If profile fetch failed, try fallback method
      if (assignmentData.assignee_id && !assignmentData.assignee) {
        console.log('Trying fallback profile fetch...');
        try {
          const { data: fallbackProfile, error: fallbackError } = await supabase
              .from('profiles')
              .select('*')
            .eq('id', assignmentData.assignee_id)
              .single();
              
          if (!fallbackError && fallbackProfile) {
            assignmentData.assignee = fallbackProfile;
            console.log('Fallback profile data loaded:', fallbackProfile);
          }
        } catch (fallbackErr) {
          console.warn('Fallback profile fetch also failed:', fallbackErr);
          }
        }
        
        // Update the state with the enhanced data
      setSubmission(assignmentData as TaskAssignment);
        
        // Initialize form fields with existing data
      setDemoEmail(assignmentData.demo_email || '');
      setDemoPassword(assignmentData.demo_password || '');
      setIdentCode(assignmentData.ident_code || '');
      setIdentUrl(assignmentData.ident_url || '');
      setSelectedPhoneNumberId(assignmentData.phone_number_id || '');
      
      console.log('Submission details fully loaded and state updated');
      
    } catch (err) {
      console.error('Error fetching submission details:', err);
      toast.error('Fehler beim Laden der Einreichungsdetails');
    }
  };
  
  // Fetch available phone numbers
  const fetchPhoneNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setPhoneNumbers(data as PhoneNumber[]);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      toast.error('Fehler beim Laden der Telefonnummern');
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchSubmission();
    fetchPhoneNumbers();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel(`submission-${submissionId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'task_assignments', filter: `id=eq.${submissionId}` },
        (payload) => {
          console.log('Submission updated:', payload);
          // Don't automatically refresh to prevent loops
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [submissionId]);
  
  // Save the test data with improved error handling and state management
  const handleSaveTestData = async () => {
    if (!submission) return;
    
    setSaving(true);
    try {
      console.log('Saving test data for submission:', submission.id);
      
      // Use the admin hook function to update demo data
      const updatedAssignment = await updateDemoData(submission.id, {
        demoEmail,
        demoPassword,
        identCode,
        identUrl,
        phoneNumberId: selectedPhoneNumberId || null
      });
      
      if (updatedAssignment) {
        // Update the local state immediately to prevent showing "unknown" data
        setSubmission(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            demo_email: demoEmail,
            demo_password: demoPassword,
            ident_code: identCode,
            ident_url: identUrl,
            phone_number_id: selectedPhoneNumberId || null,
            // Preserve existing assignee and template data
            assignee: prev.assignee,
            task_template: prev.task_template
          };
        });
        
        toast.success('Testdaten erfolgreich gespeichert');
        
        // Refresh the submission data in the background to ensure consistency
        setTimeout(() => {
          fetchSubmission();
        }, 1000);
      }
    } catch (err) {
      console.error('Error saving test data:', err);
      toast.error('Fehler beim Speichern der Testdaten');
      
      // Revert form fields to original values on error
      if (submission) {
        setDemoEmail(submission.demo_email || '');
        setDemoPassword(submission.demo_password || '');
        setIdentCode(submission.ident_code || '');
        setIdentUrl(submission.ident_url || '');
        setSelectedPhoneNumberId(submission.phone_number_id || '');
      }
    } finally {
      setSaving(false);
    }
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
  
  // Handle navigation back to submissions list
  const handleBackToList = () => {
    navigate('/admin/submissions');
  };
  
  // Handle phone number assignment with improved data preservation
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPhoneNumberId = e.target.value;
    setSelectedPhoneNumberId(newPhoneNumberId);
    
    // If we already have a submission and the phone number changed, update it immediately
    if (submission && newPhoneNumberId !== submission.phone_number_id) {
      // Use our admin function to assign the phone number
      assignPhoneNumber(submission.id, newPhoneNumberId || null)
        .then(updatedAssignment => {
          if (updatedAssignment) {
            // Update state while preserving existing data
            setSubmission(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                phone_number_id: newPhoneNumberId || null,
                // Preserve all other data
                assignee: prev.assignee,
                task_template: prev.task_template
              };
            });
            toast.success('Telefonnummer erfolgreich zugewiesen');
          }
        })
        .catch(err => {
          console.error('Error assigning phone number:', err);
          toast.error('Fehler beim Zuweisen der Telefonnummer');
          // Revert the selection on error
          setSelectedPhoneNumberId(submission.phone_number_id || '');
        });
    }
  };
  
  // Generate a random demo password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDemoPassword(result);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">
          <AlertCircle size={48} />
        </div>
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Fehler beim Laden der Daten</p>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error.message}</p>
        <Button onClick={fetchSubmission}>Erneut versuchen</Button>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Video className="text-gray-500" size={24} />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Einreichung nicht gefunden</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
          Die angeforderte Einreichung konnte nicht gefunden werden.
        </p>
        <Button onClick={handleBackToList}>Zurück zur Übersicht</Button>
      </div>
    );
  }

  // Type assertion to access profile data safely
  const assignee = submission.assignee as Profile | undefined;
  const taskTemplate = submission.task_template;

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToList} 
          className={`inline-flex items-center text-[${colors.primary}] dark:text-white hover:bg-[${colors.primary}]/10 dark:hover:bg-gray-700`}
          leftIcon={<ArrowLeft size={16} />}
        >
          Zurück zur Übersicht
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Info */}
        <Card className="col-span-1 border-0 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 pb-4">
            <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white flex items-center">
              <Video size={18} className={`mr-2 text-[${colors.primary}] dark:text-white`} />
              Einreichungsdetails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-[${colors.primary}]/10 dark:bg-gray-700 flex items-center justify-center`}>
                  <User className={`h-5 w-5 text-[${colors.primary}] dark:text-white`} />
                </div>
                <div className="ml-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Mitarbeiter</h3>
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </div>
                  ) : (
                    <>
                  <p className="text-gray-500 dark:text-gray-400">
                    {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unbekannter Mitarbeiter'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {assignee?.email || 'Keine E-Mail'}
                  </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">Aufgabe</h3>
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ) : (
                  <>
                <p className="text-gray-800 dark:text-gray-200 font-medium">
                  {taskTemplate?.title || submission.task_name || 'Unbekannte Aufgabe'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {taskTemplate?.description || submission.task_description || 'Keine Beschreibung verfügbar'}
                </p>
                {taskTemplate?.type && (
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {taskTemplate.type}
                  </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">Status</h3>
                <div className="flex items-center">
                  <div className={`px-2.5 py-1 rounded-full bg-[${colors.primary}]/10 text-[${colors.primary}] dark:bg-gray-700 dark:text-white text-sm flex items-center`}>
                    <Video size={14} className="mr-1" />
                    {videoStatusLabels[submission.video_chat_status as keyof typeof videoStatusLabels] || submission.video_chat_status}
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Aktualisiert am: {formatDate(submission.updated_at)}
                </p>
              </div>
              
              {/* Video-Chat Code section removed as requested */}
            </div>
          </CardContent>
        </Card>
        
        {/* Test Data Form */}
        <Card className="col-span-1 lg:col-span-2 border-0 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 pb-4">
            <CardTitle className="font-app font-app-medium text-gray-900 dark:text-white flex items-center">
              <Smartphone size={18} className={`mr-2 text-[${colors.primary}]`} />
              Testdaten hinzufügen
            </CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Füge Testdaten hinzu, die dem Mitarbeiter angezeigt werden sollen
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demoEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Demo E-Mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="demoEmail"
                      type="email"
                      className="pl-10 pr-4 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent"
                      placeholder="beispiel@demo.com"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="demoPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Demo Passwort
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="demoPassword"
                      type="text"
                      className={`pl-10 pr-20 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[${colors.primary}]/30 focus:border-[${colors.primary}] transition-colors`}
                      placeholder="sicheres-passwort"
                      value={demoPassword}
                      onChange={(e) => setDemoPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-[${colors.primary}] hover:text-[${colors.primary}]/80 dark:text-white dark:hover:text-gray-300`}
                      onClick={generateRandomPassword}
                    >
                      Generieren
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="identCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ident-Code
                </label>
                <input
                  id="identCode"
                  type="text"
                  className={`px-4 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[${colors.primary}]/30 focus:border-[${colors.primary}] transition-colors`}
                  placeholder="z.B. ABC123"
                  value={identCode}
                  onChange={(e) => setIdentCode(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="identUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ident-URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="identUrl"
                    type="url"
                    className="pl-10 pr-4 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent"
                    placeholder="https://example.com/ident/..."
                    value={identUrl}
                    onChange={(e) => setIdentUrl(e.target.value)}
                  />
                </div>
              </div>
              

              
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefonnummer zuweisen
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="phoneNumber"
                    className="pl-10 pr-4 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent"
                    value={selectedPhoneNumberId}
                    onChange={handlePhoneNumberChange}
                  >
                    <option value="">Telefonnummer auswählen</option>
                    {phoneNumbers.map(phone => (
                      <option key={phone.id} value={phone.id}>
                        {phone.phone_number} ({phone.service} - {phone.country})
                      </option>
                    ))}
                  </select>
                </div>
                {phoneNumbers.length === 0 && (
                  <p className={`mt-1 text-sm text-[${colors.accent}] dark:text-[${colors.accentLight}]`}>
                    Keine Telefonnummern verfügbar. Bitte fügen Sie Telefonnummern im Admin-Bereich hinzu.
                  </p>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleBackToList}
                  disabled={saving}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSaveTestData}
                  disabled={saving}
                  className="flex items-center"
                >
                  {saving ? (
                    <>
                      <Clock className="mr-1 animate-spin" size={16} />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1" size={16} />
                      <span>Speichern</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskSubmissionDetails;
