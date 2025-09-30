import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useTaskTemplates } from '../../hooks/useTaskTemplates';
import { TaskTemplate } from '../../types/database';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronDown, X, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '../../components/ui/Switch';

// Task types
const TASK_TYPES = [
  { value: 'bankdrop', label: 'Bankdrop' },
  { value: 'exchanger', label: 'Exchanger' },
  { value: 'platzhalter', label: 'Platzhalter' },
  { value: 'other', label: 'Andere' }
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' }
];

interface Step {
  title: string;
  description: string;
  order: number;
}

interface Attachment {
  name: string;
  description: string;
  required: boolean;
}

const CreateTaskTemplate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createTemplate } = useTaskTemplates();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Template data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('bankdrop');
  const [customType, setCustomType] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
  const [steps, setSteps] = useState<Step[]>([{ title: '', description: '', order: 1 }]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isStarterJob, setIsStarterJob] = useState(false);
  const [playStoreUrl, setPlayStoreUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');

  // Check if we're duplicating an existing template
  useEffect(() => {
    const state = location.state as { duplicateFrom?: TaskTemplate };
    if (state?.duplicateFrom) {
      const template = state.duplicateFrom;
      setTitle(`${template.title} (Kopie)`);
      setDescription(template.description);
      setType(TASK_TYPES.some(t => t.value === template.type) ? template.type : 'other');
      if (!TASK_TYPES.some(t => t.value === template.type)) {
        setCustomType(template.type);
      }
      setPaymentAmount(template.payment_amount || 0);
      setPriority(template.priority);
      setEstimatedHours(template.estimated_hours);
      setSteps(template.steps || [{ title: '', description: '', order: 1 }]);
      setAttachments(template.required_attachments || []);
      setPlayStoreUrl(template.play_store_url || '');
      setAppStoreUrl(template.app_store_url || '');
    }
  }, [location.state]);

  const handleAddStep = () => {
    setSteps([...steps, { title: '', description: '', order: steps.length + 1 }]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Re-order the steps
    const reorderedSteps = newSteps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
    setSteps(reorderedSteps);
  };

  const handleStepChange = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleAddAttachment = () => {
    setAttachments([...attachments, { name: '', description: '', required: true }]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAttachmentChange = (index: number, field: keyof Attachment, value: any) => {
    const newAttachments = [...attachments];
    newAttachments[index] = { ...newAttachments[index], [field]: value };
    setAttachments(newAttachments);
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!title.trim()) {
        toast.error('Bitte geben Sie einen Titel ein');
        return;
      }
      if (!description.trim()) {
        toast.error('Bitte geben Sie eine Beschreibung ein');
        return;
      }
      if (type === 'other' && !customType.trim()) {
        toast.error('Bitte geben Sie einen benutzerdefinierten Typ ein');
        return;
      }
      if (paymentAmount < 0) {
        toast.error('Vergütungsbetrag muss positiv sein');
        return;
      }
    } else if (currentStep === 2) {
      // Validate steps
      const invalidSteps = steps.filter(step => !step.title.trim() || !step.description.trim());
      if (invalidSteps.length > 0) {
        toast.error('Bitte füllen Sie alle Schritte vollständig aus');
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    // Validate form before submission to prevent unnecessary API calls
    const invalidAttachments = attachments.filter(att => !att.name.trim());
    if (invalidAttachments.length > 0) {
      toast.error('Bitte geben Sie Namen für alle Anhänge ein');
      return;
    }
    
    // Use a local state variable to track submission state
    // This prevents issues with stale state in async operations
    let isSubmittingLocal = true;
    setIsSubmitting(true);
    
    try {
      // Create template object
      const templateData: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'> = {
        created_by: user?.id || '',
        title,
        description,
        type: type === 'other' ? customType : type,
        payment_amount: paymentAmount,
        priority,
        estimated_hours: estimatedHours,
        steps: steps.filter(step => step.title.trim() && step.description.trim()),
        required_attachments: attachments.filter(att => att.name.trim()),
        play_store_url: playStoreUrl.trim() || undefined,
        app_store_url: appStoreUrl.trim() || undefined,
        is_starter_job: isStarterJob // Add starter job flag
      };
      
      // Set a timeout to reset the submitting state if the operation takes too long
      const timeoutId = setTimeout(() => {
        if (isSubmittingLocal) {
          console.warn('Template creation is taking longer than expected');
          setIsSubmitting(false);
          isSubmittingLocal = false;
          toast.error('Die Anfrage dauert länger als erwartet. Bitte versuchen Sie es später erneut.');
        }
      }, 10000); // 10 second timeout
      
      // Create the template
      await createTemplate(templateData);
      
      // Clear the timeout since the operation completed successfully
      clearTimeout(timeoutId);
      
      // Only proceed if we haven't already reset due to timeout
      if (isSubmittingLocal) {
        toast.success('Aufgabenvorlage erfolgreich erstellt');
        navigate('/admin/task-templates');
      }
    } catch (error) {
      // Show a more specific error message
      console.error('Failed to create template:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen der Vorlage');
    } finally {
      // Always reset the submitting state in the finally block
      if (isSubmittingLocal) {
        setIsSubmitting(false);
        isSubmittingLocal = false;
      }
      
      // Force fetch-end event to ensure global loading state is reset
      window.dispatchEvent(new CustomEvent('fetch-end'));
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -100 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/task-templates')}
          className="mr-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neue Aufgabenvorlage erstellen</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Progress Steps */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              className={`flex-1 py-4 px-6 text-center border-b-2 ${
                currentStep === 1
                  ? 'border-blue-500 text-blue-500 font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
              onClick={() => setCurrentStep(1)}
            >
              1. Grundinformationen
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center border-b-2 ${
                currentStep === 2
                  ? 'border-blue-500 text-blue-500 font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
              onClick={() => currentStep > 1 && setCurrentStep(2)}
            >
              2. Arbeitsschritte definieren
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center border-b-2 ${
                currentStep === 3
                  ? 'border-blue-500 text-blue-500 font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
              onClick={() => currentStep > 2 && setCurrentStep(3)}
            >
              3. Erforderliche Anhänge
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titel <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Titel der Aufgabenvorlage"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beschreibung <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Detaillierte Beschreibung der Aufgabe"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Typ <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      required
                      options={TASK_TYPES}
                    />
                    {type === 'other' && (
                      <Input
                        type="text"
                        placeholder="Benutzerdefinierter Typ"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        className="mt-2"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priorität <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                      required
                      options={PRIORITY_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vergütungsbetrag (€)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400">€</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Standard-Vergütung für diese Aufgabe. Kann bei der Zuweisung überschrieben werden.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Geschätzte Stunden
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Geschätzte Arbeitsstunden"
                      value={estimatedHours || ''}
                      onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || undefined)}
                    />
                  </div>
                </div>

                {/* App Store URLs Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">App Store URLs</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fügen Sie App Store URLs hinzu, die automatisch bei Task-Zuweisungen verfügbar sind
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Google Play Store URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Smartphone className="h-5 w-5 text-green-500" />
                        </div>
                        <Input
                          type="url"
                          placeholder="https://play.google.com/store/apps/..."
                          value={playStoreUrl}
                          onChange={(e) => setPlayStoreUrl(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Apple App Store URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Smartphone className="h-5 w-5 text-blue-500" />
                        </div>
                        <Input
                          type="url"
                          placeholder="https://apps.apple.com/app/..."
                          value={appStoreUrl}
                          onChange={(e) => setAppStoreUrl(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <div className="flex items-start">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="starter-job"
                        checked={isStarterJob}
                        onCheckedChange={setIsStarterJob}
                      />
                      <label htmlFor="starter-job" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Als Starter-Job für neue Mitarbeiter festlegen
                      </label>
                    </div>
                    <div className="ml-2 text-blue-500 cursor-help" title="Wenn aktiviert, wird diese Aufgabe automatisch jedem neuen Mitarbeiter nach der Registrierung zugewiesen.">
                      <AlertCircle size={16} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                    Diese Aufgabe wird automatisch jedem neuen Mitarbeiter direkt nach der Registrierung zugewiesen.
                  </p>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Arbeitsschritte definieren
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle size={16} />}
                    onClick={handleAddStep}
                  >
                    Schritt hinzufügen
                  </Button>
                </div>

                <div className="space-y-6">
                  {steps.map((step, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">
                          Schritt {step.order}
                        </h4>
                        {steps.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<X size={16} />}
                            onClick={() => handleRemoveStep(index)}
                          >
                            Entfernen
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Titel <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            placeholder="Titel des Schritts"
                            value={step.title}
                            onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Beschreibung <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            placeholder="Detaillierte Anweisungen für diesen Schritt"
                            value={step.description}
                            onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Erforderliche Anhänge
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle size={16} />}
                    onClick={handleAddAttachment}
                  >
                    Anhang hinzufügen
                  </Button>
                </div>

                {attachments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      Keine erforderlichen Anhänge definiert
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<CheckCircle size={16} />}
                      onClick={handleAddAttachment}
                      className="mt-2"
                    >
                      Anhang hinzufügen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-medium text-gray-900 dark:text-white">
                            Anhang {index + 1}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<X size={16} />}
                            onClick={() => handleRemoveAttachment(index)}
                          >
                            Entfernen
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="text"
                              placeholder="Name des Anhangs"
                              value={attachment.name}
                              onChange={(e) => handleAttachmentChange(index, 'name', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Beschreibung
                            </label>
                            <Input
                              type="text"
                              placeholder="Beschreibung des Anhangs"
                              value={attachment.description}
                              onChange={(e) => handleAttachmentChange(index, 'description', e.target.value)}
                            />
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`required-${index}`}
                              checked={attachment.required}
                              onChange={(e) => handleAttachmentChange(index, 'required', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                              Erforderlich
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            leftIcon={<ArrowLeft size={16} />}
          >
            Zurück
          </Button>
          
          <div className="flex space-x-2">
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                rightIcon={<ChevronDown size={16} />}
              >
                Weiter
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                leftIcon={<CheckCircle size={16} />}
              >
                {isSubmitting ? 'Wird gespeichert...' : 'Vorlage speichern'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskTemplate;
