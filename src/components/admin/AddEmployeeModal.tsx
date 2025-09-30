import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { CreateEmployeeData } from '../../hooks/useEmployees';
import { motion, AnimatePresence } from 'framer-motion';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeData) => Promise<void>;
  isLoading: boolean;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateEmployeeData>();
  
  const handleFormSubmit = async (data: CreateEmployeeData) => {
    try {
      await onSubmit(data);
      reset(); // Reset form on success
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
                  Neuen Mitarbeiter hinzufügen
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
                    label="Name"
                    {...register('name', { required: 'Name ist erforderlich' })}
                    error={errors.name?.message}
                    placeholder="Max Mustermann"
                  />
                  
                  <Input
                    label="E-Mail"
                    type="email"
                    {...register('email', { 
                      required: 'E-Mail ist erforderlich',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Ungültige E-Mail-Adresse'
                      }
                    })}
                    error={errors.email?.message}
                    placeholder="max.mustermann@example.com"
                  />
                  
                  <Input
                    label="Position"
                    {...register('position')}
                    error={errors.position?.message}
                    placeholder="z.B. Entwickler, Designer, etc."
                  />
                  
                  <Input
                    label="Passwort"
                    type="password"
                    {...register('password', { 
                      required: 'Passwort ist erforderlich',
                      minLength: {
                        value: 6,
                        message: 'Passwort muss mindestens 6 Zeichen lang sein'
                      }
                    })}
                    error={errors.password?.message}
                    placeholder="Mindestens 6 Zeichen"
                  />
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
                    Mitarbeiter erstellen
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

export default AddEmployeeModal;
