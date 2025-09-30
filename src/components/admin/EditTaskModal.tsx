import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../../types/database';
import { useEmployees } from '../../hooks/useEmployees';
import Select from '../ui/Select';

interface EditTaskFormData {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee_id?: string;
  due_date?: string;
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<Task>) => Promise<void>;
  task: Task | null;
  isLoading: boolean;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditTaskFormData>();
  const { employees, loading: employeesLoading } = useEmployees();
  const [activeEmployees, setActiveEmployees] = useState<{ value: string; label: string }[]>([]);
  
  useEffect(() => {
    // Filter out inactive employees and prepare for select dropdown
    const filtered = employees
      .filter(emp => !emp.banned_until || new Date(emp.banned_until) <= new Date())
      .map(emp => ({
        value: emp.id,
        label: emp.name || emp.email || emp.id
      }));
    
    setActiveEmployees(filtered);
  }, [employees]);
  
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        assignee_id: task.assignee_id || '',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
      });
    }
  }, [task, reset]);
  
  const handleFormSubmit = async (data: EditTaskFormData) => {
    if (!task) return;
    
    try {
      // Convert due_date string to ISO format if provided
      const taskData = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null
      };
      
      await onSubmit(task.id, taskData);
      onClose();
    } catch (error) {
      // Error is handled in the parent component
    }
  };
  
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };
  
  if (!task) return null;
  
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md mx-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Aufgabe bearbeiten
                </h3>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(handleFormSubmit)}>
                <div className="p-6 space-y-4">
                  <Input
                    label="Titel"
                    {...register('title', { required: 'Titel ist erforderlich' })}
                    error={errors.title?.message}
                    placeholder="Aufgabentitel eingeben"
                  />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Beschreibung
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={4}
                      placeholder="Beschreibung der Aufgabe"
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Status"
                      {...register('status', { required: 'Status ist erforderlich' })}
                      error={errors.status?.message}
                      options={[
                        { value: 'pending', label: 'Ausstehend' },
                        { value: 'in_progress', label: 'In Bearbeitung' },
                        { value: 'completed', label: 'Abgeschlossen' }
                      ]}
                    />
                    
                    <Select
                      label="Priorität"
                      {...register('priority', { required: 'Priorität ist erforderlich' })}
                      error={errors.priority?.message}
                      options={[
                        { value: 'low', label: 'Niedrig' },
                        { value: 'medium', label: 'Mittel' },
                        { value: 'high', label: 'Hoch' }
                      ]}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Zugewiesen an"
                      {...register('assignee_id')}
                      error={errors.assignee_id?.message}
                      options={[
                        { value: '', label: 'Nicht zugewiesen' },
                        ...activeEmployees
                      ]}
                      isLoading={employeesLoading}
                    />
                    
                    <Input
                      label="Fälligkeitsdatum"
                      type="date"
                      {...register('due_date')}
                      error={errors.due_date?.message}
                    />
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3">
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
                    Speichern
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

export default EditTaskModal;
