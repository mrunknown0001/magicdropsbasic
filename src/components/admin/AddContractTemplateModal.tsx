import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FiX } from 'react-icons/fi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract } from '../../types/database';
import { extractVariables } from '../../utils/contractUtils';
import { useAuth } from '../../context/AuthContext';

interface AddContractTemplateFormData {
  title: string;
  category: string;
  content: string;
  version: string;
  monthly_salary?: number;
}

interface AddContractTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  isLoading: boolean;
}

const AddContractTemplateModal: React.FC<AddContractTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<AddContractTemplateFormData>();
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const { user } = useAuth(); // Get the current user
  
  // Watch for changes in the content to extract variables
  const contractContent = watch('content');
  
  // Extract variables from content
  useEffect(() => {
    if (contractContent) {
      const extractedVars = extractVariables(contractContent);
      
      // Update template variables with extracted ones
      const updatedVars = { ...templateVariables };
      
      // Add any new variables
      extractedVars.forEach(varName => {
        if (!updatedVars[varName]) {
          updatedVars[varName] = ''; // Initialize with empty string
        }
      });
      
      setTemplateVariables(updatedVars);
    }
  }, [contractContent]);
  
  const handleFormSubmit = async (data: AddContractTemplateFormData) => {
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
        content: data.content,
        version: data.version,
        is_active: true,
        is_template: true,
        template_data: variableMap,
        created_by: user?.id || null // Use the current user's ID 
      };
      
      await onSubmit(templateData);
      reset();
      setTemplateVariables({});
    } catch (error) {
      // Error is handled in the parent component
    }
  };
  
  const handleClose = () => {
    if (!isLoading) {
      reset();
      setTemplateVariables({});
      onClose();
    }
  };
  
  const addCustomVariable = () => {
    const newVarName = `custom${Object.keys(templateVariables).length + 1}`;
    setTemplateVariables({ 
      ...templateVariables, 
      [newVarName]: '' 
    });
  };
  
  const updateTemplateVariable = (varName: string, value: string) => {
    setTemplateVariables({
      ...templateVariables,
      [varName]: value
    });
  };
  
  const removeTemplateVariable = (varName: string) => {
    const newVariables = { ...templateVariables };
    delete newVariables[varName];
    setTemplateVariables(newVariables);
  };
  
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
                  Neue Vertragsvorlage erstellen
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
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={10}
                      placeholder="Vertragstext mit Platzhaltern wie {{name}}, {{date}}, etc."
                      {...register('content', { required: 'Vertragstext ist erforderlich' })}
                    />
                    {errors.content && (
                      <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Verwenden Sie Platzhalter im Format {'{{'} variableName {'}}'}. Diese werden automatisch erkannt und unten angezeigt.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Erkannte Variablen
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomVariable}
                      >
                        + Variable hinzufügen
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
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
                    Vorlage erstellen
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

export default AddContractTemplateModal;
