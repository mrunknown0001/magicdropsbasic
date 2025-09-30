import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contract } from '../../types/database';

interface EditContractTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSubmit: (id: string, data: any) => Promise<void>;
  isLoading: boolean;
}

/**
 * This component replaces the old EditContractTemplateModal with a redirect to the dedicated edit page.
 * It's used as a transitional component to maintain backward compatibility.
 */
const EditContractTemplateModal: React.FC<EditContractTemplateModalProps> = ({
  isOpen,
  contract,
  onClose
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && contract) {
      // Redirect to the edit page
      navigate(`/admin/contracts/${contract.id}/edit`);
      // Close the modal
      onClose();
    }
  }, [isOpen, contract, navigate, onClose]);

  return null; // This component doesn't render anything, it just redirects
};

export default EditContractTemplateModal; 