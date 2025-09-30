import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { FiX } from 'react-icons/fi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { Editor } from '@tinymce/tinymce-react';

interface EditContractTemplateFormData {
  title: string;
  category: string;
  content: string;
  version: string;
  version_number: number;
  monthly_salary?: number;
  template_data?: Record<string, any>;
}

interface EditContractTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<Contract>) => Promise<void>;
  contract: Contract | null;
  isLoading: boolean;
}

const EditContractTemplateModal: React.FC<EditContractTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  isLoading
}) => {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<EditContractTemplateFormData>();
  const [templateVariables, setTemplateVariables] = useState<{key: string, value: string}[]>([]);
  const [isMajorVersion, setIsMajorVersion] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  
  // Store the initial contract data to prevent refresh loops
  const initialContractRef = useRef<Contract | null>(null);
  
  // Flag to track if the form has been initialized
  const formInitializedRef = useRef(false);
  
  useEffect(() => {
    // Only initialize the form once when the modal opens with a contract
    if (contract && isOpen && !formInitializedRef.current) {
      // Create a deep copy of the contract to completely isolate it
      const contractCopy = JSON.parse(JSON.stringify(contract));
      initialContractRef.current = contractCopy;
      formInitializedRef.current = true;
      
      // Initialize form with the copied contract data
      setValue('title', contractCopy.title);
      setValue('category', contractCopy.category);
      setValue('content', contractCopy.content);
      setValue('version', contractCopy.version);
      setValue('version_number', contractCopy.version_number || 1);
      
      // Set editor content
      setEditorContent(contractCopy.content || '');
      
      // Extract monthly salary from template_data if it exists
      if (contract.template_data && contract.template_data.salary) {
        const salaryString = contract.template_data.salary as string;
        const salaryMatch = salaryString.match(/(\d+)/);
        if (salaryMatch && salaryMatch[1]) {
          setValue('monthly_salary', parseInt(salaryMatch[1], 10));
        }
      }
      
      // Extract template variables
      const variables: {key: string, value: string}[] = [];
      if (contract.template_data) {
        Object.entries(contract.template_data).forEach(([key, value]) => {
          variables.push({ key, value: value as string });
        });
      }
      
      if (variables.length === 0) {
        variables.push({ key: 'var1', value: '' });
      }
      
      setTemplateVariables(variables);
    }
  }, [contract, isOpen, setValue]);
  
  // Reset the form initialization flag when the modal closes
  useEffect(() => {
    if (!isOpen) {
      formInitializedRef.current = false;
    }
  }, [isOpen]);
  
  // Prevent contract updates while the modal is open
  // Create a stable reference to the contract that won't change during editing
  const contractToUse = useMemo(() => {
    if (isOpen && contract) {
      // If we already have an initial contract reference and the modal is open, use that
      if (initialContractRef.current) {
        return initialContractRef.current;
      }
      // Otherwise create a new deep copy
      return JSON.parse(JSON.stringify(contract));
    }
    // Fall back to the contract prop if needed
    return contract;
  }, [isOpen, contract]);
  
  // Store the contract in a ref when the modal opens
  useEffect(() => {
    if (isOpen && contract) {
      // Create a deep copy to completely isolate the contract
      const contractCopy = JSON.parse(JSON.stringify(contract));
      initialContractRef.current = contractCopy;
      
      // Set the flag to prevent re-initialization if it's not set yet
      if (!formInitializedRef.current) {
        formInitializedRef.current = true;
      }
    }
  }, [isOpen, contract]);
  
  const handleFormSubmit = async (data: EditContractTemplateFormData) => {
    // Use the stable contract reference to prevent issues with changing props
    const contractToUpdate = contractToUse;
    if (!contractToUpdate) return;
    
    try {
      // Process template variables
      const variableMap: Record<string, string> = {};
      templateVariables.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          variableMap[key] = value;
        }
      });
      
      // Process monthly salary
      const monthlySalary = data.monthly_salary || 0;
      if (monthlySalary > 0) {
        variableMap['salary'] = `${monthlySalary} €`;
      }
      
      const updateData: Partial<Contract> = {
        title: data.title,
        category: data.category,
        content: data.content,
        version: data.version,
        template_data: variableMap
      };
      
      // Increment version number if major version update
      if (isMajorVersion) {
        updateData.version_number = (contractToUpdate.version_number || 1) + 1;
      }
      
      await onSubmit(contractToUpdate.id, updateData);
    } catch (error) {
      // Error is handled in the parent component
    }
  };
  
  const handleClose = () => {
    if (!isLoading) {
      // Reset all form state
      reset();
      setTemplateVariables([{ key: 'var1', value: '' }]);
      setIsMajorVersion(false);
      initialContractRef.current = null;
      formInitializedRef.current = false;
      onClose();
    }
  };
  
  const addTemplateVariable = () => {
    const newKey = `var${templateVariables.length + 1}`;
    setTemplateVariables([...templateVariables, { key: newKey, value: '' }]);
  };
  
  const updateTemplateVariable = (index: number, value: string) => {
    const newVariables = [...templateVariables];
    newVariables[index].value = value;
    setTemplateVariables(newVariables);
  };
  
  const removeTemplateVariable = (index: number) => {
    if (templateVariables.length > 1) {
      const newVariables = [...templateVariables];
      newVariables.splice(index, 1);
      setTemplateVariables(newVariables);
    }
  };
  
  // Handle editor content change
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    setValue('content', content); // Update the form value
  };
  
  // Always use our stable contract reference
  if (!contractToUse) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-2xl mx-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vertragsvorlage bearbeiten
                </h3>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(handleFormSubmit)}>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                        Als neue Version speichern (Version {(contractToUse.version_number || 1) + 1})
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Wenn aktiviert, wird eine neue Version der Vorlage erstellt, anstatt die bestehende zu überschreiben.
                    </p>
                  </div>
                
                  <Input
                    label="Titel"
                    {...register('title', { required: 'Titel ist erforderlich' })}
                    error={errors.title?.message}
                    placeholder="Vertragsvorlage Titel"
                  />
                  
                  <Input
                    label="Kategorie"
                    {...register('category', { required: 'Kategorie ist erforderlich' })}
                    error={errors.category?.message}
                    placeholder="z.B. Arbeitsvertrag, Dienstleistungsvertrag, etc."
                  />
                  
                  <Input
                    label="Version"
                    {...register('version', { required: 'Version ist erforderlich' })}
                    error={errors.version?.message}
                    placeholder="z.B. 1.0, 2023-01, etc."
                  />
                  
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
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vertragstext
                    </label>
                    <input type="hidden" {...register('content', { required: 'Vertragstext ist erforderlich' })} />
                    <Editor
                      apiKey="your-api-key" // Replace with your TinyMCE API key or remove this line if not using cloud version
                      init={{
                        height: 400,
                        menubar: true,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'print', 'preview', 'anchor',
                          'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 
                          'paste', 'code', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | formatselect | ' +
                          'bold italic backcolor | alignleft aligncenter ' +
                          'alignright alignjustify | bullist numlist outdent indent | ' +
                          'removeformat | help',
                        content_style: 'body { font-family:\'Inter\',system-ui,sans-serif; font-size:14px }',
                        branding: false,
                        skin: window.document.documentElement.classList.contains('dark') ? 'oxide-dark' : 'oxide',
                        content_css: window.document.documentElement.classList.contains('dark') ? 'dark' : 'default'
                      }}
                      onEditorChange={handleEditorChange}
                      value={editorContent}
                    />
                    {errors.content && (
                      <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Platzhalter-Variablen
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTemplateVariable}
                      >
                        + Variable hinzufügen
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {templateVariables.map((variable, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="flex-grow">
                            <Input
                              label={`Variable {{${variable.key}}}`}
                              value={variable.value}
                              onChange={(e) => updateTemplateVariable(index, e.target.value)}
                              placeholder={`z.B. Name, Adresse, etc.`}
                            />
                          </div>
                          {templateVariables.length > 1 && (
                            <button
                              type="button"
                              className="mt-6 p-2 text-red-500 hover:text-red-700 focus:outline-none"
                              onClick={() => removeTemplateVariable(index)}
                            >
                              <FiX size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Verwenden Sie diese Variablen im Vertragstext als Platzhalter mit der Syntax {'{{'} var1 {'}}'} für die erste Variable, {'{{'} var2 {'}}'} für die zweite, usw.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                  >
                    {isMajorVersion ? 'Als neue Version speichern' : 'Änderungen speichern'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditContractTemplateModal;
