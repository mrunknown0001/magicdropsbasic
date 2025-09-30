import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeft, Edit, User, Mail, CheckCircle, XCircle, Phone, MessageSquare, Clock, ExternalLink, X, Briefcase, FileText, Settings, Euro, CreditCard } from 'lucide-react';
import { useEmployees, Employee, UpdateEmployeeData } from '../../hooks/useEmployees';
import { useEmployeePhoneNumbers } from '../../hooks/useEmployeePhoneNumbers';
import EditEmployeeModal from '../../components/admin/EditEmployeeModal';
import KycDocumentViewer from '../../components/admin/KycDocumentViewer';
import EmployeeTaskAssignments from '../../components/admin/EmployeeTaskAssignments';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { getServiceName, getCountryName } from '../../utils/serviceData';
import { motion } from 'framer-motion';
import { useEmployeeStats } from '../../hooks/useEmployeeStats';
import { useEmployeeTaskAssignments } from '../../hooks/useEmployeeTaskAssignments';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useSettingsContext } from '../../context/SettingsContext';
import { usePaymentManagement } from '../../hooks/usePaymentManagement';
import PaymentModeAssignment from '../../components/admin/PaymentModeAssignment';

const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { shouldShowPaymentManagement } = useSettingsContext();
  const { employees, loading, error, updateEmployee, updateEmployeeStatus, deleteEmployee, refreshEmployees } = useEmployees();
  const { phoneNumbers, loading: loadingPhoneNumbers, error: phoneError, refreshPhoneNumbers } = useEmployeePhoneNumbers(id);
  const { activeTasks, completedTasks, signedContracts, loading: statsLoading, error: statsError, refetch: refreshStats } = useEmployeeStats(id);
  const { getTaskAssignmentStats } = useEmployeeTaskAssignments(id, { initialRefresh: false });
  
  // Get worker balance (only in task-based payment mode)
  const {
    workerBalances,
    payoutRequests,
    paymentTransactions,
    loading: paymentLoading
  } = usePaymentManagement(shouldShowPaymentManagement());
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'kyc'>('overview');
  // Payment mode assignment state
  const [isPaymentModeModalOpen, setIsPaymentModeModalOpen] = useState(false);
  const isRefreshingRef = useRef(false);
  
  // Get worker's payment data
  const workerBalance = id ? workerBalances.find(balance => balance.worker_id === id) : null;
  const workerPayoutRequests = id ? payoutRequests.filter(req => req.worker_id === id) : [];
  const workerTransactions = id ? paymentTransactions.filter(tx => tx.worker_id === id) : [];

  // Payment mode helper
  const getPaymentModeDisplay = (paymentMode?: string) => {
    switch (paymentMode) {
      case 'verguetung':
        return { text: 'Vergütung pro Aufgabe', color: 'bg-emerald-100 text-emerald-800', icon: 'CreditCard' };
      case 'vertragsbasis':
        return { text: 'Vertragsbasis', color: 'bg-blue-100 text-blue-800', icon: 'FileText' };
      default:
        return { text: 'Nicht zugewiesen', color: 'bg-gray-100 text-gray-800', icon: 'AlertCircle' };
    }
  };
  
  // Helper function to fetch fresh employee data directly from database
  const refreshEmployeeData = useCallback(async () => {
    if (!id) return;
    
    // Prevent multiple simultaneous calls
    if (isRefreshingRef.current) {
      console.log('refreshEmployeeData already running, skipping');
      return;
    }
    
    isRefreshingRef.current = true;
    
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        // Don't log RLS errors as they're expected for regular users
        if (error.code !== 'PGRST116' && !error.message?.includes('RLS') && error.code !== '406') {
          console.error('Error fetching fresh employee data:', error);
        }
        return;
      }
      
      if (data) {
        const freshEmployee = {
          ...data,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unnamed',
        } as Employee;
        
        console.log('Fresh employee data fetched:', freshEmployee);
        setEmployee(freshEmployee);
        setIsActive(!freshEmployee.banned_until || new Date(freshEmployee.banned_until) <= new Date());
      }
    } catch (error) {
      // Silently handle auth/RLS/HTTP errors to prevent infinite retries
      if (error instanceof Error && 
          !error.message?.includes('RLS') && 
          !error.message?.includes('JWT') && 
          !error.message?.includes('406') &&
          !error.message?.includes('PGRST116')) {
        console.error('Error refreshing employee data:', error);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [id]);
  
  // Find employee from the list and force refresh when page loads
  useEffect(() => {
    if (id && employees.length > 0) {
      const foundEmployee = employees.find(emp => emp.id === id);
      if (foundEmployee) {
        setEmployee(foundEmployee);
        setIsActive(!foundEmployee.banned_until || new Date(foundEmployee.banned_until) <= new Date());
      }
    }
  }, [id, employees]);

  // Force refresh employee data when component mounts to ensure we have latest data
  useEffect(() => {
    if (id) {
      // Force refresh to get latest employee data (bypasses cache)
      refreshEmployees();
      // Only fetch fresh data if employee is not found in the list
      if (!employees.find(emp => emp.id === id)) {
        refreshEmployeeData();
      }
    }
  }, [id, refreshEmployees, employees]);

  const handleEditEmployee = async (id: string, data: UpdateEmployeeData) => {
    try {
      await updateEmployee(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      // Error is handled in the hook with toast
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      // Update UI optimistically
      const newStatus = currentStatus ? 'Inaktiv' : 'Aktiv';
      
      // Immediately update local status state
      setIsActive(!currentStatus);
      
      if (employee) {
        // Create a future banned date for deactivation, or null for activation
        const banned_until = newStatus === 'Inaktiv' 
          ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years in the future
          : null;
          
        // Update local state immediately for better UX
        setEmployee({
          ...employee,
          banned_until,
          _manuallyUpdated: true,
          _lastUpdateTime: Date.now()
        });
      }
      
      // Make the actual API call (don't wait for it to complete)
      updateEmployeeStatus(id, newStatus)
        .catch(error => {
          // Revert the optimistic UI update on error
          console.error('Error updating employee status:', error);
          setIsActive(currentStatus);
          if (employee) {
            setEmployee({
              ...employee,
              banned_until: currentStatus ? null : new Date().toISOString(),
            });
          }
        });
    } catch (error) {
      // Error is handled in the hook with toast
      console.error('Error updating employee status:', error);
      
      // Revert the optimistic UI update on error
      setIsActive(currentStatus);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employee) return;
    
    const confirmMessage = `Sind Sie sicher, dass Sie den Mitarbeiter "${employee.name}" DAUERHAFT löschen möchten?\n\nDies wird folgende Daten unwiderruflich entfernen:\n• Benutzerkonto und Profil\n• Alle zugewiesenen Aufgaben\n• Hochgeladene Dateien und KYC-Dokumente\n• Vertragsunterzeichnungen\n• Kommentare und Nachrichten\n\nDieser Vorgang kann NICHT rückgängig gemacht werden!`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteEmployee(employee.id, employee.name);
        // Redirect to employees list after successful deletion
        navigate('/admin/employees');
      } catch (error) {
        // Error is handled in the hook with toast
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-white p-4 rounded-lg">
        <p>Fehler beim Laden der Mitarbeiterdaten. Bitte versuchen Sie es später erneut.</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Mitarbeiter nicht gefunden.</p>
        <Button 
          className="mt-4" 
          onClick={() => navigate('/admin/employees')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Zurück zur Mitarbeiterliste
        </Button>
      </div>
    );
  }

  const createdAt = employee.created_at ? new Date(employee.created_at) : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="mr-4"
              onClick={() => navigate('/admin/employees')}
              leftIcon={<ArrowLeft size={16} />}
            >
              Zurück
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mitarbeiterdetails</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Detaillierte Informationen über den Mitarbeiter.
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Button
              leftIcon={<Edit size={16} />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Bearbeiten
            </Button>
            <Button
              variant="outline"
              leftIcon={isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
              onClick={() => handleStatusChange(employee.id, isActive)}
            >
              {isActive ? 'Deaktivieren' : 'Aktivieren'}
            </Button>
            <Button
              variant="outline"
              leftIcon={<X size={16} />}
              onClick={handleDeleteEmployee}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
            >
              Löschen
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <User size={16} className="mr-2" />
                Übersicht
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Briefcase size={16} className="mr-2" />
                Aufgaben
              </div>
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'kyc'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText size={16} className="mr-2" />
                KYC Dokumente
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Profil</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center">
                  <div className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl font-semibold mb-4 ${
                    isActive 
                      ? "bg-accent/10 text-accent" 
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}>
                    {employee.name?.charAt(0) || '?'}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    {employee.name || 'Unbenannt'}
                    {!isActive && (
                      <span className="ml-2 text-sm font-medium py-0.5 px-2 rounded bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                        DEAKTIVIERT
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">{employee.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}</p>
                  
                  <div className="mt-4 w-full">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900'
                        : 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900'
                    }`}>
                      {isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Kontaktinformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-accent/10 text-accent rounded-full">
                      <User size={20} />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Name</h4>
                      <p className="text-gray-500 dark:text-gray-400">{employee.name || 'Nicht angegeben'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-accent/10 text-accent rounded-full">
                      <Mail size={20} />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">E-Mail</h4>
                      <p className="text-gray-500 dark:text-gray-400">{employee.email || 'Nicht angegeben'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-accent/10 text-accent rounded-full">
                      <Clock size={20} />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Registriert am</h4>
                      <p className="text-gray-500 dark:text-gray-400">
                        {createdAt 
                          ? createdAt.toLocaleDateString('de-DE') 
                          : 'Nicht verfügbar'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phone Numbers Section */}
              <Card className="md:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Phone className="mr-2" size={20} />
                    Zugewiesene Telefonnummern
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => refreshPhoneNumbers()}
                      disabled={loadingPhoneNumbers}
                    >
                      <Clock size={16} className="mr-1" />
                      Aktualisieren
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/admin/phone-numbers')}
                    >
                      <ExternalLink size={16} className="mr-1" />
                      Alle Nummern
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingPhoneNumbers ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : phoneError ? (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-white p-4 rounded-lg">
                      <p>Fehler beim Laden der Telefonnummern. Bitte versuchen Sie es später erneut.</p>
                    </div>
                  ) : phoneNumbers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>Keine Telefonnummern zugewiesen.</p>
                      <Button 
                        className="mt-4" 
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/admin/phone-numbers')}
                      >
                        Telefonnummer zuweisen
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Nummer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Dienst
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Land
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Läuft ab
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Aktionen
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {phoneNumbers.map((phone) => (
                            <motion.tr 
                              key={phone.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Phone className="text-gray-400 mr-2" size={16} />
                                  <span className="font-medium">{phone.phone_number}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {getServiceName(phone.service)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {getCountryName(phone.country)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(new Date(phone.end_date), { addSuffix: true })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${phone.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900' : 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900'}`}>
                                  {phone.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => navigate(`/admin/phone-numbers`)}
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    title="Nachrichten anzeigen"
                                  >
                                    <MessageSquare size={16} />
                                  </button>
                                  <button
                                    onClick={() => navigate(`/admin/phone-numbers`)}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                    title="Miete verlängern"
                                  >
                                    <Clock size={16} />
                                  </button>
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

              {/* Statistics Section */}
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Statistiken
                    {statsLoading && (
                      <LoadingSpinner size="sm" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsError ? (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg">
                      <p>Fehler beim Laden der Statistiken: {statsError}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={refreshStats}
                      >
                        Erneut versuchen
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <motion.div 
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Aktive Aufgaben</h4>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statsLoading ? '...' : activeTasks}
                        </p>
                      </motion.div>
                      <motion.div 
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Abgeschlossene Aufgaben</h4>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statsLoading ? '...' : completedTasks}
                        </p>
                      </motion.div>
                      <motion.div 
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stunden gearbeitet</h4>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statsLoading ? '...' : `${getTaskAssignmentStats().totalHoursWorked}h`}
                        </p>
                      </motion.div>
                      <motion.div 
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unterzeichnete Verträge</h4>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statsLoading ? '...' : signedContracts}
                        </p>
                      </motion.div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Echtzeitdaten basierend auf aktuellen Aufgaben und Verträgen.
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={refreshStats}
                      disabled={statsLoading}
                    >
                      <Clock size={16} className="mr-1" />
                      Aktualisieren
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information Section (Vergütung mode only) */}
              {shouldShowPaymentManagement() && (
                <Card className="md:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Euro className="mr-2" size={20} />
                        Zahlungsinformationen
                      </div>
                      {paymentLoading && (
                        <LoadingSpinner size="sm" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workerBalance ? (
                      <div className="space-y-6">
                        {/* Balance Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <motion.div 
                            className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <div className="flex items-center">
                              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                <Euro className="text-emerald-600 dark:text-emerald-400" size={20} />
                              </div>
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Aktuelles Guthaben</h4>
                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                  €{workerBalance.current_balance.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div 
                            className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                <CreditCard className="text-blue-600 dark:text-blue-400" size={20} />
                              </div>
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Gesamt verdient</h4>
                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                  €{workerBalance.total_earned.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div 
                            className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <div className="flex items-center">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                                <CheckCircle className="text-gray-600 dark:text-gray-400" size={20} />
                              </div>
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Ausgezahlt</h4>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  €{workerBalance.total_paid_out.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Recent Payout Requests */}
                        {workerPayoutRequests.length > 0 && (
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                              Auszahlungsanfragen ({workerPayoutRequests.length})
                            </h4>
                            <div className="space-y-3">
                              {workerPayoutRequests.slice(0, 3).map((request) => (
                                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <div className="flex items-center">
                                    <div className={`p-2 rounded-full ${
                                      request.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                      request.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
                                      request.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                                      'bg-blue-100 dark:bg-blue-900/30'
                                    }`}>
                                      <Euro className={`${
                                        request.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                                        request.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                                        request.status === 'rejected' ? 'text-red-600 dark:text-red-400' :
                                        'text-blue-600 dark:text-blue-400'
                                      }`} size={16} />
                                    </div>
                                    <div className="ml-3">
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        €{request.amount.toFixed(2)}
                                      </p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {format(new Date(request.requested_at), 'dd.MM.yyyy', { locale: de })}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    request.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                    request.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  }`}>
                                    {request.status === 'pending' ? 'Ausstehend' :
                                     request.status === 'approved' ? 'Genehmigt' :
                                     request.status === 'rejected' ? 'Abgelehnt' :
                                     'Ausgezahlt'}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {workerPayoutRequests.length > 3 && (
                              <div className="mt-3 text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate('/admin/payment-management')}
                                >
                                  Alle Auszahlungen anzeigen
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Letzte Aktualisierung: {format(new Date(workerBalance.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/admin/payment-management')}
                          >
                            <CreditCard size={16} className="mr-1" />
                            Zahlungsmanagement
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Euro className="text-gray-400" size={24} />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Keine Zahlungsdaten
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Für diesen Mitarbeiter wurden noch keine Zahlungsdaten erstellt.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/admin/payment-management')}
                        >
                          Zahlungsmanagement öffnen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <EmployeeTaskAssignments 
              employeeId={employee.id} 
              employeeName={employee.name || 'Unbenannter Mitarbeiter'} 
            />
          )}

          {activeTab === 'kyc' && (
            <KycDocumentViewer 
              employee={employee} 
              onStatusUpdate={async () => {
                // Refresh employee data when KYC status is updated
                await refreshEmployees();
                
                // Don't call refreshEmployeeData here to prevent infinite loops
                // The real-time subscription in KycDocumentViewer will handle updates
              }} 
            />
          )}
        </div>
      </div>

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditEmployee}
        employee={employee}
        isLoading={loading}
      />
    </>
  );
};

export default EmployeeDetails;
