// ContactForm.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from './ContactForm';
import { sendContact } from '@/app/actions/sendContact';

// 1. Mock the server action
jest.mock('@/app/actions/sendContact', () => ({
  sendContact: jest.fn(),
}));

// 2. Cast the mock for type-safety and easy access in tests
const mockedSendContact = sendContact as jest.Mock;

describe('ContactForm', () => {
  let dispatchEventSpy: jest.SpyInstance;

  // 3. Set up a Spy on window.dispatchEvent to track analytics
  beforeEach(() => {
    mockedSendContact.mockClear();
    dispatchEventSpy = jest.spyOn(window, 'dispatchEvent').mockImplementation(jest.fn());
  });

  // 4. Clean up the spy after each test
  afterEach(() => {
    dispatchEventSpy.mockRestore();
  });

  // Helper function to simulate filling out the form
  const fillOutForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/Your Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Your Email/i), 'test@example.com');
    await user.selectOptions(screen.getByLabelText(/Category/i), 'bug');
    await user.type(screen.getByLabelText(/Subject/i), 'Test Subject');
    await user.type(screen.getByLabelText(/Message/i), 'This is a test message.');
  };

  // Test Case 1: Initial Render
  test('renders the form correctly in its initial state', () => {
    render(<ContactForm />);

    // Check for the title
    expect(screen.getByRole('heading', { name: /Contact Support/i })).toBeInTheDocument();

    // Check for a few key fields
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/i)).toBeInTheDocument();

    // Check the submit button
    const submitButton = screen.getByRole('button', { name: /Send Message/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();

    // Ensure the success message is not visible
    expect(screen.queryByText(/Message Sent Successfully!/i)).not.toBeInTheDocument();
  });

  // Test Case 2: Successful Submission (Happy Path)
  test('shows a success message after a successful submission', async () => {
    const user = userEvent.setup();

    // Arrange: Mock a successful server response
    mockedSendContact.mockResolvedValue({ ok: true, errors: {} });

    render(<ContactForm />);

    // Act: Fill out and submit the form
    await fillOutForm(user);
    const submitButton = screen.getByRole('button', { name: /Send Message/i });
    await user.click(submitButton);

    // Assert: Check the final success state
    // We use `findByRole` to wait for the component to re-render
    expect(
      await screen.findByRole('heading', { name: /Message Sent Successfully!/i })
    ).toBeInTheDocument();

    // Assert: Check that the form is no longer rendered
    expect(screen.queryByRole('form')).not.toBeInTheDocument();

    // Assert: Check that the server action was called
    expect(mockedSendContact).toHaveBeenCalledTimes(1);

    // Assert: Check that the correct analytics event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { event: 'contact_form_success' },
      })
    );
  });

  // Test Case 3: Submission with Validation Errors
  test('displays validation errors from the server', async () => {
    const user = userEvent.setup();

    // Arrange: Mock an error response from the server
    const mockErrors = {
      email: ['Please provide a valid email address.'],
      subject: ['Subject cannot be empty.'],
      _: ['An unknown error occurred. Please try again.'], // General error
    };
    mockedSendContact.mockResolvedValue({ ok: false, errors: mockErrors });

    render(<ContactForm />);

    // Act: Fill out and submit the form
    await fillOutForm(user);
    const submitButton = screen.getByRole('button', { name: /Send Message/i });
    await user.click(submitButton);

    // Assert: Check for error messages
    // We use `findBy` to wait for the errors to appear after the async action
    expect(await screen.findByText(mockErrors.email[0])).toBeInTheDocument();
    expect(await screen.findByText(mockErrors.subject[0])).toBeInTheDocument();
    expect(await screen.findByText(mockErrors._[0])).toBeInTheDocument();

    // Assert: Check that the form is still visible
    expect(screen.getByRole('form', { name: /Contact Support/i })).toBeInTheDocument();
    expect(screen.queryByText(/Message Sent Successfully!/i)).not.toBeInTheDocument();

    // Assert: Check that the button is no longer in a pending state
    // We use `waitFor` to let the `useTransition` hook settle
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Message/i })).not.toBeDisabled();
    });
    expect(screen.queryByText(/Sending/i)).not.toBeInTheDocument();

    // Assert: Check that the server action was called
    expect(mockedSendContact).toHaveBeenCalledTimes(1);

    // Assert: Check that the error analytics event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { event: 'contact_form_error', errors: mockErrors },
      })
    );
  });
});
