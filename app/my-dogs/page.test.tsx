import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useUserDogs } from '@/hooks/useProfile';
import { supabase } from '@/libs/supabase';
import MyDogsPage from './page';

// Mock dependencies
jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserDogs: jest.fn(),
}));

jest.mock('@/libs/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

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
  };
  const MockLink = ({ href, children }: MockLinkProps) => <a href={href}>{children}</a>;
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
global.confirm = jest.fn(() => true);

const createWrapper = () => {
  const queryClient = new QueryClient();
  // Give the wrapper component a display name
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  QueryWrapper.displayName = 'QueryWrapper';
  return QueryWrapper;
};

// Mock data
const mockUser = { id: '123', email: 'user@example.com' };
const mockDogs = [
  {
    id: 'dog1',
    name: 'Buddy',
    breed: 'Golden Retriever',
    photo_url: 'http://example.com/buddy.png',
  },
  {
    id: 'dog2',
    name: 'Lucy',
    breed: 'Labrador',
    photo_url: 'http://example.com/lucy.png',
  },
];

describe('MyDogsPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ user: null, loading: false });
    (useUserDogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders loading state', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<MyDogsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading your dogs...')).toBeInTheDocument();
  });

  it('renders unauthenticated state', () => {
    render(<MyDogsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Sign in to view your dogs')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/signin');
  });

  it('renders empty state when user has no dogs', () => {
    (useUser as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    render(<MyDogsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('No dogs yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Your First Dog' })).toHaveAttribute(
      'href',
      '/my-dogs/add'
    );
  });

  it('renders a list of dogs', () => {
    (useUser as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    (useUserDogs as jest.Mock).mockReturnValue({
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
    (useUser as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    (useUserDogs as jest.Mock).mockReturnValue({
      data: mockDogs,
      isLoading: false,
    });

    // Mock the chainable Supabase call
    const mockEq2 = jest.fn(() => Promise.resolve({ error: null }));
    const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
    const mockDelete = jest.fn(() => ({ eq: mockEq1 }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    render(<MyDogsPage />, { wrapper: createWrapper() });

    // Find all delete buttons (they appear on hover, but are in the DOM)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]); // Click the first "Delete" button (for Buddy)

    // Check confirm was called
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this dog?');

    // Check Supabase was called correctly
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('dogs');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq1).toHaveBeenCalledWith('id', 'dog1');
      expect(mockEq2).toHaveBeenCalledWith('owner_id', '123');
    });

    // Check query was invalidated
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dogs', '123'],
    });
  });

  it('shows an error message if deletion fails', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    (useUserDogs as jest.Mock).mockReturnValue({
      data: mockDogs,
      isLoading: false,
    });

    // Mock a failed Supabase call
    const mockError = new Error('Deletion failed');
    const mockEq2 = jest.fn(() => Promise.resolve({ error: mockError }));
    const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
    const mockDelete = jest.fn(() => ({ eq: mockEq1 }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    render(<MyDogsPage />, { wrapper: createWrapper() });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    // Check for the error message
    await waitFor(() => {
      expect(screen.getByText('Failed to delete dog')).toBeInTheDocument();
    });

    // Ensure query was not invalidated
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
