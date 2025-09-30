import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import Select from '../ui/Select';
import { motion } from 'framer-motion';
import { Contract } from '../../types/database';
import { pageVariants, pageTransition } from './animations';
import Button from '../ui/Button';
import ContractPreviewModal from '../contracts/ContractPreviewModal';
import { useContracts } from '../../hooks/useContracts';
import { useAuth } from '../../context/AuthContext';
import { PersonalInfoInputs, AddressInputs } from './validationSchemas';

interface ContractInputs {
  contractId: string;
  acceptTerms: boolean;
  signatureData?: string;
}

interface ContractStepProps {
  form: UseFormReturn<ContractInputs>;
  contracts: Contract[];
  selectedContract: Contract | null;
  onContractSelect: (contractId: string) => void;
  personalInfo?: PersonalInfoInputs;
  addressInfo?: AddressInputs;
}

const ContractStep: React.FC<ContractStepProps> = ({
  form,
  contracts,
  selectedContract,
  onContractSelect,
  personalInfo,
  addressInfo
}) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { signContract } = useContracts();
  const { user } = useAuth();
  
  // Watch the contract ID value to ensure UI updates correctly
  const contractId = watch('contractId');

  // Effect to reset acceptTerms when contract changes
  useEffect(() => {
    if (contractId) {
      // Reset acceptTerms when contract changes
      setValue('acceptTerms', false);
      // Also clear any previous signature data
      setValue('signatureData', undefined);
    }
  }, [contractId, setValue]);

  return (
    <motion.div
      key="contract"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Vertrag
      </h2>
      <div className="space-y-6">
        <Select
          label="Vertrag auswählen"
          placeholder="Bitte Vertrag auswählen"
          error={errors.contractId?.message}
          options={contracts.map(contract => ({
            value: contract.id,
            label: contract.title
          }))}
          {...register('contractId', {
            onChange: (e) => {
              const value = e.target.value;
              if (value) {
                onContractSelect(value);
              } else {
                // Reset if empty selection
                onContractSelect('');
              }
            }
          })}
        />

        {selectedContract && (
          <div className="mt-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Bitte lesen Sie den Vertrag sorgfältig durch und unterschreiben Sie ihn, um fortzufahren.
              </p>
              <Button
                onClick={() => setIsPreviewOpen(true)}
                className="w-full mt-2"
              >
                Vertrag anzeigen & unterschreiben
              </Button>
            </div>
            {errors.acceptTerms && (
              <p className="mt-1 text-sm text-red-500">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>
        )}
        
        {selectedContract && (
          <ContractPreviewModal
            contract={selectedContract}
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            userData={{
              ...personalInfo,
              ...addressInfo
            }}
            onSign={async (signatureData) => {
              console.log('Contract signed with signature data:', signatureData.substring(0, 50) + '...');
              
              // During registration, we store the signature data in the form
              setValue('acceptTerms', true);
              setValue('signatureData', signatureData);
              return Promise.resolve();
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default ContractStep;
