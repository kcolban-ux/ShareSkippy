import { render, screen, act } from '@testing-library/react';
import AppLayout from './AppLayout';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import ReviewBanner from './ReviewBanner';
import ReviewModal from './ReviewModal';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('./Footer', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-footer" />),
}));

jest.mock('./Header', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-header" />),
}));

jest.mock('./LoggedInNav', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-logged-in-nav" />),
}));

jest.mock('./ReviewBanner', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-review-banner" />),
}));

jest.mock('./ReviewModal', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-review-modal" />),
}));

// Type-safe mocks
const mockUsePathname = usePathname as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const MockReviewBanner = ReviewBanner as jest.Mock;
const MockReviewModal = ReviewModal as jest.Mock;

const mockUser = { id: '123', email: 'test@example.com' };

describe('AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading state', () => {
    mockUseUser.mockReturnValue({ loading: true, user: null });
    mockUsePathname.mockReturnValue('/');

    render(<AppLayout>Test Children</AppLayout>);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-header')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Children')).not.toBeInTheDocument();
  });

  it('renders correctly for a logged-out user on a non-auth page', () => {
    mockUseUser.mockReturnValue({ loading: false, user: null });
    mockUsePathname.mockReturnValue('/');

    render(<AppLayout>Test Children</AppLayout>);

    expect(screen.getByText('Test Children')).toBeInTheDocument();
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-logged-in-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-review-banner')).not.toBeInTheDocument();
  });

  it('renders correctly for a logged-in user on a non-auth page', () => {
    mockUseUser.mockReturnValue({ loading: false, user: mockUser });
    mockUsePathname.mockReturnValue('/dashboard');

    render(<AppLayout>Test Children</AppLayout>);

    expect(screen.getByText('Test Children')).toBeInTheDocument();
    expect(screen.getByTestId('mock-logged-in-nav')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    expect(screen.getByTestId('mock-review-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-header')).not.toBeInTheDocument();
  });

  it('renders only children on an auth page', () => {
    mockUseUser.mockReturnValue({ loading: false, user: mockUser });
    mockUsePathname.mockReturnValue('/signin');

    render(<AppLayout>Sign In Page</AppLayout>);

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-logged-in-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-footer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-review-banner')).not.toBeInTheDocument();
  });

  it('handles review modal open and close flow', () => {
    mockUseUser.mockReturnValue({ loading: false, user: mockUser });
    mockUsePathname.mockReturnValue('/dashboard');

    render(<AppLayout>Test Children</AppLayout>);

    // 1. Check initial state (modal closed)
    const initialModalProps = MockReviewModal.mock.lastCall[0];
    expect(initialModalProps.isOpen).toBe(false);

    // 2. Simulate clicking the review banner
    const bannerProps = MockReviewBanner.mock.lastCall[0];
    const testReview = { id: 'rev123', status: 'pending' };
    act(() => {
      bannerProps.onReviewClick(testReview);
    });

    // 3. Check if modal is now open with correct data
    const openModalProps = MockReviewModal.mock.lastCall[0];
    expect(openModalProps.isOpen).toBe(true);
    expect(openModalProps.pendingReview).toBe(testReview);

    // 4. Simulate closing the modal
    act(() => {
      openModalProps.onClose();
    });

    // 5. Check if modal is closed and review cleared
    const closedModalProps = MockReviewModal.mock.lastCall[0];
    expect(closedModalProps.isOpen).toBe(false);
    expect(closedModalProps.pendingReview).toBe(null);
  });
});
