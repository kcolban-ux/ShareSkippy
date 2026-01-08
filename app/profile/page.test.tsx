import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import ProfilePage from './page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/libs/utils', () => ({
  formatLocation: jest.fn((loc) => ({
    neighborhood: loc.neighborhood,
    city: loc.city,
    state: loc.state,
  })),
}));

jest.mock(
  '../../components/DeleteAccountModal',
  () =>
    function MockDeleteModal() {
      return <div data-testid="delete-modal" />;
    }
);
jest.mock(
  '../../components/DeletionRequestStatus',
  () =>
    function MockDeletionStatus() {
      return <div data-testid="deletion-status" />;
    }
);
jest.mock(
  '../../components/UserReviews',
  () =>
    function MockUserReviews() {
      return <div data-testid="user-reviews" />;
    }
);

jest.spyOn(console, 'error').mockImplementation(() => {});

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

const mockedUseUser = useUser as jest.Mock<ReturnType<typeof useUser>, Parameters<typeof useUser>>;

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to a loading state
    mockedUseUser.mockReturnValue({
      user: null,
      loading: true,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  it('shows the loading spinner while user is loading', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Loading your profile...')).toBeInTheDocument();
  });

  it('shows an error message if there is no user session', async () => {
    mockedUseUser.mockReturnValue({
      user: null,
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Error Loading Profile' })).toBeInTheDocument();
      expect(screen.getByText('No session')).toBeInTheDocument();
    });
  });

  it('shows "Profile Not Found" if user exists but profile is null', async () => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    // Simulate "not found"
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Profile Not Found' })).toBeInTheDocument();
    });
    expect(screen.getByText('Please complete your profile setup.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Your Profile' })).toHaveAttribute(
      'href',
      '/profile/edit'
    );
  });

  it('shows a generic error message if profile fetch fails', async () => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    mockSingle.mockRejectedValue(new Error('Database connection failed'));
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Error Loading Profile' })).toBeInTheDocument();
      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders the full profile when user and data are loaded', async () => {
    const mockProfile = {
      id: 'user-123',
      first_name: 'John',
      last_name: 'Doe',
      role: 'pet_owner',
      profile_photo_url: 'http://example.com/photo.png',
      bio: 'This is my bio.',
      neighborhood: 'My Neighborhood',
      city: 'My City',
      state: 'TX',
      support_preferences: ['sick_recovering', 'other'],
      support_story: 'This is my support story.',
      facebook_url: 'http://facebook.com/john',
      instagram_url: 'http://instagram.com/john',
    };

    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: "John Doe's Profile" })).toBeInTheDocument();
    });

    expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'http://example.com/photo.png');
    expect(screen.getByText('This is my bio.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();

    expect(screen.getByText('📍 My Neighborhood, My City, TX')).toBeInTheDocument();

    expect(screen.getByText('🏥 Sick or recovering owners')).toBeInTheDocument();
    expect(screen.getByText('🤝 Other')).toBeInTheDocument();
    expect(screen.getByText('This is my support story.')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: '📘 Facebook' })).toHaveAttribute(
      'href',
      'http://facebook.com/john'
    );
    expect(screen.getByRole('link', { name: '📷 Instagram' })).toHaveAttribute(
      'href',
      'http://instagram.com/john'
    );
    expect(screen.queryByRole('link', { name: '💼 LinkedIn' })).not.toBeInTheDocument();

    expect(screen.getByTestId('deletion-status')).toBeInTheDocument();
    expect(screen.getByTestId('user-reviews')).toBeInTheDocument();
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });
});
