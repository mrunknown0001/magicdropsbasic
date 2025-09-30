import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Contract, ContractAssignment } from '../../types/database';
import { useContracts } from '../../hooks/useContracts';
import ContractPreviewModal from './ContractPreviewModal';
import toast from 'react-hot-toast';

interface ContractAssignmentCardProps {
  contract: Contract;
  assignment: ContractAssignment;
  onUpdate?: () => void;
}

const ContractAssignmentCard: React.FC<ContractAssignmentCardProps> = ({
  contract,
  assignment,
  onUpdate,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signContract } = useContracts();

  const handleSign = async (signatureData: string) => {
    try {
      setIsSubmitting(true);
      await signContract(contract.id, signatureData);
      onUpdate?.();
      setIsPreviewOpen(false);
      toast.success('Contract signed successfully');
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Failed to sign contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {contract.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {assignment.signed_at ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                Signed
              </span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsPreviewOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Preview & Sign'}
              </motion.button>
            )}
          </div>
        </div>

        {assignment.signed_at && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Signed on: {new Date(assignment.signed_at).toLocaleDateString()}
            </p>
            {assignment.signature_data && (
              <div className="mt-2">
                <img
                  src={assignment.signature_data}
                  alt="Signature"
                  className="max-h-16 border border-gray-200 dark:border-gray-700 rounded"
                />
              </div>
            )}
          </div>
        )}
      </motion.div>

      <ContractPreviewModal
        contract={contract}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSign={handleSign}
      />
    </>
  );
};

export default ContractAssignmentCard;
