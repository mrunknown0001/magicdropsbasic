import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useTaskTemplates } from '../../hooks/useTaskTemplates';
import { useEmployees } from '../../hooks/useEmployees';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { TaskTemplate } from '../../types/database';
import { ArrowLeft, Edit, Copy, Trash2, UserPlus, Check, Clock, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { motion } from 'framer-motion';
import { useSettingsContext } from '../../context/SettingsContext';

// Priority labels
const priorityLabels = {
  'low': 'Niedrig',
  'medium': 'Mittel',
  'high': 'Hoch'
};

// Priority colors
const priorityColors = {
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-blue-200',
  'high': 'bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-200'
};

const TaskTemplateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTemplateById, deleteTemplate, createTaskFromTemplate } = useTaskTemplates();
  const { employees, loading: employeesLoading } = useEmployees();
  const { shouldShowPaymentManagement } = useSettingsContext();
  
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    console.log('TaskTemplateDetails component mounted, id:', id);
    
    const fetchTemplate = async () => {
      if (!id) {
        console.log('No template ID provided');
        return;
      }
      
      try {
        console.log('Fetching template with ID:', id);
        setLoading(true);
        const templateData = await getTemplateById(id);
        console.log('Template data received:', templateData);
        
        if (templateData) {
          console.log('Setting template state with data');
          setTemplate(templateData);
        } else {
          console.log('No template data received');
          setError(new Error('Template not found'));
          toast.error('Template not found');
        }
      } catch (err) {
        console.error('Error fetching template:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch template'));
        toast.error('Failed to fetch template');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };
    
    fetchTemplate();
    
    return () => {
      console.log('TaskTemplateDetails component unmounting');
    };
  }, [id]);
  
  const handleDeleteTemplate = async () => {
    if (!template) return;
    
    if (window.confirm('Sind Sie sicher, dass Sie diese Aufgabenvorlage löschen möchten?')) {
      try {
        await deleteTemplate(template.id);
        toast.success('Aufgabenvorlage erfolgreich gelöscht');
        navigate('/admin/task-templates');
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };
  
  const handleDuplicateTemplate = () => {
    if (!template) return;
    navigate('/admin/task-templates/create', { state: { duplicateFrom: template } });
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
    if (!template) return;
    
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
          createTaskFromTemplate(template.id, employeeId, dueDate || undefined, paymentAmount)
        )
      );
      
      toast.success(`Aufgabe erfolgreich an ${selectedEmployees.length} Mitarbeiter zugewiesen`);
      setIsAssigning(false);
      setSelectedEmployees([]);
      setDueDate('');
      setCustomPaymentAmount('');
      setSearchTerm('');
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Filter employees based on search term
  const filteredEmployees = employees
    .filter(emp => 
      // Only include employees with role 'employee' (not admins)
      emp.role === 'employee' && 
      // Also keep the banned check
      (!emp.banned_until || new Date(emp.banned_until) <= new Date()) &&
      // Filter by search term
      (searchTerm === '' || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error || !template) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Fehler beim Laden der Aufgabenvorlage
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Die angeforderte Aufgabenvorlage konnte nicht gefunden werden.
          </p>
          <Button onClick={() => navigate('/admin/task-templates')}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/task-templates')}
            className="mr-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{template.title}</h1>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            leftIcon={<Edit size={16} />}
            onClick={() => navigate(`/admin/task-templates/${template.id}/edit`)}
          >
            Bearbeiten
          </Button>
          <Button
            variant="outline"
            leftIcon={<Copy size={16} />}
            onClick={handleDuplicateTemplate}
          >
            Duplizieren
          </Button>
          <Button
            variant="outline"
            leftIcon={<Trash2 size={16} />}
            onClick={handleDeleteTemplate}
          >
            Löschen
          </Button>
          <Button
            leftIcon={<UserPlus size={16} />}
            onClick={() => setIsAssigning(true)}
          >
            Mitarbeiter zuweisen
          </Button>
        </div>
      </div>
      
      {/* Template Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Beschreibung</h3>
                <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                  {template.description}
                </p>
              </div>
              
              {template.steps && template.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Arbeitsschritte</h3>
                  <div className="space-y-4">
                    {template.steps.map((step, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {index + 1}. {step.title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {template.required_attachments && template.required_attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Erforderliche Anhänge</h3>
                  <div className="space-y-2">
                    {template.required_attachments.map((attachment, index) => (
                      <div key={index} className="flex items-start">
                        <div className={`p-1 rounded-full ${attachment.required ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                          {attachment.required ? <Check size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {attachment.name}
                            {attachment.required ? ' (Erforderlich)' : ' (Optional)'}
                          </p>
                          {attachment.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {attachment.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Metadata */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Metadaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Typ</h3>
                <p className="mt-1 text-gray-900 dark:text-white">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {template.type}
                  </span>
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Priorität</h3>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[template.priority]}`}>
                    {priorityLabels[template.priority]}
                  </span>
                </p>
              </div>
              
              {/* Payment amount section removed as per requirement */}
              
              {template.estimated_hours && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Geschätzte Stunden</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {template.estimated_hours} Stunden
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Erstellt am</h3>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {format(new Date(template.created_at), 'PPP', { locale: de })}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Zuletzt aktualisiert</h3>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {format(new Date(template.updated_at), 'PPP', { locale: de })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Multi-Employee Assign Task Modal */}
      {isAssigning && (
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
                    <Search size={16} className="text-gray-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Mitarbeiter suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    }
                  </div>
                </div>
                
                {employeesLoading ? (
                  <div className="py-4 text-center">
                    <LoadingSpinner size="sm" />
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
                            <Check size={18} className="text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        Keine Mitarbeiter gefunden
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
              {shouldShowPaymentManagement() && template && (
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
                      placeholder={template.payment_amount?.toFixed(2) || '0.00'}
                      step="0.01"
                      min="0"
                      className="pl-8"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Standard: €{template.payment_amount?.toFixed(2) || '0.00'} • 
                    Leer lassen für Standard-Vergütung
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAssigning(false)}
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

export default TaskTemplateDetails;
