import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ButtonSignin from './ButtonSignin';

// --- Mock Dependencies ---

interface MockLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

jest.mock('./LoginModal', () => {
  // Use a data-testid to easily assert the component's presence and state
  // Explicitly type the arguments here using the interface:
  return function MockLoginModal({ isOpen, onClose }: MockLoginModalProps) {
    if (!isOpen) return null;
    return (
      <div data-testid="login-modal">
        Mock Login Modal Content
        <button onClick={onClose} data-testid="modal-close-button">
          Close
        </button>
      </div>
    );
  } as React.FC<MockLoginModalProps>; // Cast the return value for proper typing
});

// --- Tests ---

describe('ButtonSignin', () => {
  const user = userEvent.setup();

  it('should render the button with default text and style', () => {
    render(<ButtonSignin />);

    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button).toBeInTheDocument();
    // Check that default class is applied
    expect(button).toHaveClass('btn');
  });

  it('should render the button with custom text and style', () => {
    const customText = 'Log In Now';
    const customStyle = 'btn-lg btn-primary';

    render(<ButtonSignin text={customText} extraStyle={customStyle} />);

    const button = screen.getByRole('button', { name: customText });
    expect(button).toBeInTheDocument();
    // Check that custom text and styles are applied
    expect(button).toHaveClass('btn', 'btn-lg', 'btn-primary');
  });

  it('should open the LoginModal when the button is clicked', async () => {
    render(<ButtonSignin />);

    // 1. Modal should be closed initially
    expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument();

    // 2. Click the Sign In button
    const button = screen.getByRole('button', { name: 'Sign In' });
    await user.click(button);

    // 3. Modal should now be open
    expect(screen.getByTestId('login-modal')).toBeInTheDocument();
  });

  it('should close the LoginModal when the close function is called from the modal', async () => {
    render(<ButtonSignin />);

    // Open the modal first
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByTestId('login-modal')).toBeInTheDocument();

    // Click the close button exposed by our MockLoginModal
    const closeModalButton = screen.getByTestId('modal-close-button');
    await user.click(closeModalButton);

    // Modal should now be closed
    expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument();
  });
});
