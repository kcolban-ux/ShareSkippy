import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  const mockSetIsModalOpen = jest.fn();

  beforeEach(() => {
    // Clear mock calls before each test
    mockSetIsModalOpen.mockClear();

    // Suppress console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('does not render when isModalOpen is false', () => {
    render(<Modal isModalOpen={false} setIsModalOpen={mockSetIsModalOpen} />);

    // Use queryBy* because it returns null instead of throwing an error
    expect(screen.queryByText("I'm a modal")).not.toBeInTheDocument();
  });

  it('renders content when isModalOpen is true', () => {
    render(<Modal isModalOpen={true} setIsModalOpen={mockSetIsModalOpen} />);

    expect(screen.getByText("I'm a modal")).toBeInTheDocument();
    expect(screen.getByText('And here is my content')).toBeInTheDocument();
  });

  it('calls setIsModalOpen(false) when the "X" button is clicked', () => {
    render(<Modal isModalOpen={true} setIsModalOpen={mockSetIsModalOpen} />);

    // This query works once you add the aria-label
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockSetIsModalOpen).toHaveBeenCalledTimes(1);
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(false);
  });

  it('calls setIsModalOpen(false) when the Dialog "onClose" is triggered (e.g., Escape key)', () => {
    render(<Modal isModalOpen={true} setIsModalOpen={mockSetIsModalOpen} />);

    // Get the dialog element itself
    const dialog = screen.getByRole('dialog');

    // Simulate pressing the Escape key, which triggers onClose
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    expect(mockSetIsModalOpen).toHaveBeenCalledTimes(1);
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(false);
  });
});
