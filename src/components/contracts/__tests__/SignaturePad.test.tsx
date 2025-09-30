import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import SignaturePad from '../SignaturePad';

describe('SignaturePad', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly', () => {
    render(<SignaturePad onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /unterschrift löschen/i })).toBeInTheDocument();
  });

  it('calls onChange with empty string when clearing', () => {
    render(<SignaturePad onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('button', { name: /unterschrift löschen/i }));
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('applies custom width and height', () => {
    const { container } = render(
      <SignaturePad onChange={mockOnChange} width={300} height={150} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveStyle({ minHeight: '150px' });
  });

  it('applies custom className', () => {
    const { container } = render(
      <SignaturePad onChange={mockOnChange} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
