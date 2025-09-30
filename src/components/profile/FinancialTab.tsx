import React from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard } from 'react-icons/fi';
import Input from '../ui/Input';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ProfileFormData } from '../../hooks/useProfileStats';

interface FinancialTabProps {
  register: UseFormRegister<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
}

const FinancialTab: React.FC<FinancialTabProps> = ({ register, errors }) => {
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
      <Input
        label="Kontoinhaber"
        {...register('recipient_name')}
        error={errors.recipient_name?.message}
        placeholder="Name des Kontoinhabers"
      />
      
      <Input
        label="IBAN"
        {...register('iban', {
          pattern: {
            value: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/,
            message: 'Bitte geben Sie eine gültige IBAN ein'
          }
        })}
        error={errors.iban?.message}
        placeholder="z.B. DE12500105170648489890"
      />
      
      <Input
        label="BIC"
        {...register('bic')}
        error={errors.bic?.message}
        placeholder="z.B. BYLADEM1001"
      />
      
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiCreditCard className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-300">Hinweis</h3>
            <p className="mt-1 text-sm text-blue-500 dark:text-blue-400">
              Diese Bankdaten werden für die Auszahlung Ihres Gehalts verwendet. Bitte stellen Sie sicher, dass die Angaben korrekt sind.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinancialTab;
