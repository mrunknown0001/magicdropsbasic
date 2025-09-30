import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import Input from '../ui/Input';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, x: 100 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -100 }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3
};

import { PersonalInfoInputs } from './validationSchemas';

interface PersonalInfoStepProps {
  form: UseFormReturn<PersonalInfoInputs>;
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ form }) => {
  const { register, formState: { errors } } = form;

  return (
    <motion.div
      key="personal"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Persönliche Informationen
      </h2>
      <div className="grid grid-cols-1 gap-6">
        <Input
          label="E-Mail"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Passwort"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Passwort bestätigen"
          type="password"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Vorname"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Nachname"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <Input
          label="Geburtsdatum"
          type="date"
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
        />
      </div>
    </motion.div>
  );
};

export default PersonalInfoStep;
