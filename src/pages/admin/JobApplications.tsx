import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiSearch, 
  FiEye, 
  FiCheck, 
  FiX, 
  FiCalendar,
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiSend,
  FiTrash2
} from 'react-icons/fi';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useSettingsContext } from '../../context/SettingsContext';
import type { JobApplication } from '../../types/database';
// Date formatting utility

const JobApplications: React.FC = () => {
  const { showToast } = useToast();
  const { colors } = useSettingsContext();
  
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    applicationId: string;
  } | null>(null);
  const [confirmResendEmail, setConfirmResendEmail] = useState<{
    type: 'approve' | 'reject';
    applicationId: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bewerbungen konnten nicht geladen werden.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = searchTerm === '' || 
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Update selected application in state without refetching all
  const updateSelectedApplicationInState = (updatedApp: JobApplication) => {
    setApplications(prev => prev.map(app => 
      app.id === updatedApp.id ? updatedApp : app
    ));
    setSelectedApplication(updatedApp);
  };

  // Confirm action before sending email
  const confirmApplicationAction = (applicationId: string, type: 'approve' | 'reject') => {
    setConfirmAction({ type, applicationId });
  };

  // Confirm resend email action
  const confirmResendEmailAction = (applicationId: string, type: 'approve' | 'reject') => {
    setConfirmResendEmail({ type, applicationId });
  };

  // Update application status with email sending
  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    try {
      setIsUpdating(true);
      
      // Call the appropriate email endpoint which handles both email sending and database updates
      const emailApiUrl = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001/api/email';
      const endpoint = status === 'approved' ? 'approve-application' : 'reject-application';
      
      const response = await fetch(`${emailApiUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'magic-drops-api-key-2025'
        },
        body: JSON.stringify({
          applicationId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Email sending failed');
      }

      // If admin notes were provided, update them separately
      if (adminNotes) {
        const { error: notesError } = await supabase
          .from('job_applications')
          .update({
            admin_notes: adminNotes,
          })
          .eq('id', applicationId);

        if (notesError) {
          console.warn('Failed to update admin notes:', notesError);
        }
      }

      // Get the updated application data
      const { data: updatedApp, error: fetchError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (!fetchError && updatedApp) {
        updateSelectedApplicationInState(updatedApp);
      }

      showToast({
        type: 'success',
        title: 'Bewerbung bearbeitet',
        message: `Bewerbung wurde als ${status === 'approved' ? 'eingestellt' : 'abgelehnt'} markiert und E-Mail versendet.`
      });

    } catch (error: any) {
      console.error('Error updating application:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: `Fehler beim ${status === 'approved' ? 'Einstellen' : 'Ablehnen'}: ${error.message}`
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Send email without changing status (for resending)
  const sendEmail = async (applicationId: string, emailType: 'approve' | 'reject') => {
    try {
      setIsSendingEmail(true);
      
      const emailApiUrl = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001/api/email';
      const endpoint = emailType === 'approve' ? 'approve-application' : 'reject-application';
      
      const response = await fetch(`${emailApiUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'magic-drops-api-key-2025'
        },
        body: JSON.stringify({
          applicationId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Email sending failed');
      }

      // Get the updated application data to refresh email timestamps
      const { data: updatedApp, error: fetchError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (!fetchError && updatedApp) {
        updateSelectedApplicationInState(updatedApp);
      }

      showToast({
        type: 'success',
        title: 'E-Mail versendet',
        message: `${emailType === 'approve' ? 'Bestätigungs' : 'Ablehnungs'}-E-Mail wurde erfolgreich versendet.`
      });

    } catch (error: any) {
      console.error('Error sending email:', error);
      showToast({
        type: 'error',
        title: 'Fehler',
        message: `Fehler beim Senden der E-Mail: ${error.message}`
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Get status badge with email indicator
  const getStatusBadge = (application: JobApplication) => {
    const hasEmailSent = application.email_sent_at;
    
    switch (application.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <FiClock size={12} className="mr-1" />
            Ausstehend
          </span>
        );
      case 'approved':
        return (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <FiCheckCircle size={12} className="mr-1" />
              Eingestellt
            </span>
            {hasEmailSent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <FiMail size={10} className="mr-1" />
                E-Mail gesendet
              </span>
            )}
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <FiXCircle size={12} className="mr-1" />
              Abgelehnt
            </span>
            {hasEmailSent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <FiMail size={10} className="mr-1" />
                E-Mail gesendet
              </span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Ungültiges Datum';
    }
  };

  // Statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  };

  // Delete application
  const deleteApplication = async (applicationId: string) => {
    try {
      setIsDeleting(true);
      
      // First, delete any related email queue entries
      const { error: emailQueueError } = await supabase
        .from('email_queue')
        .delete()
        .eq('application_id', applicationId);
      
      if (emailQueueError) {
        console.warn('Error deleting related email queue entries:', emailQueueError);
        // Don't throw here, continue with main deletion
      }
      
      // Delete the job application using regular client with proper RLS policy
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      // Remove from local state
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      
      // Close modal if the deleted application was selected
      if (selectedApplication?.id === applicationId) {
        setIsDetailModalOpen(false);
        setSelectedApplication(null);
      }

      showToast({
        type: 'success',
        title: 'Bewerbung gelöscht',
        message: 'Die Bewerbung wurde erfolgreich aus der Datenbank entfernt.'
      });

    } catch (error: any) {
      console.error('Error deleting application:', error);
      showToast({
        type: 'error',
        title: 'Fehler beim Löschen',
        message: `Die Bewerbung konnte nicht gelöscht werden: ${error.message}`
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bewerbungen</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verwalten Sie eingegangene Bewerbungen
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                <FiUsers size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 mr-3">
                <FiClock size={20} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ausstehend</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 mr-3">
                <FiCheckCircle size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Eingestellt</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 mr-3">
                <FiXCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Abgelehnt</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nach Name, E-Mail oder Telefon suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Alle Status</option>
                <option value="pending">Ausstehend</option>
                <option value="approved">Eingestellt</option>
                <option value="rejected">Abgelehnt</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FiUsers size={20} className="mr-2" />
            Bewerbungen ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Lade Bewerbungen...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <FiUsers size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Keine Bewerbungen gefunden, die den Filterkriterien entsprechen.'
                  : 'Noch keine Bewerbungen eingegangen.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bewerber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kontakt
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Eingegangen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApplications.map((application) => (
                    <motion.tr
                      key={application.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {application.first_name[0]}{application.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {application.first_name} {application.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {application.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center mb-1">
                            <FiMail size={14} className="mr-1 text-gray-400" />
                            {application.email}
                          </div>
                          <div className="flex items-center">
                            <FiPhone size={14} className="mr-1 text-gray-400" />
                            {application.phone}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(application)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(application.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedApplication(application);
                              setIsDetailModalOpen(true);
                            }}
                            leftIcon={<FiEye size={14} />}
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDelete(application.id)}
                            leftIcon={<FiTrash2 size={14} />}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Löschen
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Bewerbungsdetails"
        size="xl"
      >
        {selectedApplication && (
          <div className="space-y-6">
            {/* Header with Status */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedApplication.first_name} {selectedApplication.last_name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Eingegangen am {formatDate(selectedApplication.created_at)}
                </p>
              </div>
              {getStatusBadge(selectedApplication)}
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Persönliche Daten
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <FiMail size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">E-Mail:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedApplication.email}</span>
                  </div>
                  <div className="flex items-center">
                    <FiPhone size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Telefon:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedApplication.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <FiCalendar size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Geburtsdatum:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(selectedApplication.date_of_birth).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FiMapPin size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Adresse:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedApplication.street}, {selectedApplication.postal_code} {selectedApplication.city}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Weitere Informationen
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Nationalität:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedApplication.nationality || 'Nicht angegeben'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivation Text */}
            {selectedApplication.motivation_text && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Motivation und Erfahrung
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedApplication.motivation_text}
                  </p>
                </div>
              </div>
            )}

            {/* Experience Text */}
            {selectedApplication.experience_text && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Weitere Erfahrungen
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedApplication.experience_text}
                  </p>
                </div>
              </div>
            )}

            {/* Email Status */}
            {(selectedApplication.status === 'approved' || selectedApplication.status === 'rejected') && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  E-Mail Status
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedApplication.email_sent_at ? 'E-Mail gesendet' : 'E-Mail ausstehend'}
                      </span>
                    </div>
                    {selectedApplication.email_sent_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Gesendet am:</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(selectedApplication.email_sent_at)}
                        </span>
                      </div>
                    )}
                    {selectedApplication.approved_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Eingestellt am:</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(selectedApplication.approved_at)}
                        </span>
                      </div>
                    )}
                    {selectedApplication.rejected_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Abgelehnt am:</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(selectedApplication.rejected_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selectedApplication.admin_notes && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Admin-Notizen
                </h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {selectedApplication.admin_notes}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedApplication.status === 'pending' && (
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  onClick={() => confirmApplicationAction(selectedApplication.id, 'reject')}
                  disabled={isUpdating}
                  leftIcon={<FiX size={16} />}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Ablehnen
                </Button>
                <Button
                  onClick={() => confirmApplicationAction(selectedApplication.id, 'approve')}
                  disabled={isUpdating}
                  leftIcon={<FiCheck size={16} />}
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                  className="hover:opacity-90 transition-opacity"
                >
                  {isUpdating ? 'Wird aktualisiert...' : 'Einstellen'}
                </Button>
              </div>
            )}

            {/* Email Management Buttons for processed applications */}
            {(selectedApplication.status === 'approved' || selectedApplication.status === 'rejected') && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  E-Mail Verwaltung
                </h4>
                <div className="flex flex-wrap gap-3">
                  {/* Send/Resend Approval Email */}
                  <Button
                    variant="ghost"
                    onClick={() => confirmResendEmailAction(selectedApplication.id, 'approve')}
                    disabled={isSendingEmail}
                    leftIcon={<FiSend size={16} />}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                  >
                    {isSendingEmail ? 'Wird gesendet...' : 'Bestätigungs-E-Mail senden'}
                  </Button>
                  
                  {/* Send/Resend Rejection Email */}
                  <Button
                    variant="ghost"
                    onClick={() => confirmResendEmailAction(selectedApplication.id, 'reject')}
                    disabled={isSendingEmail}
                    leftIcon={<FiSend size={16} />}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {isSendingEmail ? 'Wird gesendet...' : 'Ablehnungs-E-Mail senden'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Sie können jederzeit Bestätigungs- oder Ablehnungs-E-Mails senden, unabhängig vom aktuellen Status.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'approve' ? 'Bewerbung einstellen' : 'Bewerbung ablehnen'}
        size="md"
      >
        {confirmAction && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${
                confirmAction.type === 'approve' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {confirmAction.type === 'approve' ? (
                  <FiCheck size={20} className="text-green-600 dark:text-green-400" />
                ) : (
                  <FiX size={20} className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {confirmAction.type === 'approve' ? 'Bewerbung einstellen?' : 'Bewerbung ablehnen?'}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {confirmAction.type === 'approve' 
                    ? 'Dies wird eine Bestätigungs-E-Mail an den Bewerber senden und die Bewerbung als eingestellt markieren.'
                    : 'Dies wird eine Ablehnungs-E-Mail an den Bewerber senden und die Bewerbung als abgelehnt markieren.'
                  }
                </p>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Möchten Sie fortfahren?
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => setConfirmAction(null)}
                disabled={isUpdating}
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  const status = confirmAction.type === 'approve' ? 'approved' : 'rejected';
                  updateApplicationStatus(confirmAction.applicationId, status);
                  setConfirmAction(null);
                }}
                disabled={isUpdating}
                leftIcon={confirmAction.type === 'approve' ? <FiCheck size={16} /> : <FiX size={16} />}
                style={{ 
                  backgroundColor: confirmAction.type === 'approve' ? colors.primary : '#dc2626',
                  color: 'white' 
                }}
                className="hover:opacity-90 transition-opacity"
              >
                {isUpdating ? 'Wird verarbeitet...' : (confirmAction.type === 'approve' ? 'Einstellen' : 'Ablehnen')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Confirmation Modal */}
      <Modal
        isOpen={!!confirmResendEmail}
        onClose={() => setConfirmResendEmail(null)}
        title={confirmResendEmail?.type === 'approve' ? 'Bestätigungs-E-Mail senden' : 'Ablehnungs-E-Mail senden'}
        size="md"
      >
        {confirmResendEmail && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${
                confirmResendEmail.type === 'approve' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {confirmResendEmail.type === 'approve' ? (
                  <FiSend size={20} className="text-green-600 dark:text-green-400" />
                ) : (
                  <FiSend size={20} className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {confirmResendEmail.type === 'approve' ? 'Bestätigungs-E-Mail senden?' : 'Ablehnungs-E-Mail senden?'}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {confirmResendEmail.type === 'approve' 
                    ? 'Dies wird eine Bestätigungs-E-Mail an den Bewerber senden.'
                    : 'Dies wird eine Ablehnungs-E-Mail an den Bewerber senden.'
                  }
                </p>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Möchten Sie die E-Mail jetzt senden?
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => setConfirmResendEmail(null)}
                disabled={isSendingEmail}
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  sendEmail(confirmResendEmail.applicationId, confirmResendEmail.type);
                  setConfirmResendEmail(null);
                }}
                disabled={isSendingEmail}
                leftIcon={<FiSend size={16} />}
                style={{ 
                  backgroundColor: confirmResendEmail.type === 'approve' ? colors.primary : '#dc2626',
                  color: 'white' 
                }}
                className="hover:opacity-90 transition-opacity"
              >
                {isSendingEmail ? 'Wird gesendet...' : 'E-Mail senden'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Bewerbung löschen"
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-4">
              <FiTrash2 size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bewerbung unwiderruflich löschen?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warnung:</strong> Alle Daten dieser Bewerbung werden permanent gelöscht, 
              einschließlich persönlicher Informationen und E-Mail-Verlauf.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => confirmDelete && deleteApplication(confirmDelete)}
              disabled={isDeleting}
              leftIcon={<FiTrash2 size={16} />}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JobApplications;
 