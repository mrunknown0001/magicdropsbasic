import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea/index';
import { useTaskTemplates } from '../../hooks/useTaskTemplates';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ArrowLeft, CheckCircle, X, AlertCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Switch } from '../../components/ui/Switch';

// Form validation schema
// Used in the form schema
interface TaskStepForm {
  title: string;
  description: string;
  order: number;
}

const taskTemplateSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  type: z.enum(['bankdrop', 'exchanger', 'platzhalter']),
  priority: z.enum(['low', 'medium', 'high']),
  payment_amount: z.number().min(0, 'Vergütungsbetrag muss positiv sein').optional(),
  estimated_hours: z.number().min(0, 'Geschätzte Stunden müssen positiv sein').optional(),
  steps: z.array(z.object({
    title: z.string().min(1, 'Schritt-Titel ist erforderlich'),
    description: z.string().min(1, 'Schritt-Beschreibung ist erforderlich'),
    order: z.number()
  })),
  required_attachments: z.array(z.object({
    name: z.string().min(1, 'Anhangsname ist erforderlich'),
    description: z.string().optional(),
    required: z.boolean()
  })),
  play_store_url: z.string().url('Ungültige URL').optional().or(z.literal('')),
  app_store_url: z.string().url('Ungültige URL').optional().or(z.literal('')),
  is_starter_job: z.boolean().optional()
});

type TaskTemplateFormData = z.infer<typeof taskTemplateSchema>;

// Database types
interface TaskStep extends TaskStepForm {}

interface TaskAttachment {
  name: string;
  description: string;
  required: boolean;
}

const EditTaskTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTemplateById, updateTemplate } = useTaskTemplates();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarterJob, setIsStarterJob] = useState(false);
  
  const { register, control, handleSubmit, formState: { errors }, reset, setValue } = useForm<TaskTemplateFormData>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      steps: [],
      required_attachments: [],
      is_starter_job: false,
      payment_amount: 0
    }
  });
  
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: 'steps'
  });
  
  const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control,
    name: 'required_attachments'
  });
  
  // Fetch template data only once when component mounts
  useEffect(() => {
    let mounted = true;

    const fetchTemplate = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const template = await getTemplateById(id);
        
        // Only update state if component is still mounted
        if (!mounted) return;
        
        if (template) {
          reset({
            title: template.title,
            description: template.description,
            type: template.type as 'bankdrop' | 'exchanger' | 'platzhalter',
            priority: template.priority,
            payment_amount: template.payment_amount || 0,
            estimated_hours: template.estimated_hours ? Number(template.estimated_hours) : undefined,
            steps: (template.steps || []).map(step => ({
              title: step.title,
              description: step.description,
              order: step.order
            })),
            required_attachments: (template.required_attachments || []).map(attachment => ({
              name: attachment.name,
              description: attachment.description || '',
              required: attachment.required
            })),
            play_store_url: template.play_store_url || '',
            app_store_url: template.app_store_url || '',
            is_starter_job: template.is_starter_job || false
          });
          setIsStarterJob(template.is_starter_job || false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Fehler beim Abrufen der Vorlage'));
          toast.error('Fehler beim Abrufen der Vorlage');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchTemplate();

    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [id]); // Only depend on id, not on getTemplateById or reset
  
  const onSubmit = async (formData: TaskTemplateFormData) => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      // Convert form data to match the database schema
      const templateData = {
        ...formData,
        required_attachments: formData.required_attachments.map(attachment => ({
          ...attachment,
          description: attachment.description || ''
        })) as TaskAttachment[],
        play_store_url: formData.play_store_url?.trim() || undefined,
        app_store_url: formData.app_store_url?.trim() || undefined,
        is_starter_job: isStarterJob
      };
      
      console.log('Submitting template with starter job flag:', isStarterJob);
      
      await updateTemplate(id, templateData);
      toast.success('Aufgabenvorlage erfolgreich aktualisiert');
      navigate(`/admin/task-templates/${id}`);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error) {
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
            Zurück zu Vorlagen
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
            onClick={() => navigate(`/admin/task-templates/${id}`)}
            className="mr-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aufgabenvorlage bearbeiten</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grundinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titel <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('title')}
                error={errors.title?.message}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beschreibung <span className="text-red-500">*</span>
              </label>
              <TextArea
                {...register('description')}
                error={errors.description?.message}
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Typ <span className="text-red-500">*</span>
                </label>
                <Select
                  {...register('type')}
                  error={errors.type?.message}
                  options={[
                    { value: 'bankdrop', label: 'Bankdrop' },
                    { value: 'exchanger', label: 'Exchanger' },
                    { value: 'platzhalter', label: 'Platzhalter' }
                  ]}
                >
                  <option value="bankdrop">Bankdrop</option>
                  <option value="exchanger">Exchanger</option>
                  <option value="platzhalter">Platzhalter</option>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priorität <span className="text-red-500">*</span>
                </label>
                <Select
                  {...register('priority')}
                  error={errors.priority?.message}
                  options={[
                    { value: 'low', label: 'Niedrig' },
                    { value: 'medium', label: 'Mittel' },
                    { value: 'high', label: 'Hoch' }
                  ]}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </Select>
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
                    {...register('payment_amount', { valueAsNumber: true })}
                    error={errors.payment_amount?.message}
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
                  {...register('estimated_hours', { valueAsNumber: true })}
                  error={errors.estimated_hours?.message}
                />
              </div>
            </div>
            
            {/* App Store URLs Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">App Store URLs</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                URLs zu den Apps, die automatisch bei Task-Zuweisungen verfügbar sind
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {...register('play_store_url')}
                      error={errors.play_store_url?.message}
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
                      {...register('app_store_url')}
                      error={errors.app_store_url?.message}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Schritte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stepFields.map((field, index) => (
              <div key={field.id} className="flex space-x-4">
                <div className="flex-1 space-y-4">
                  <Input
                    {...register(`steps.${index}.title`)}
                    placeholder="Schritt-Titel"
                    error={errors.steps?.[index]?.title?.message}
                  />
                  <TextArea
                    {...register(`steps.${index}.description`)}
                    placeholder="Schritt-Beschreibung"
                    error={errors.steps?.[index]?.description?.message}
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeStep(index)}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => appendStep({ title: '', description: '', order: stepFields.length })}
              className="w-full"
            >
              <CheckCircle size={16} className="mr-2" />
              Schritt hinzufügen
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Erforderliche Anhänge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attachmentFields.map((field, index) => (
              <div key={field.id} className="flex space-x-4">
                <div className="flex-1 space-y-4">
                  <Input
                    {...register(`required_attachments.${index}.name`)}
                    placeholder="Anhangsname"
                    error={errors.required_attachments?.[index]?.name?.message}
                  />
                  <TextArea
                    {...register(`required_attachments.${index}.description`)}
                    placeholder="Anhangsbeschreibung (Optional)"
                    error={errors.required_attachments?.[index]?.description?.message}
                    rows={2}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`required_attachments.${index}.required`)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                      Erforderlich
                    </label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeAttachment(index)}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => appendAttachment({ name: '', description: '', required: false })}
              className="w-full"
            >
              <CheckCircle size={16} className="mr-2" />
              Anhang hinzufügen
            </Button>
          </CardContent>
        </Card>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mt-6">
          <div className="flex items-start">
            <div className="flex items-center space-x-2">
              <Switch 
                id="starter-job"
                checked={isStarterJob}
                onCheckedChange={(checked) => {
                  setIsStarterJob(checked);
                  setValue('is_starter_job', checked);
                }}
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
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/task-templates/${id}`)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTaskTemplate;
