import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewModal from './ReviewModal';

const mockSingle = jest.fn(() => ({ data: { id: '123' }, error: null }));
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

globalThis.fetch = jest.fn();

const mockOnClose = jest.fn();
const mockOnReviewSubmitted = jest.fn();
const mockPendingReview = {
  meeting_id: '1',
  other_participant_name: 'John Doe',
  meeting_title: 'Dog Walk',
};

describe('ReviewModal', () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock).mockClear();
    mockOnClose.mockClear();
    mockOnReviewSubmitted.mockClear();
  });

  it('renders the modal when isOpen is true and a pendingReview is provided', () => {
    render(
      <ReviewModal
        isOpen={true}
        onClose={mockOnClose}
        pendingReview={mockPendingReview}
        onReviewSubmitted={mockOnReviewSubmitted}
      />
    );

    expect(screen.getByText('Leave a Review')).toBeInTheDocument();
    expect(screen.getByText(/How was your meeting with/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('does not render the modal when isOpen is false', () => {
    render(
      <ReviewModal
        isOpen={false}
        onClose={mockOnClose}
        pendingReview={mockPendingReview}
        onReviewSubmitted={mockOnReviewSubmitted}
      />
    );

    expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
  });

  it('disables the submit button when the comment is less than 5 words', () => {
    render(
      <ReviewModal
        isOpen={true}
        onClose={mockOnClose}
        pendingReview={mockPendingReview}
        onReviewSubmitted={mockOnReviewSubmitted}
      />
    );

    fireEvent.click(screen.getAllByText('★')[4]); // 5 stars
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/), {
      target: { value: 'Too short' },
    });

    expect(screen.getByText('Submit Review')).toBeDisabled();
  });

  it('submits the form successfully with valid data', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ review: { id: '1' } }),
    });

    render(
      <ReviewModal
        isOpen={true}
        onClose={mockOnClose}
        pendingReview={mockPendingReview}
        onReviewSubmitted={mockOnReviewSubmitted}
      />
    );

    fireEvent.click(screen.getAllByText('★')[4]); // 5 stars
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/), {
      target: { value: 'This was a great experience, really enjoyed it.' },
    });

    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: '1',
          rating: 5,
          comment: 'This was a great experience, really enjoyed it.',
        }),
      });
    });

    await waitFor(() => {
      expect(mockOnReviewSubmitted).toHaveBeenCalledWith({ id: '1' });
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when the close button is clicked', () => {
    render(
      <ReviewModal
        isOpen={true}
        onClose={mockOnClose}
        pendingReview={mockPendingReview}
        onReviewSubmitted={mockOnReviewSubmitted}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when the cancel button is clicked', () => {
    render(
      <ReviewModal
        isOpen={true}
        onClose={mockOnClose}
        pendingReview={mockPendingReview}
        onReviewSubmitted={mockOnReviewSubmitted}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
