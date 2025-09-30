import React from 'react';
import { motion } from 'framer-motion';
import { FiFileText } from 'react-icons/fi';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ProfileFormData } from '../../hooks/useProfileStats';

interface PayrollTabProps {
  register: UseFormRegister<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
  healthInsuranceOptions: { value: string; label: string }[];
}

const PayrollTab: React.FC<PayrollTabProps> = ({ 
  register, 
  errors,
  healthInsuranceOptions
}) => {
  const tabVariants = {
    inactive: { opacity: 0, y: 10 },
    active: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="space-y-4"
      initial="inactive"
      animate="active"
      variants={tabVariants}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Informationen für die Lohnabrechnung</h3>
      </div>
      
      <Input
        label="Steuernummer"
        {...register('tax_number')}
        error={errors.tax_number?.message}
      />
      
      <Input
        label="Sozialversicherungsnummer"
        {...register('social_security_number')}
        error={errors.social_security_number?.message}
      />
      
      <Select
        label="Krankenkasse"
        options={healthInsuranceOptions}
        {...register('health_insurance')}
        error={errors.health_insurance?.message}
      />
      
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiFileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-300">Hinweis</h3>
            <p className="mt-1 text-sm text-blue-500 dark:text-blue-400">
              Bitte geben Sie Ihre korrekten Daten ein. Diese Informationen werden für die Lohnabrechnung benötigt.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PayrollTab;
