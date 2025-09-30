import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FiArrowLeft, FiPlus, FiX } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useNavigate, useParams } from 'react-router-dom';
import { Contract } from '../../types/database';
import { extractVariables } from '../../utils/contractUtils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface EditContractTemplateFormData {
  title: string;
  category: string;
  content: string;
  version: string;
  version_number: number;
  monthly_salary?: number;
  template_data?: Record<string, any>;
}

const EditContractTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const form = useForm<EditContractTemplateFormData>();
  const { register, handleSubmit, formState: { errors }, setValue } = form;
  
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editorContent, setEditorContent] = useState('');
  const [contract, setContract] = useState<Contract | null>(null);
  const [isMajorVersion, setIsMajorVersion] = useState(false);
  const isFirstRender = useRef(true);
  const editorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Function to fetch contract by ID directly - avoid using the hook that may cause infinite refreshes
  const fetchContractById = async (contractId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as Contract;
    } catch (error) {
      console.error('Error fetching contract:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to update contract
  const updateContractData = async (contractId: string, updates: Partial<Contract>) => {
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as Contract;
    } catch (error) {
      console.error('Error updating contract:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Fetch contract data
  useEffect(() => {
    const loadContractData = async () => {
      if (!id) return;
      
      try {
        const contractData = await fetchContractById(id);
        
        if (!contractData) {
          showToast({
            title: 'Fehler',
            message: 'Vertragsvorlage nicht gefunden.',
            type: 'error'
          });
          navigate('/admin/contracts');
          return;
        }
        
        setContract(contractData);
        
        // Initialize form with contract data
        setValue('title', contractData.title);
        setValue('category', contractData.category);
        setValue('content', contractData.content);
        setValue('version', contractData.version);
        setValue('version_number', contractData.version_number || 1);
        
        // Set editor content
        setEditorContent(contractData.content || '');
        
        // Extract monthly salary from template_data if it exists
        if (contractData.template_data && contractData.template_data.salary) {
          const salaryString = contractData.template_data.salary as string;
          const salaryMatch = salaryString.match(/(\d+)/);
          if (salaryMatch && salaryMatch[1]) {
            setValue('monthly_salary', parseInt(salaryMatch[1], 10));
          }
        }
        
        // Extract template variables
        initializeTemplateVariables(contractData);
      } catch (error) {
        console.error('Error loading contract:', error);
        showToast({
          title: 'Fehler',
          message: 'Die Vertragsvorlage konnte nicht geladen werden.',
          type: 'error'
        });
        navigate('/admin/contracts');
      }
    };
    
    if (isFirstRender.current) {
      loadContractData();
      isFirstRender.current = false;
    }
  }, [id, navigate, showToast, setValue]);
  
  // Initialize template variables from contract data
  const initializeTemplateVariables = (contractData: Contract) => {
    if (!contractData || !contractData.content) return;
    
    const variables: Record<string, string> = {};
    const extractedVars = extractVariables(contractData.content);
    
    // First add all variables from the contract's template_data
    if (contractData.template_data) {
      Object.entries(contractData.template_data).forEach(([key, value]) => {
        variables[key] = String(value);
      });
    }
    
    // Then add any new variables from content that might not be in template_data
    extractedVars.forEach(varName => {
      if (!variables[varName]) {
        variables[varName] = ''; // Initialize with empty string
      }
    });
    
    setTemplateVariables(variables);
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
  
  const handleFormSubmit = async (data: EditContractTemplateFormData) => {
    if (!contract || !id) return;
    
    try {
      // Process template variables
      const variableMap: Record<string, string> = { ...templateVariables };
      
      // Process monthly salary
      const monthlySalary = data.monthly_salary || 0;
      if (monthlySalary > 0) {
        variableMap['salary'] = `${monthlySalary} €`;
      }
      
      const updateData: Partial<Contract> = {
        title: data.title,
        category: data.category,
        content: editorContent, // Use editor content directly
        version: data.version,
        template_data: variableMap
      };
      
      // Increment version number if major version update
      if (isMajorVersion) {
        updateData.version_number = (contract.version_number || 1) + 1;
      }
      
      await updateContractData(id, updateData);
      
      showToast({
        title: 'Erfolg',
        message: 'Vertragsvorlage wurde erfolgreich aktualisiert.',
        type: 'success'
      });
      
      // Navigate back to contracts page
      navigate('/admin/contracts');
    } catch (error) {
      showToast({
        title: 'Fehler',
        message: 'Die Vertragsvorlage konnte nicht aktualisiert werden.',
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!contract) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-semibold mb-2">Vertragsvorlage nicht gefunden</h2>
        <p className="mb-4">Die angeforderte Vertragsvorlage konnte nicht gefunden werden.</p>
        <Button onClick={() => navigate('/admin/contracts')}>Zurück zur Übersicht</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vertragsvorlage bearbeiten</h1>
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
          <CardTitle>Vorlagendetails</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="majorVersion"
                  checked={isMajorVersion}
                  onChange={(e) => setIsMajorVersion(e.target.checked)}
                  className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
                />
                <label htmlFor="majorVersion" className="ml-2 block text-sm text-blue-800 dark:text-blue-200">
                  Als neue Version speichern (Version {(contract.version_number || 1) + 1})
                </label>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Wenn aktiviert, wird eine neue Version der Vorlage erstellt, anstatt die bestehende zu überschreiben.
              </p>
            </div>
          
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
                {isMajorVersion ? 'Als neue Version speichern' : 'Änderungen speichern'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditContractTemplate; 