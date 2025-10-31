import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { supabase } from '@/libs/supabase';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import MessagesPage from './page';

jest.mock('@/libs/supabase/hooks', () => ({
  useSupabaseAuth: jest.fn(),
}));

jest.mock(
  '@/components/MeetingModal',
  () =>
    function MockedMeetingModal() {
      return <div data-testid="meeting-modal" />;
    }
);

jest.mock(
  '@/components/MessageModal',
  () =>
    function MockedMessageModal() {
      return <div data-testid="message-modal" />;
    }
);

jest.mock('@/libs/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          order: jest.fn(),
        })),
        limit: jest.fn(),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => ({
          unsubscribe: jest.fn(),
        })),
      })),
    })),
    removeChannel: jest.fn(),
  },
}));

const mockedUseSupabaseAuth = useSupabaseAuth as jest.Mock;

const mockedFrom = supabase.from as jest.Mock;

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock chain implementation before each test
    const mockOrderImpl = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrImpl = jest.fn().mockReturnValue({ order: mockOrderImpl });
    const mockLimitImpl = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelectImpl = jest.fn().mockReturnValue({
      or: mockOrImpl,
      limit: mockLimitImpl,
    });
    mockedFrom.mockReturnValue({ select: mockSelectImpl });

    mockedUseSupabaseAuth.mockReturnValue({
      user: null,
      loading: false,
    });
  });

  it('shows the main loading spinner while authenticating', () => {
    mockedUseSupabaseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<MessagesPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });

  it('shows "Please sign in" message if user is not authenticated', () => {
    mockedUseSupabaseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<MessagesPage />);

    expect(screen.getByRole('heading', { name: /please sign in/i })).toBeInTheDocument();
    expect(screen.getByText('You need to be signed in to view messages.')).toBeInTheDocument();
  });

  it('shows "No conversations yet" when logged in but fetch returns empty', async () => {
    mockedUseSupabaseAuth.mockReturnValue({
      user: { id: 'user-123' },
      loading: false,
    });

    render(<MessagesPage />);

    expect(screen.getByRole('heading', { name: /conversations/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /select a conversation/i })).toBeInTheDocument();
  });

  it('fetches and displays conversations, then loads messages for the first one', async () => {
    const mockUser = { id: 'user-123', email: 'user@test.com' };
    const mockConversations = [
      {
        id: 'convo-1',
        participant1_id: 'user-123',
        participant2_id: 'user-456',
        participant1: {},
        participant2: {
          id: 'user-456',
          first_name: 'Jane',
          last_name: 'Doe',
          profile_photo_url: 'jane.png',
        },
        availability: { title: 'Needs a Dog Sitter' },
        last_message_at: new Date().toISOString(),
      },
    ];
    const mockMessages = [
      {
        id: 'msg-1',
        sender_id: 'user-456',
        content: 'Hello there!',
        created_at: '2023-10-27T10:00:00Z',
      },
      {
        id: 'msg-2',
        sender_id: 'user-123',
        content: 'Hi!',
        created_at: '2023-10-27T10:01:00Z',
      },
    ];

    mockedUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const convoOrder = jest.fn().mockResolvedValue({ data: mockConversations, error: null });
    const convoOr = jest.fn().mockReturnValue({ order: convoOrder });
    const convoSelect = jest.fn().mockReturnValue({ or: convoOr });

    const msgOrder = jest.fn().mockResolvedValue({ data: mockMessages, error: null });
    const msgOr = jest.fn().mockReturnValue({ order: msgOrder });
    const msgLimit = jest.fn().mockResolvedValue({ data: [], error: null });
    const msgSelect = jest.fn().mockReturnValue({ or: msgOr, limit: msgLimit });

    mockedFrom.mockImplementation((tableName: string) => {
      if (tableName === 'conversations') {
        return { select: convoSelect };
      }
      if (tableName === 'messages') {
        return { select: msgSelect };
      }
      return { select: jest.fn() };
    });

    render(<MessagesPage />);

    const sidebar = screen.getByRole('heading', { name: /conversations/i }).closest('aside');
    expect(sidebar).toBeInTheDocument();

    await waitFor(() => {
      if (sidebar) {
        expect(within(sidebar).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
        expect(within(sidebar).getByText('Needs a Dog Sitter')).toBeInTheDocument();
      }
    });

    const mainContent = screen.getByPlaceholderText(/type your message/i).closest('section');
    expect(mainContent).toBeInTheDocument();

    await waitFor(() => {
      if (mainContent) {
        expect(within(mainContent).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
        expect(within(mainContent).getByText('Hello there!')).toBeInTheDocument();
        expect(within(mainContent).getByText('Hi!')).toBeInTheDocument();
      }
    });

    const userMessage = screen.getByText('Hi!').closest('.message-bubble');
    expect(userMessage).toHaveClass('bg-blue-600 text-white');

    const otherMessage = screen.getByText('Hello there!').closest('.message-bubble');
    expect(otherMessage).toHaveClass('bg-white text-gray-900');
  });
});
