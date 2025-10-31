import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams } from 'next/navigation';
import AvailabilityDetailPage from './page';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock(
  '../../../../components/MessageModal',
  () =>
    function MockMessageModal() {
      return <div data-testid="message-modal" />;
    }
);
jest.mock(
  '../../../../components/UserReviews',
  () =>
    function MockUserReviews() {
      return <div data-testid="user-reviews" />;
    }
);

const mockGetUser = jest.fn();
const mockAuth = { getUser: mockGetUser };

const mockAvailSingle = jest.fn();
const mockAvailEqStatus = jest.fn(() => ({ single: mockAvailSingle }));
const mockAvailEqId = jest.fn(() => ({
  single: mockAvailSingle,
  eq: mockAvailEqStatus,
}));

const mockOwnerSingle = jest.fn();
const mockOwnerEq = jest.fn(() => ({ single: mockOwnerSingle }));

const mockDogsIn = jest.fn();
const mockDogsSelect = jest.fn(() => ({ in: mockDogsIn }));

const mockFrom = jest.fn();

jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: mockAuth,
    from: mockFrom,
  })),
}));

const mockedUseParams = useParams as jest.Mock;

const mockDog = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  photo_url: 'buddy.png',
  size: 'large',
  age_years: 3,
  age_months: 2,
  gender: 'Male',
  neutered: true,
  dog_friendly: true,
  cat_friendly: false,
  kid_friendly: true,
  temperament: ['Friendly', 'Playful'],
  activities: ['Fetch', 'Swimming'],
  leash_trained: true,
  crate_trained: true,
  house_trained: true,
  fully_vaccinated: true,
  description: 'A very good boy.',
};

const mockOwner = {
  id: 'owner-1',
  first_name: 'Jane',
  last_name: 'Doe',
  profile_photo_url: 'jane.png',
  neighborhood: 'South',
  city: 'Austin',
  bio: 'Dog lover.',
  role: 'pet_owner',
  community_support_badge: 'Community Helper',
  support_story: 'I love helping.',
};

const mockPost = {
  id: 'post-123',
  title: 'Need a sitter for Buddy',
  post_type: 'dog_available',
  status: 'active',
  is_urgent: true,
  owner_id: 'owner-1',
  description: 'Post description here.',
  enabled_days: ['monday', 'tuesday'],
  day_schedules: {
    monday: {
      enabled: true,
      timeSlots: [{ start: '09:00', end: '17:00' }],
    },
    tuesday: {
      enabled: true,
      timeSlots: [{ start: '10:00', end: '16:00' }],
    },
  },
  can_pick_up_drop_off: true,
  owner: mockOwner,
  dog: mockDog,
  dog_ids: ['dog-1'],
  allDogs: [mockDog],
};

describe('AvailabilityDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseParams.mockReturnValue({ id: 'post-123' });

    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockAvailSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockOwnerSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockDogsIn.mockResolvedValue({ data: [], error: null });

    // Mock the router inside `from`
    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'availability') {
        const selectMock = jest.fn((selectString: string) => {
          if (selectString.includes('owner_id, status')) {
            return { eq: mockOwnerEq };
          }
          return { eq: mockAvailEqId }; // Default to main query
        });
        return { select: selectMock };
      }
      if (tableName === 'dogs') {
        return { select: mockDogsSelect };
      }
      return { select: jest.fn() };
    });
  });

  it('shows a loading spinner initially', () => {
    const { container } = render(<AvailabilityDetailPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows "Not Found" error if post is inactive or missing', async () => {
    // `beforeEach` already sets this state (PGRST116 error)
    render(<AvailabilityDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('This availability post is no longer active or has been removed.')
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Back to Community' })).toHaveAttribute(
      'href',
      '/community'
    );
  });

  it('renders a "dog_available" post with one dog', async () => {
    mockAvailSingle.mockResolvedValue({ data: mockPost, error: null });
    render(<AvailabilityDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Need a sitter for Buddy' })).toBeInTheDocument();
    });

    // Use a function matcher to find the text flexibly
    expect(
      screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && content.includes('Dog Available');
      })
    ).toBeInTheDocument();
    expect(screen.getByText('🚨 Urgent')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Buddy's Profile/i })).toBeInTheDocument();
    expect(screen.getByText('About the Owner')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Friendly')).toBeInTheDocument();
    expect(screen.getByText('Fetch')).toBeInTheDocument();
    expect(screen.getByText('🚗 Can Pick Up/Drop Off')).toBeInTheDocument();
  });

  it('renders a "petpal_available" post with no dog', async () => {
    const petPalPost = {
      ...mockPost,
      post_type: 'petpal_available',
      title: 'PetPal Ready to Help',
      dog: null,
      dog_ids: [],
      allDogs: [],
    };
    mockAvailSingle.mockResolvedValue({ data: petPalPost, error: null });
    render(<AvailabilityDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'PetPal Ready to Help' })).toBeInTheDocument();
    });

    expect(screen.getByText('🤝 PetPal Available')).toBeInTheDocument();
    expect(screen.getByText('About the PetPal')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "Buddy's Profile" })).not.toBeInTheDocument();
  });

  it('fetches and displays multiple dogs', async () => {
    const mockDog2 = { ...mockDog, id: 'dog-2', name: 'Lucy' };
    const multiDogPost = {
      ...mockPost,
      dog_ids: ['dog-1', 'dog-2'],
      allDogs: [], // This will be populated by the second fetch
    };
    mockAvailSingle.mockResolvedValue({ data: multiDogPost, error: null });
    mockDogsIn.mockResolvedValue({ data: [mockDog, mockDog2], error: null });

    render(<AvailabilityDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dogs available/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Buddy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucy' })).toBeInTheDocument();
    expect(mockDogsIn).toHaveBeenCalledWith('id', ['dog-1', 'dog-2']);
  });

  it('renders an inactive post if the user is the owner', async () => {
    const mockUser = { id: 'owner-1' };
    const inactivePost = {
      ...mockPost,
      status: 'inactive',
      title: 'My Inactive Post',
    };
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockAvailSingle.mockResolvedValue({ data: inactivePost, error: null });
    mockOwnerSingle.mockResolvedValue({
      data: { owner_id: 'owner-1', status: 'inactive' },
      error: null,
    });

    render(<AvailabilityDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Inactive Post' })).toBeInTheDocument();
    });
    // Verify the "active" filter was not applied
    expect(mockAvailEqStatus).not.toHaveBeenCalled();
  });

  it('formats availability schedule correctly', async () => {
    mockAvailSingle.mockResolvedValue({ data: mockPost, error: null });
    render(<AvailabilityDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Monday 9:00 AM - 5:00 PM')).toBeInTheDocument();
    });
    expect(screen.getByText('Tuesday 10:00 AM - 4:00 PM')).toBeInTheDocument();
  });
});
