import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { TaskTemplate } from '../../types/database';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FiPlus, FiSearch, FiTrash, FiEdit, FiEye, FiFilter, FiCopy, FiMoreVertical, FiUserPlus, FiX, FiCheck, FiStar, FiClock, FiBriefcase } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigation } from '../../context/NavigationContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
// Using a custom date formatter to avoid date-fns import issues
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
import AnimatedButton from '../../components/ui/AnimatedButton';
import ShimmerEffect from '../../components/ui/ShimmerEffect';
import { useTaskTemplates } from '../../hooks/useTaskTemplates';
import { useEmployees } from '../../hooks/useEmployees';
import Input from '../../components/ui/Input';
import { useSettingsContext } from '../../context/SettingsContext';

// Priorität-Typen für Aufgaben
const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Priorität-Labels für die Anzeige
const priorityLabels = {
  [TaskPriority.LOW]: 'Niedrig',
  [TaskPriority.MEDIUM]: 'Mittel',
  [TaskPriority.HIGH]: 'Hoch'
};

// Farben für Priorität
const priorityColors = {
  [TaskPriority.LOW]: { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-600', darkText: 'dark:text-gray-200' },
  [TaskPriority.MEDIUM]: { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-600', darkText: 'dark:text-blue-200' },
  [TaskPriority.HIGH]: { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-600', darkText: 'dark:text-red-200' }
};

const TaskTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { colors, shouldShowPaymentManagement } = useSettingsContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [assignModalTemplate, setAssignModalTemplate] = useState<TaskTemplate | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  
  const { templates, fetchTemplates: fetchTaskTemplates, deleteTemplate: deleteTaskTemplate, createTaskFromTemplate } = useTaskTemplates();
  const { employees, loading: employeesLoading, error: employeesError, refreshEmployees } = useEmployees();
  
  // Fetch templates function - uses the hook's fetchTemplates but handles loading/error states locally
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the fetchTemplates function from the hook
      await fetchTaskTemplates();
      
      // The templates will be updated in the hook's state and available via the templates variable
    } catch (err) {
      console.error('Failed to fetch task templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch task templates'));
      toast.error('Failed to fetch task templates');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete template function
  const deleteTemplate = async (id: string) => {
    try {
      await deleteTaskTemplate(id);
      return true;
    } catch (err) {
      console.error('Failed to delete task template:', err);
      toast.error('Failed to delete task template');
      throw err;
    }
  };
  
  // Handle retry functionality
  const handleRetry = () => {
    fetchTemplates();
  };
  
  // Get navigation context to detect when user navigates to this view
  const { isNewNavigation, lastRefreshTimestamp } = useNavigation();
  
  // Use a ref to store the channel to prevent multiple subscriptions
  const channelRef = React.useRef<any>(null);
  
  // Close dropdowns when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Make sure to ignore clicks that are part of actions
      if (event.target instanceof Element && 
          (event.target.closest('button[data-action="edit"]') || 
           event.target.closest('button[data-action="duplicate"]') || 
           event.target.closest('button[data-action="delete"]'))) {
        return;
      }
      setOpenDropdownId(null);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fetch templates only when navigating to this view or when manually refreshed
  useEffect(() => {
    // Check if this is a new navigation to this view
    if (isNewNavigation('/admin/task-templates')) {
      console.log('Navigation to TaskTemplates detected, fetching data...');
      fetchTemplates();
    }
    
    // Only create a subscription if one doesn't already exist
    if (!channelRef.current) {
      console.log('Creating new subscription for task templates');
      channelRef.current = supabase.channel('task_templates_changes');
      channelRef.current
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'task_templates' }, 
            (payload: any) => {
              console.log('Task template change detected:', payload.eventType);
              // Don't automatically refetch - user will see changes on next navigation
            }
        )
        .subscribe();
    }
    
    // Clean up subscription when component unmounts
    return () => {
      if (channelRef.current) {
        console.log('Unsubscribing from task templates channel');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [isNewNavigation, lastRefreshTimestamp]);
  
  // Memoize filtered templates to prevent unnecessary recalculations
  const filteredTemplates = useMemo(() => {
    return templates.filter((template: TaskTemplate) => {
      const matchesSearch = 
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !filterType || template.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [templates, searchTerm, filterType]); // Only recalculate when these dependencies change

  // Extract unique types for filtering
  const templateTypes = [...new Set(templates.map((template: TaskTemplate) => template.type))].sort();

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Aufgabenvorlage löschen möchten?')) {
      try {
        await deleteTemplate(id);
        toast.success('Aufgabenvorlage erfolgreich gelöscht');
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const handleDuplicateTemplate = (template: TaskTemplate, event?: React.MouseEvent) => {
    // If event exists, stop propagation
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Close the dropdown
    setOpenDropdownId(null);
    
    // Navigate to create page with template data in state
    navigate('/admin/task-templates/create', { state: { duplicateFrom: template } });
  };
  
  // Add an explicit edit template function to handle edit actions
  const editTemplate = (templateId: string, event?: React.MouseEvent) => {
    // If event exists, stop propagation
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Close the dropdown
    setOpenDropdownId(null);
    
    // Navigate to edit page
    console.log(`Editing template, navigating to: /admin/task-templates/${templateId}/edit`);
    navigate(`/admin/task-templates/${templateId}/edit`);
  };
  
  const handleToggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from reaching document click handler
    setOpenDropdownId(openDropdownId === id ? null : id);
  };
  
  const openAssignModal = (template: TaskTemplate) => {
    setAssignModalTemplate(template);
    setSelectedEmployees([]);
    setDueDate('');
    setEmployeeSearchTerm('');
    
    // Clear cached employee data to ensure fresh fetch with admin client
    sessionStorage.removeItem('employeesList');
    
    // Force refresh employees when opening the modal to ensure we have latest data
    refreshEmployees();
  };
  
  const closeAssignModal = () => {
    setAssignModalTemplate(null);
    setSelectedEmployees([]);
    setDueDate('');
    setCustomPaymentAmount('');
  };
  
  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prevSelected => {
      if (prevSelected.includes(employeeId)) {
        return prevSelected.filter(id => id !== employeeId);
      } else {
        return [...prevSelected, employeeId];
      }
    });
  };
  
  const handleAssignTask = async () => {
    if (!assignModalTemplate) return;
    
    if (selectedEmployees.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create task assignments for each selected employee
      const paymentAmount = customPaymentAmount ? parseFloat(customPaymentAmount) : undefined;
      const assignments = await Promise.all(
        selectedEmployees.map(employeeId => 
          createTaskFromTemplate(assignModalTemplate.id, employeeId, dueDate || undefined, paymentAmount)
        )
      );
      
      toast.success(`Aufgabe erfolgreich an ${selectedEmployees.length} Mitarbeiter zugewiesen`);
      closeAssignModal();
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      // Only include employees with role 'employee' (not admins)
      emp.role === 'employee' && 
      // Also keep the banned check
      (!emp.banned_until || new Date(emp.banned_until) <= new Date()) &&
      // Filter by search term
      (employeeSearchTerm === '' || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(employeeSearchTerm.toLowerCase()))
    );
  }, [employees, employeeSearchTerm, employeesLoading]);

  // Count how many starter jobs exist
  const starterJobCount = useMemo(() => {
    return templates.filter(template => template.is_starter_job).length;
  }, [templates]);

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
              <ShimmerEffect width="150px" height="40px" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
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

  const renderError = () => {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Fehler beim Laden der Aufgabenvorlagen
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Es gab ein Problem beim Laden der Aufgabenvorlagen. Bitte versuchen Sie es erneut.
          </p>
          <Button onClick={handleRetry}>Erneut versuchen</Button>
        </div>
      </div>
    );
  };

  // Ensure employees are loaded when modal is opened
  useEffect(() => {
    // If we have an assignment modal open but no employees and not loading, try to refresh
    if (assignModalTemplate && employees.length === 0 && !employeesLoading && !employeesError) {
      refreshEmployees();
    }
  }, [employees, employeesLoading, employeesError, assignModalTemplate, refreshEmployees]);

  // Main render method
  if (loading) {
    return renderLoading();
  }
  
  if (error) {
    return renderError();
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
            <div className={`p-2 rounded-md bg-${colors.primary}/10 dark:bg-gray-700 mr-4`}>
              <FiBriefcase size={24} className={`text-${colors.primary} dark:text-white`} />
            </div>
            <div>
              <h1 className="text-2xl font-app font-app-bold text-gray-900 dark:text-white flex items-center">
                Aufgabenvorlagen
                {loading && (
                  <span className="ml-3 inline-block">
                    <LoadingSpinner size="sm" />
                  </span>
                )}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 font-app">
                Erstellen und verwalten Sie Vorlagen für wiederkehrende Aufgabentypen
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <AnimatedButton
              variant="primary"
              icon={<FiPlus size={16} />}
              onClick={() => navigate('/admin/task-templates/create')}
              className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Neue Vorlage
            </AnimatedButton>
          </div>
        </div>
      </motion.div>

      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-lg">
        <CardHeader className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {loading && <LoadingSpinner size="sm" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="bg-white dark:bg-gray-800 p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <FiBriefcase size={24} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Aufgabenvorlagen gefunden</h3>
              {templates.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Versuchen Sie, Ihre Suchkriterien anzupassen oder entfernen Sie Filter, um mehr Ergebnisse zu sehen.
                </p>
              )}
              {templates.length === 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                    Erstellen Sie Ihre erste Aufgabenvorlage, um wiederkehrende Aufgaben effizienter zu verwalten.
                  </p>
                  <Button 
                    leftIcon={<FiPlus size={16} />}
                    className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                    onClick={() => navigate('/admin/task-templates/create')}
                  >
                    Erste Vorlage erstellen
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {filteredTemplates.map((template: TaskTemplate) => (
                <motion.div 
                  key={template.id}
                  variants={item}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
                    assignModalTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {template.title}
                          </h3>
                          {template.is_starter_job && (
                            <div className="text-yellow-500" title="Starter-Job für neue Mitarbeiter">
                              <FiStar size={16} fill="currentColor" />
                            </div>
                          )}
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${priorityColors[template.priority].bg} ${priorityColors[template.priority].text} ${priorityColors[template.priority].darkBg} ${priorityColors[template.priority].darkText}`}>
                            {priorityLabels[template.priority]}
                          </span>
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {template.type}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{template.description}</p>
                        <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          {template.estimated_hours && (
                            <span className="flex items-center">
                              <FiClock size={14} className="mr-1" />
                              {template.estimated_hours} Stunden
                            </span>
                          )}
                          <span className="ml-4 flex items-center">
                            <span className="text-gray-400 dark:text-gray-500 mr-1">Aktualisiert:</span>
                            {formatDate(template.updated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-4 md:mt-0">
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          icon={<FiEye size={16} />}
                          onClick={(e) => navigate(`/admin/task-templates/${template.id}`)}
                          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Ansehen
                        </AnimatedButton>
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          icon={<FiUserPlus size={16} />}
                          onClick={(e) => openAssignModal(template)}
                          className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          Zuweisen
                        </AnimatedButton>
                        
                        <div className="relative">
                          <AnimatedButton
                            variant="ghost"
                            size="sm"
                            icon={<FiMoreVertical size={16} />}
                            onClick={(e) => handleToggleDropdown(template.id, e)}
                            className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                          />
                          
                          {openDropdownId === template.id && (
                            <div 
                              className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 focus:outline-none overflow-hidden"
                              onClick={(e) => e.stopPropagation()} // Stop click from closing dropdown
                            >
                              <div className="py-1">
                                <button
                                  data-action="edit"
                                  className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
                                  onClick={(e) => editTemplate(template.id, e)}
                                >
                                  <FiEdit size={16} className="mr-2 text-blue-500 dark:text-blue-400" />
                                  Bearbeiten
                                </button>
                                <button
                                  data-action="duplicate"
                                  className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
                                  onClick={(e) => handleDuplicateTemplate(template, e)}
                                >
                                  <FiCopy size={16} className="mr-2 text-purple-500 dark:text-purple-400" />
                                  Duplizieren
                                </button>
                                <button
                                  data-action="delete"
                                  className="flex w-full items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    console.log(`Deleting template: ${template.id}`);
                                    handleDeleteTemplate(template.id);
                                  }}
                                >
                                  <FiTrash size={16} className="mr-2" />
                                  Löschen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
      
      {/* Multi-Employee Assign Task Modal */}
      {assignModalTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Aufgabe zuweisen
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mitarbeiter auswählen <span className="text-red-500">*</span>
                </label>
                <div className="mb-4 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiSearch size={16} className="text-gray-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Mitarbeiter suchen..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="mt-2 mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Ausgewählte Mitarbeiter: {selectedEmployees.length}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEmployees.length > 0 && employees
                      .filter(emp => selectedEmployees.includes(emp.id))
                      .map(emp => (
                        <div 
                          key={emp.id}
                          className="flex items-center bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full text-sm"
                        >
                          {emp.first_name} {emp.last_name}
                          <button 
                            onClick={() => handleToggleEmployee(emp.id)}
                            className="ml-1 text-blue-800 dark:text-blue-200 focus:outline-none"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ))
                    }
                  </div>
                </div>
                
                {employeesLoading ? (
                  <div className="py-4 text-center">
                    <LoadingSpinner size="sm" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Lade Mitarbeiter...</p>
                  </div>
                ) : employeesError ? (
                  <div className="py-4 text-center text-red-600 dark:text-red-400">
                    <p className="text-sm">Fehler beim Laden der Mitarbeiter:</p>
                    <p className="text-xs mt-1">{employeesError.message}</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => refreshEmployees()}
                      className="mt-2"
                    >
                      Erneut versuchen
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map(employee => (
                        <div 
                          key={employee.id}
                          className={`
                            flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
                            ${selectedEmployees.includes(employee.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                            ${filteredEmployees.indexOf(employee) !== filteredEmployees.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}
                          `}
                          onClick={() => handleToggleEmployee(employee.id)}
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {employee.first_name} {employee.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {employee.email}
                            </p>
                          </div>
                          {selectedEmployees.includes(employee.id) && (
                            <FiCheck size={18} className="text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      ))
                    ) : employees.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">Keine Mitarbeiter im System gefunden</p>
                        <p className="text-xs mt-1">Erstellen Sie zuerst Mitarbeiter-Konten</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => refreshEmployees()}
                          className="mt-2"
                        >
                          Neu laden
                        </Button>
                      </div>
                    ) : employeeSearchTerm ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">Keine Mitarbeiter für "{employeeSearchTerm}" gefunden</p>
                        <p className="text-xs mt-1">Versuchen Sie einen anderen Suchbegriff</p>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">Keine verfügbaren Mitarbeiter</p>
                        <p className="text-xs mt-1">
                          Alle Mitarbeiter sind gesperrt oder haben Admin-Rollen
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fälligkeitsdatum (optional)
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Custom Payment Amount (Vergütung mode only) */}
              {shouldShowPaymentManagement() && assignModalTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Individuelle Vergütung (optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">€</span>
                    </div>
                    <Input
                      type="number"
                      value={customPaymentAmount}
                      onChange={(e) => setCustomPaymentAmount(e.target.value)}
                      placeholder={assignModalTemplate.payment_amount?.toFixed(2) || '0.00'}
                      step="0.01"
                      min="0"
                      className="pl-8"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Standard: €{assignModalTemplate.payment_amount?.toFixed(2) || '0.00'} • 
                    Leer lassen für Standard-Vergütung
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={closeAssignModal}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAssignTask}
                disabled={isSubmitting || selectedEmployees.length === 0}
              >
                {isSubmitting ? 'Wird zugewiesen...' : 'Aufgabe zuweisen'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TaskTemplates;
