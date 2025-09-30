import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from './animations';

interface AddressInputs {
  street: string;
  postalCode: string;
  city: string;
  nationality: string;
}

interface AddressStepProps {
  form: UseFormReturn<AddressInputs>;
}

const AddressStep: React.FC<AddressStepProps> = ({ form }) => {
  const { register, formState: { errors } } = form;

  return (
    <motion.div
      key="address"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Adresse
      </h2>
      <div className="grid grid-cols-1 gap-6">
        <Input
          label="Straße und Hausnummer"
          error={errors.street?.message}
          {...register('street')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="PLZ"
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />
          <Input
            label="Stadt"
            error={errors.city?.message}
            {...register('city')}
          />
        </div>
        <Select
          label="Nationalität"
          error={errors.nationality?.message}
          options={[{ value: 'DE', label: 'Deutschland' }]}
          {...register('nationality')}
        />
      </div>
    </motion.div>
  );
};

export default AddressStep;
