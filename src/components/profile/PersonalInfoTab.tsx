import React from 'react';
import { motion } from 'framer-motion';
import { FiUser } from 'react-icons/fi';
import Input from '../ui/Input';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ProfileFormData } from '../../hooks/useProfileStats';

interface PersonalInfoTabProps {
  register: UseFormRegister<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ register, errors }) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Vorname"
          {...register('first_name', { required: 'Vorname ist erforderlich' })}
          error={errors.first_name?.message}
        />
        
        <Input
          label="Nachname"
          {...register('last_name', { required: 'Nachname ist erforderlich' })}
          error={errors.last_name?.message}
        />
      </div>
      
      <Input
        label="Geburtsdatum"
        type="date"
        {...register('date_of_birth')}
        error={errors.date_of_birth?.message}
      />
      
      <Input
        label="Nationalität"
        {...register('nationality')}
        error={errors.nationality?.message}
        placeholder="z.B. DE für Deutschland"
      />
      
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiUser className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-300">Hinweis</h3>
            <p className="mt-1 text-sm text-blue-500 dark:text-blue-400">
              Bitte geben Sie Ihre korrekten persönlichen Daten ein. Diese Informationen werden für die Vertragsabwicklung benötigt.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PersonalInfoTab;
