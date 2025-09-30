import React from 'react';
import { motion } from 'framer-motion';
import { FiHome } from 'react-icons/fi';
import Input from '../ui/Input';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ProfileFormData } from '../../hooks/useProfileStats';

interface AddressTabProps {
  register: UseFormRegister<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
}

const AddressTab: React.FC<AddressTabProps> = ({ register, errors }) => {
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
        label="Straße und Hausnummer"
        {...register('street')}
        error={errors.street?.message}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Postleitzahl"
          {...register('postal_code')}
          error={errors.postal_code?.message}
        />
        
        <Input
          label="Stadt"
          {...register('city')}
          error={errors.city?.message}
        />
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiHome className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-300">Hinweis</h3>
            <p className="mt-1 text-sm text-blue-500 dark:text-blue-400">
              Bitte geben Sie Ihre aktuelle Adresse ein. Diese wird für offizielle Dokumente und Korrespondenz verwendet.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AddressTab;
