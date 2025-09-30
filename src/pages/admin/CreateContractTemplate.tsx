import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FiArrowLeft, FiPlus, FiX } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { Contract } from '../../types/database';
import { extractVariables } from '../../utils/contractUtils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface CreateContractTemplateFormData {
  title: string;
  category: string;
  content: string;
  version: string;
  monthly_salary?: number;
}

const CreateContractTemplate: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CreateContractTemplateFormData>();
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const editorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Create a contract directly with Supabase
  const createContractDirectly = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsSubmitting(true);
      
      // Strip out any fields that don't exist in the database schema to prevent errors
      const { 
        title, 
        category, 
        content, 
        is_active, 
        is_template, 
        parent_id, 
        version_number, 
        template_data, 
        version, 
        created_by
      } = contractData;
      
      // Only include fields that exist in the database table
      const validContractData = {
        title,
        category,
        content,
        is_active,
        is_template,
        parent_id,
        version_number,
        template_data,
        version,
        created_by
      };
      
      const { data, error } = await supabase
        .from('contracts')
        .insert([validContractData])
        .select()
        .single();
      
      if (error) throw error;
      
      return data as Contract;
    } catch (error) {
      console.error('Failed to create contract:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle editor content change with debouncing
  const handleEditorChange = (content: string) => {
    // Prevent unnecessary updates
    if (content === editorContent) return;
    
    // Update editor state right away for responsiveness
    setEditorContent(content);
    
    // Debounce the form update and variable extraction
    if (editorUpdateTimeoutRef.current) {
      clearTimeout(editorUpdateTimeoutRef.current);
    }
    
    editorUpdateTimeoutRef.current = setTimeout(() => {
      // This is called after the timeout, so it won't trigger immediate re-renders
      setValue('content', content);
      updateVariablesFromContent(content);
    }, 500);
  };
  
  // Update variables from content
  const updateVariablesFromContent = (content: string) => {
    if (!content) return;
    
    const extractedVars = extractVariables(content);
    const updatedVars = { ...templateVariables };
    let hasNewVars = false;
    
    // Add any new variables
    extractedVars.forEach(varName => {
      if (!updatedVars[varName]) {
        updatedVars[varName] = '';
        hasNewVars = true;
      }
    });
    
    // Only update if new variables were found - prevents unnecessary re-renders
    if (hasNewVars) {
      setTemplateVariables(updatedVars);
    }
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (editorUpdateTimeoutRef.current) {
        clearTimeout(editorUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  const handleFormSubmit = async (data: CreateContractTemplateFormData) => {
    try {
      // Add any custom variables that might not be in the content yet
      const variableMap: Record<string, string> = { ...templateVariables };
      
      // Process monthly salary
      const monthlySalary = data.monthly_salary || 0;
      
      // Add salary as a template variable if it exists
      if (monthlySalary > 0) {
        variableMap['salary'] = `${monthlySalary} €`;
      }
      
      const templateData = {
        title: data.title,
        category: data.category,
        content: editorContent, // Use editor content directly
        version: data.version,
        is_active: true,
        is_template: true,
        template_data: variableMap,
        created_by: user?.id || null, // Use the current user's ID
        version_number: 1
      };
      
      await createContractDirectly(templateData);
      
      showToast({
        title: 'Erfolg',
        message: 'Vertragsvorlage wurde erfolgreich erstellt.',
        type: 'success'
      });
      
      // Navigate back to contracts page
      navigate('/admin/contracts');
    } catch (error) {
      showToast({
        title: 'Fehler',
        message: 'Die Vertragsvorlage konnte nicht erstellt werden.',
        type: 'error'
      });
    }
  };
  
  // Add a custom variable
  const addCustomVariable = () => {
    const newVarName = `custom${Object.keys(templateVariables).length + 1}`;
    setTemplateVariables({ 
      ...templateVariables, 
      [newVarName]: '' 
    });
  };
  
  // Update a template variable
  const updateTemplateVariable = (varName: string, value: string) => {
    setTemplateVariables({
      ...templateVariables,
      [varName]: value
    });
  };
  
  // Remove a template variable
  const removeTemplateVariable = (varName: string) => {
    const newVariables = { ...templateVariables };
    delete newVariables[varName];
    setTemplateVariables(newVariables);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neue Vertragsvorlage erstellen</h1>
        <Button
          onClick={() => navigate('/admin/contracts')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FiArrowLeft size={16} />
          Zurück
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Vertragsvorlage Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Titel"
                  {...register('title', { required: 'Titel ist erforderlich' })}
                  error={errors.title?.message}
                  placeholder="Vertragsvorlage Titel"
                />
              </div>
              
              <div>
                <Input
                  label="Kategorie"
                  {...register('category', { required: 'Kategorie ist erforderlich' })}
                  error={errors.category?.message}
                  placeholder="z.B. Arbeitsvertrag, Dienstleistungsvertrag, etc."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Version"
                  {...register('version', { required: 'Version ist erforderlich' })}
                  error={errors.version?.message}
                  placeholder="z.B. 1.0, 2023-01, etc."
                />
              </div>
              
              <div>
                <Input
                  label="Monatliches Gehalt (€)"
                  type="number"
                  {...register('monthly_salary', { 
                    valueAsNumber: true,
                    validate: value => !value || value >= 0 || 'Gehalt muss eine positive Zahl sein'
                  })}
                  error={errors.monthly_salary?.message}
                  placeholder="z.B. 2500"
                />
              </div>
            </div>
            
            <div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vertragstext
                </label>
                <input type="hidden" {...register('content', { required: 'Vertragstext ist erforderlich' })} />
                <ReactQuill
                  theme="snow"
                  value={editorContent}
                  onChange={handleEditorChange}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      [{ 'align': [] }],
                      ['link', 'image', 'video'],
                      ['clean']
                    ],
                  }}
                  formats={[
                    'header',
                    'bold', 'italic', 'underline', 'strike',
                    'list', 'bullet', 'indent',
                    'link', 'image', 'video',
                    'align'
                  ]}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  style={{ height: '300px', marginBottom: '40px' }}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Verwenden Sie Platzhalter im Format {'{{'} variableName {'}}'}. Diese werden automatisch erkannt und unten angezeigt.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Erkannte Variablen
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomVariable}
                  className="flex items-center gap-2"
                >
                  <FiPlus size={14} />
                  Variable hinzufügen
                </Button>
              </div>
              
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                {Object.keys(templateVariables).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Keine Variablen im Vertragstext gefunden. Fügen Sie Platzhalter wie {'{{'} name {'}}'}  im Text ein.
                  </p>
                ) : (
                  Object.entries(templateVariables).map(([varName, varValue]) => (
                    <div key={varName} className="flex items-center space-x-2">
                      <div className="flex-grow">
                        <Input
                          label={`Variable {{${varName}}}`}
                          value={varValue}
                          onChange={(e) => updateTemplateVariable(varName, e.target.value)}
                          placeholder={`Standardwert für ${varName}`}
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-6 p-2 text-red-500 hover:text-red-700 focus:outline-none"
                        onClick={() => removeTemplateVariable(varName)}
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Diese Werte werden als Standardwerte für die Variablen verwendet. Sie können beim Zuweisen des Vertrags überschrieben werden.
              </p>
            </div>
            
            <div className="flex justify-end gap-4">
              <Button 
                onClick={() => navigate('/admin/contracts')} 
                type="button" 
                variant="outline"
              >
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Vertragsvorlage erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateContractTemplate; 