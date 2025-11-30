import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteAccountModal from './DeleteAccountModal';

// --- Global Mocks ---

// Mock fetch API globally for network requests
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// Mock the console.error to prevent test runner pollution
globalThis.console.error = jest.fn();

// --- Helper Functions ---

/**
 * Sets up a mock API response for the deletion endpoint.
 * @param {boolean} ok - Whether the response is successful (response.ok).
 * @param {number} status - The HTTP status code.
 * @param {object} data - The JSON response body.
 */
const mockFetchResponse = (ok: boolean, status: number, data: object) => {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
};

// --- Tests ---

describe('DeleteAccountModal', () => {
  const user = userEvent.setup();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default success response setup (if no specific mock is called in a test)
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Request received' }),
    });
  });

  // ## State & Visibility Tests 👁️

  it('should return null when isOpen is false', () => {
    const { container } = render(<DeleteAccountModal isOpen={false} onClose={mockOnClose} />);
    // Container should be empty
    expect(container.firstChild).toBeNull();
  });

  it('should render the default confirmation state when isOpen is true', () => {
    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

    // Check key visible elements
    expect(screen.getByText('Request Account Deletion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Deletion' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for deletion/i)).toBeInTheDocument();
  });

  // ## Interaction & Behavior Tests 🚀

  it('should close the modal when the Cancel button is clicked', async () => {
    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Verify onClose prop was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  const mockPendingResponse = (delayMs: number = 100) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ message: 'Request received' }),
        });
      }, delayMs);
    });
  };

  it('should enable and disable the submit button during submission', async () => {
    // Mock the delayed response
    mockFetch.mockImplementationOnce(() => mockPendingResponse(100));

    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);
    const submitButton = screen.getByRole('button', { name: 'Request Deletion' });

    // Submission in progress state check
    await user.click(submitButton);
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Submitting...');

    // The key change: The component switches views, so we must check for the content
    // of the NEW view, and confirm the original button is gone.
    await waitFor(
      () => {
        // Assert the success title of the new view is present.
        expect(screen.getByText('Deletion Request Submitted')).toBeInTheDocument();
        // Assert the original button is gone (because the component unmounted the old view)
        expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    ); // Increase timeout slightly for robustness
  });

  it('should send the request with the reason entered in the textarea', async () => {
    const reasonText = 'I am moving to a different platform.';
    mockFetchResponse(true, 200, { message: 'Success' });

    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);
    const reasonInput = screen.getByLabelText(/Reason for deletion/i);
    const submitButton = screen.getByRole('button', { name: 'Request Deletion' });

    // Type a reason
    await user.type(reasonInput, reasonText);

    // Submit
    await user.click(submitButton);

    // Wait for fetch to be called
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Verify the payload sent to the API
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/account/deletion-request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: reasonText }),
      })
    );
  });

  it('should send the request with a null reason if the textarea is empty', async () => {
    mockFetchResponse(true, 200, { message: 'Success' });

    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);
    const submitButton = screen.getByRole('button', { name: 'Request Deletion' });

    // Submit without typing anything
    await user.click(submitButton);

    // Wait for fetch to be called
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Verify the payload sent to the API is null (reason.trim() || null)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/account/deletion-request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: null }),
      })
    );
  });

  // ## Success & Error Handling Tests ✅❌

  it('should switch to the success view on a successful API response', async () => {
    mockFetchResponse(true, 200, { message: 'Success' });

    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

    // Submit the request
    await user.click(screen.getByRole('button', { name: 'Request Deletion' }));

    // Wait for success view to appear
    await waitFor(() => {
      // Check for success title
      expect(screen.getByText('Deletion Request Submitted')).toBeInTheDocument();
      // Check that the original form is gone
      expect(screen.queryByText('Request Account Deletion')).not.toBeInTheDocument();
      // Check that the Close button in the success view calls onClose
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    // Verify clicking the success Close button calls onClose
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display an API error message on an unsuccessful response', async () => {
    const apiError = 'User must cancel pending transactions before deletion.';
    mockFetchResponse(false, 400, { error: apiError });

    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: 'Request Deletion' }));

    await waitFor(
      () => {
        const errorElement = screen.getByText(apiError);
        expect(errorElement).toBeInTheDocument();
        // FIX: Assert that the error element itself has the class
        expect(errorElement).toHaveClass('bg-red-50');
      },
      { timeout: 2000 }
    );
  });

  it('should display the network error message on a network failure', async () => {
    // The message generated by the Error object's message property
    const networkError = 'Network is offline';
    // Mock the fetch to throw a network error (e.g., connection lost)
    mockFetch.mockRejectedValueOnce(new Error(networkError));

    render(<DeleteAccountModal isOpen={true} onClose={mockOnClose} />);

    // Submit the request
    await user.click(screen.getByRole('button', { name: 'Request Deletion' }));

    // Wait for the network error to be displayed
    await waitFor(
      () => {
        const errorElement = screen.getByText(networkError); // FIX: Look for the actual error message
        expect(errorElement).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Ensure the network error was logged
    expect(globalThis.console.error).toHaveBeenCalled();
  });
});
