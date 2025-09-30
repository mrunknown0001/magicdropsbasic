import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ContractAssignmentCard from '../ContractAssignmentCard';
import { useContracts } from '../../../hooks/useContracts';
import { Contract, ContractAssignment } from '../../../types/database';

// Mock useContracts hook
jest.mock('../../../hooks/useContracts', () => ({
  useContracts: jest.fn(),
}));

// Mock ContractPreviewModal component
jest.mock('../ContractPreviewModal', () => {
  return function MockContractPreviewModal({ onSign }: { onSign: (data: string) => void }) {
    return (
      <div data-testid="mock-preview-modal">
        <button onClick={() => onSign('mock-signature-data')}>Sign Contract</button>
      </div>
    );
  };
});

describe('ContractAssignmentCard', () => {
  const mockContract: Contract = {
    id: '1',
    title: 'Test Contract',
    description: 'Test Description',
    terms: 'Test Terms',
    category: 'test',
    content: 'Test Content',
    version: '1.0',
    is_active: true,
    created_by: 'test-user',
    created_at: '2025-05-11T09:00:00Z',
    updated_at: '2025-05-11T09:00:00Z',
  };

  const mockAssignment: ContractAssignment = {
    id: '1',
    contract_id: '1',
    user_id: 'test-user',
    assigned_at: '2025-05-11T09:00:00Z',
    signed_at: null,
    signature_data: undefined,
    status: 'pending',
    rejection_reason: undefined,
    created_at: '2025-05-11T09:00:00Z',
    updated_at: '2025-05-11T09:00:00Z',
  };

  const mockSignContract = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    (useContracts as jest.Mock).mockReturnValue({
      signContract: mockSignContract,
    });
    mockSignContract.mockClear();
    mockOnUpdate.mockClear();
  });

  it('renders unsigned contract correctly', () => {
    render(
      <ContractAssignmentCard
        contract={mockContract}
        assignment={mockAssignment}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(mockContract.title)).toBeInTheDocument();
    expect(screen.getByText(/Preview & Sign/i)).toBeInTheDocument();
    expect(screen.queryByText(/Signed/i)).not.toBeInTheDocument();
  });

  it('renders signed contract correctly', () => {
    const signedAssignment: ContractAssignment = {
      ...mockAssignment,
      signed_at: '2025-05-11T09:00:00Z',
      signature_data: 'mock-signature-data',
      status: 'signed',
    };

    render(
      <ContractAssignmentCard
        contract={mockContract}
        assignment={signedAssignment}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/Signed/i)).toBeInTheDocument();
    expect(screen.queryByText(/Preview & Sign/i)).not.toBeInTheDocument();
    expect(screen.getByAltText('Signature')).toBeInTheDocument();
  });

  it('handles signing flow correctly', async () => {
    render(
      <ContractAssignmentCard
        contract={mockContract}
        assignment={mockAssignment}
        onUpdate={mockOnUpdate}
      />
    );

    // Open preview modal
    fireEvent.click(screen.getByText(/Preview & Sign/i));

    // Sign contract
    fireEvent.click(screen.getByText('Sign Contract'));

    await waitFor(() => {
      expect(mockSignContract).toHaveBeenCalledWith(mockContract.id, 'mock-signature-data');
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('handles signing error correctly', async () => {
    mockSignContract.mockRejectedValue(new Error('Failed to sign'));

    render(
      <ContractAssignmentCard
        contract={mockContract}
        assignment={mockAssignment}
        onUpdate={mockOnUpdate}
      />
    );

    // Open preview modal
    fireEvent.click(screen.getByText(/Preview & Sign/i));

    // Sign contract
    fireEvent.click(screen.getByText('Sign Contract'));

    await waitFor(() => {
      expect(mockSignContract).toHaveBeenCalledWith(mockContract.id, 'mock-signature-data');
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });
});
