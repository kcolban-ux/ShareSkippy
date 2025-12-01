import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useUserProfile, useUserDogs } from '@/hooks/useProfile';
import { createClient } from '@/libs/supabase/client';
import ShareAvailability from './page';

const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock('@/components/providers/SupabaseUserProvider');
jest.mock('@/hooks/useProfile');
jest.mock('@/libs/supabase/client');

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://dummy-url.com';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'dummy-key';

// Cast the imported mocks to Jest's mock type
const mockedUseUser = useUser as jest.Mock;
const mockedUseUserProfile = useUserProfile as jest.Mock;
const mockedUseUserDogs = useUserDogs as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

describe('ShareAvailability Page', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { city: 'Testville', state: 'TX' };
  const mockDogs = [{ id: 'dog-1', name: 'Buddy', breed: 'Golden' }];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default "happy path" mocks for an authenticated user
    mockedUseUser.mockReturnValue({ user: mockUser, loading: false });
    mockedUseUserProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
    });
    mockedUseUserDogs.mockReturnValue({ data: mockDogs, isLoading: false });
    mockedCreateClient.mockReturnValue({
      // Mock Supabase client
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({ data: [{}], error: null }),
        })),
      })),
    });
  });

  it('shows loading spinner while auth is loading', () => {
    mockedUseUser.mockReturnValue({ user: null, loading: true });
    render(<ShareAvailability />);
    expect(screen.getByText(/Checking authentication.../i)).toBeInTheDocument();
  });

  it('shows loading spinner while profile/dogs are loading', () => {
    mockedUseUserProfile.mockReturnValue({ data: null, isLoading: true });
    render(<ShareAvailability />);
    expect(screen.getByText(/Loading your data.../i)).toBeInTheDocument();
  });

  it('redirects to /signin if user is not authenticated', async () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false });
    render(<ShareAvailability />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/signin');
    });
  });

  it('renders Step 1 (Choose Type) by default for authenticated user', () => {
    render(<ShareAvailability />);
    expect(screen.getByText(/What are you sharing availability for?/i)).toBeInTheDocument();
    expect(screen.getByText(/My Dog wants a Pal/i)).toBeInTheDocument();
    expect(screen.getByText(/I am a PetPal/i)).toBeInTheDocument();
  });

  it('navigates to Step 2 for "I am a PetPal" flow', () => {
    render(<ShareAvailability />);

    fireEvent.click(screen.getByText(/I am a PetPal/i));

    // Should be on Step 2
    expect(screen.getByText(/Pet Sitter Availability Details/i)).toBeInTheDocument();
    expect(screen.queryByText(/Select Dog\(s\)/i)).not.toBeInTheDocument();
  });

  it('navigates to Step 2 for "My Dog" flow when user has dogs', () => {
    render(<ShareAvailability />);

    fireEvent.click(screen.getByText(/My Dog wants a Pal/i));

    // Should be on Step 2
    expect(screen.getByText(/Dog Availability Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Dog\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText('Buddy')).toBeInTheDocument();
  });

  it('shows an error and stays on Step 1 if "My Dog" is clicked with no dogs', () => {
    mockedUseUserDogs.mockReturnValue({ data: [], isLoading: false }); // User has 0 dogs

    render(<ShareAvailability />);

    // Should show the warning on Step 1
    expect(screen.getByText(/No dog found in your profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a dog to your profile/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/My Dog wants a Pal/i));

    expect(
      screen.getByText(/You need to add a dog to your profile before sharing dog availability./i)
    ).toBeInTheDocument();

    // Should STILL be on Step 1
    expect(screen.getByText(/What are you sharing availability for?/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dog Availability Details/i)).not.toBeInTheDocument();
  });

  it('navigates from Step 2 back to Step 1 when "Back" is clicked', () => {
    render(<ShareAvailability />);

    // Go to Step 2
    fireEvent.click(screen.getByText(/I am a PetPal/i));
    expect(screen.getByText(/Pet Sitter Availability Details/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /← Back/i }));

    // Should be back on Step 1
    expect(screen.getByText(/What are you sharing availability for?/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pet Sitter Availability Details/i)).not.toBeInTheDocument();
  });
});
