import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ContractPreviewModal from '../ContractPreviewModal';
import { Contract } from '../../../types/database';

// Mock SignaturePad component
jest.mock('../SignaturePad', () => {
  return function MockSignaturePad({ onChange }: { onChange: (data: string) => void }) {
    return (
      <div data-testid="mock-signature-pad">
        <button onClick={() => onChange('mock-signature-data')}>Sign</button>
      </div>
    );
  };
});

// Mock PDFViewer component
jest.mock('@react-pdf/renderer', () => ({
  PDFViewer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pdf-viewer">{children}</div>
  ),
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pdf-document">{children}</div>
  ),
  Page: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pdf-page">{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pdf-text">{children}</div>
  ),
  View: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pdf-view">{children}</div>
  ),
  StyleSheet: {
    create: () => ({}),
  },
}));

describe('ContractPreviewModal', () => {
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

  const mockOnClose = jest.fn();
  const mockOnSign = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSign.mockClear();
  });

  it('renders contract preview correctly', () => {
    render(
      <ContractPreviewModal
        contract={mockContract}
        isOpen={true}
        onClose={mockOnClose}
        onSign={mockOnSign}
      />
    );

    expect(screen.getByText('Vertragsvorschau')).toBeInTheDocument();
    expect(screen.getByText(mockContract.title)).toBeInTheDocument();
    expect(screen.getByText(mockContract.description)).toBeInTheDocument();
    expect(screen.getByText(mockContract.terms)).toBeInTheDocument();
  });

  it('handles signing flow correctly', async () => {
    render(
      <ContractPreviewModal
        contract={mockContract}
        isOpen={true}
        onClose={mockOnClose}
        onSign={mockOnSign}
      />
    );

    // Click "Weiter zur Unterschrift" button
    fireEvent.click(screen.getByText('Weiter zur Unterschrift'));

    // Verify signature pad is shown
    expect(screen.getByTestId('mock-signature-pad')).toBeInTheDocument();

    // Simulate signing
    fireEvent.click(screen.getByText('Sign'));

    // Click "Vertrag unterschreiben" button
    fireEvent.click(screen.getByText('Vertrag unterschreiben'));

    await waitFor(() => {
      expect(mockOnSign).toHaveBeenCalledWith('mock-signature-data');
    });
  });

  it('handles cancel correctly', () => {
    render(
      <ContractPreviewModal
        contract={mockContract}
        isOpen={true}
        onClose={mockOnClose}
        onSign={mockOnSign}
      />
    );

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables sign button when no signature', () => {
    render(
      <ContractPreviewModal
        contract={mockContract}
        isOpen={true}
        onClose={mockOnClose}
        onSign={mockOnSign}
      />
    );

    fireEvent.click(screen.getByText('Weiter zur Unterschrift'));
    expect(screen.getByText('Vertrag unterschreiben')).toBeDisabled();
  });
});
