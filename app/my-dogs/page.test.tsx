/**
 * @fileoverview Tests for the MyDogsPage component.
 * @path /app/(main)/my-dogs/page.test.tsx
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
// import { SupabaseUserProvider } from '@/components/providers/SupabaseUserProvider'; // <-- REMOVED
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useUserDogs } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import MyDogsPage from './page';

// #region Mocks
// Mock dependencies
jest.mock('@/hooks/useProtectedRoute', () => ({
  useProtectedRoute: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserDogs: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => {
  const fromMock = jest.fn();
  const channelMock = jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    })),
  }));
  const removeChannelMock = jest.fn();

  const supabaseMock = {
    from: fromMock,
    channel: channelMock,
    removeChannel: removeChannelMock,
  };

  return {
    createClient: jest.fn(() => supabaseMock),
    supabase: supabaseMock,
  };
});

jest.mock('next/image', () => {
  const MockImage = (props: React.ComponentProps<'img'>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  };
  MockImage.displayName = 'MockImage';
  return MockImage;
});

jest.mock('next/link', () => {
  type MockLinkProps = {
    href: string;
    children: React.ReactNode;
    className?: string;
  };
  const MockLink = ({ href, children, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock react-query client
const mockQueryClient = {
  invalidateQueries: jest.fn(),
};
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => mockQueryClient,
}));

// Mock window.confirm
globalThis.confirm = jest.fn(() => true);

// Cast mocks
const mockedUseProtectedRoute = useProtectedRoute as jest.Mock;
const mockedUseUserDogs = useUserDogs as jest.Mock;
// #endregion

// #region Test Wrapper
const createWrapper = () => {
  const queryClient = new QueryClient();
  // Give the wrapper component a display name
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {/* SupabaseUserProvider is no longer needed here as the component 
          gets the user from useProtectedRoute */}
      {children}
    </QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};
// #endregion

// #region Mock Data
const mockUser = { id: '123', email: 'user@example.com' };
const mockDogs = [
  {
    id: 'dog1',
    name: 'Buddy',
    breed: 'Golden Retriever',
    photo_url: 'http://example.com/buddy.png',
    // Add other properties to match the Dog interface
    age_years: 5,
    age_months: 0,
    size: 'large',
    gender: 'Male' as const,
    neutered: true,
  },
  {
    id: 'dog2',
    name: 'Lucy',
    breed: 'Labrador',
    photo_url: 'http://example.com/lucy.png',
    age_years: 3,
    age_months: 2,
    size: 'large',
    gender: 'Female' as const,
    neutered: true,
  },
];
// #endregion

describe('MyDogsPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockedUseProtectedRoute.mockReturnValue({ user: null, isLoading: false });
    mockedUseUserDogs.mockReturnValue({ data: [], isLoading: false });
    (globalThis.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders loading state while authenticating', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: null, isLoading: true }); // authLoading = true
    render(<MyDogsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading your dogs...')).toBeInTheDocument();
  });

  it('renders loading state while fetching dogs', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false }); // authLoading = false
    mockedUseUserDogs.mockReturnValue({ data: [], isLoading: true }); // loading = true
    render(<MyDogsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading your dogs...')).toBeInTheDocument();
  });

  it('renders empty state when user has no dogs', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false });
    // useUserDogs default mock returns { data: [], isLoading: false }
    render(<MyDogsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('No dogs yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Your First Dog' })).toHaveAttribute(
      'href',
      '/my-dogs/add'
    );
  });

  it('renders a list of dogs', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false });
    mockedUseUserDogs.mockReturnValue({
      data: mockDogs,
      isLoading: false,
    });
    render(<MyDogsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText('Lucy')).toBeInTheDocument();
    expect(screen.getByText('Labrador')).toBeInTheDocument();
  });

  it('calls deleteDog and invalidates query on successful deletion', async () => {
    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false });
    mockedUseUserDogs.mockReturnValue({
      data: mockDogs,
      isLoading: false,
    });

    // Mock the chainable Supabase call
    const mockEq2 = jest.fn(() => Promise.resolve({ error: null }));
    const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
    const mockDelete = jest.fn(() => ({ eq: mockEq1 }));
    (createClient().from as jest.Mock).mockReturnValue({ delete: mockDelete });

    render(<MyDogsPage />, { wrapper: createWrapper() });

    // Find all delete buttons (on the hover overlay)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]); // Click the first "Delete" button (for Buddy)

    // Check confirm was called
    expect(globalThis.confirm).toHaveBeenCalledWith('Are you sure you want to delete this dog?');

    // Check Supabase was called correctly
    await waitFor(() => {
      expect(createClient().from).toHaveBeenCalledWith('dogs');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq1).toHaveBeenCalledWith('id', 'dog1');
      expect(mockEq2).toHaveBeenCalledWith('owner_id', '123');
    });

    // Check query was invalidated
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['userDogs', '123'], // Matches component logic: ['userDogs', user?.id]
    });
  });

  it('shows an error message if deletion fails', async () => {
    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false });
    mockedUseUserDogs.mockReturnValue({
      data: mockDogs,
      isLoading: false,
    });

    // Mock a failed Supabase call
    const mockError = { message: 'Deletion failed' };
    const mockEq2 = jest.fn(() => Promise.resolve({ error: mockError }));
    const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
    const mockDelete = jest.fn(() => ({ eq: mockEq1 }));
    (createClient().from as jest.Mock).mockReturnValue({ delete: mockDelete });

    render(<MyDogsPage />, { wrapper: createWrapper() });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    // Check for the error message
    await waitFor(() => {
      expect(screen.getByText('Failed to delete dog. Deletion failed')).toBeInTheDocument();
    });

    // Ensure query was not invalidated
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
