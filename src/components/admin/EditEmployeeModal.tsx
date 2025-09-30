import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Employee } from '../../hooks/useEmployees';
import { motion, AnimatePresence } from 'framer-motion';

interface EditEmployeeFormData {
  first_name: string;
  last_name: string;
  email?: string;
  role?: 'admin' | 'employee';
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: EditEmployeeFormData) => Promise<void>;
  employee: Employee | null;
  isLoading: boolean;
}

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditEmployeeFormData>({
    defaultValues: {
      first_name: employee?.first_name || '',
      last_name: employee?.last_name || '',
      email: employee?.email || '',
      role: employee?.role || 'employee'
    }
  });
  
  // Update form values when employee changes
  React.useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        role: employee.role || 'employee'
      });
    }
  }, [employee, reset]);
  
  const handleFormSubmit = async (data: EditEmployeeFormData) => {
    if (!employee) return;
    
    try {
      await onSubmit(employee.id, data);
      onClose();
    } catch (error) {
      // Error is handled in the parent component
    }
  };
  
  const handleClose = () => {
    if (!isLoading) {
      reset();
      onClose();
    }
  };
  
  if (!employee) return null;
  
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
                  Mitarbeiter bearbeiten
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
                    label="Vorname"
                    {...register('first_name', { required: 'Vorname ist erforderlich' })}
                    error={errors.first_name?.message}
                    placeholder="Max"
                  />
                  
                  <Input
                    label="Nachname"
                    {...register('last_name', { required: 'Nachname ist erforderlich' })}
                    error={errors.last_name?.message}
                    placeholder="Mustermann"
                  />
                  
                  <Input
                    label="E-Mail"
                    type="email"
                    {...register('email', { 
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Ungültige E-Mail-Adresse'
                      }
                    })}
                    error={errors.email?.message}
                    placeholder="max.mustermann@example.com"
                    disabled
                  />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Rolle
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-accent"
                          value="employee"
                          {...register('role')}
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Mitarbeiter</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-accent"
                          value="admin"
                          {...register('role')}
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Administrator</span>
                      </label>
                    </div>
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

export default EditEmployeeModal;
