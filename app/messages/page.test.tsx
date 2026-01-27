import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createClient } from '@/lib/supabase/client';
// Import the hook so we can cast the mock
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import MessagesPage from './page';

// Mocks
jest.mock('@/hooks/useProtectedRoute', () => ({
  useProtectedRoute: jest.fn(),
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

jest.mock('@/lib/supabase/client', () => {
  const fromMock = jest.fn();
  const channelMock = jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    })),
  }));
  return {
    createClient: jest.fn(() => ({
      from: fromMock,
      channel: channelMock,
      removeChannel: jest.fn(),
    })),
  };
});

// Cast the mocked hooks
const mockedUseProtectedRoute = useProtectedRoute as jest.Mock;
const mockedFrom = createClient().from as jest.Mock;
describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock chain implementation before each test
    // This default mock handles the .or().order() chain
    const mockOrderImpl = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrImpl = jest.fn().mockReturnValue({ order: mockOrderImpl });
    const mockSelectImpl = jest.fn().mockReturnValue({
      or: mockOrImpl,
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockedFrom.mockReturnValue({ select: mockSelectImpl });

    // Default to an authenticated user, as this is the component's primary state
    mockedUseProtectedRoute.mockReturnValue({
      user: { id: 'default-user' },
      isLoading: false,
    });
  });

  it('shows the main loading spinner while authenticating', () => {
    // Override default auth mock for this test
    mockedUseProtectedRoute.mockReturnValue({
      user: null,
      isLoading: true, // This maps to `authLoading` in the component
    });

    render(<MessagesPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });

  /*
   * NOTE: The test 'shows "Please sign in" message' has been removed.
   * The new implementation uses `useProtectedRoute`, which handles
   * redirection if the user is not authenticated. The component
   * itself no longer renders a "Please sign in" state.
   */

  it('shows "No conversations yet" when logged in but fetch returns empty', async () => {
    // Set up the specific user for this test
    mockedUseProtectedRoute.mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    // The default `mockOrderImpl` from beforeEach already returns { data: [] }
    // so no need to re-mock `supabase.from`

    render(<MessagesPage />);

    expect(screen.getByRole('heading', { name: /conversations/i })).toBeInTheDocument();

    // Wait for the "No conversations yet" message to appear after loading
    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    // The right pane should show the placeholder
    expect(screen.getByRole('heading', { name: /select a conversation/i })).toBeInTheDocument();
  });

  it('fetches and displays conversations, then loads messages for the first one', async () => {
    const mockUser = { id: 'user-123', email: 'user@test.com' };
    const mockConversations = [
      {
        id: 'convo-1',
        participant1_id: 'user-123',
        participant2_id: 'user-456',
        participant1: {
          id: 'user-123',
          first_name: 'Test',
          last_name: 'User',
          profile_photo_url: 'test.png',
        },
        participant2: {
          id: 'user-456',
          first_name: 'Jane',
          last_name: 'Doe',
          profile_photo_url: 'jane.png',
        },
        availability: { id: 'avail-1', title: 'Needs a Dog Sitter', post_type: 'petpal_available' },
        last_message_at: new Date().toISOString(),
      },
    ];
    const mockMessages = [
      {
        id: 'msg-1',
        sender_id: 'user-456',
        recipient_id: 'user-123',
        content: 'Hello there!',
        created_at: '2023-10-27T10:00:00Z',
      },
      {
        id: 'msg-2',
        sender_id: 'user-123',
        recipient_id: 'user-456',
        content: 'Hi!',
        created_at: '2023-10-27T10:01:00Z',
      },
    ];

    // Set up the authenticated user
    mockedUseProtectedRoute.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Mock for 'conversations' table: select().or().order()
    const convoOrder = jest.fn().mockResolvedValue({ data: mockConversations, error: null });
    const convoOr = jest.fn().mockReturnValue({ order: convoOrder });
    const convoSelect = jest.fn().mockReturnValue({ or: convoOr });

    // Mock for 'messages' table: select().or().order()
    const msgOrder = jest.fn().mockResolvedValue({ data: mockMessages, error: null });
    const msgOr = jest.fn().mockReturnValue({ order: msgOrder });
    const msgSelect = jest.fn().mockReturnValue({ or: msgOr });

    mockedFrom.mockImplementation((tableName: string) => {
      if (tableName === 'conversations') {
        return { select: convoSelect };
      }
      if (tableName === 'messages') {
        return { select: msgSelect };
      }
      return { select: jest.fn() }; // Default empty mock
    });

    render(<MessagesPage />);

    // --- 1. Check Sidebar ---
    const sidebar = screen.getByRole('heading', { name: /conversations/i }).closest('aside');
    expect(sidebar).toBeInTheDocument();

    await waitFor(() => {
      if (sidebar) {
        // Find the conversation item
        expect(within(sidebar).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
        expect(within(sidebar).getByText('Needs a Dog Sitter')).toBeInTheDocument();
      }
    });

    // --- 2. Check Main Thread ---
    // Wait for the message input to appear, confirming a conversation is selected
    const mainContent = screen.getByPlaceholderText(/type your message/i).closest('section');
    expect(mainContent).toBeInTheDocument();

    await waitFor(() => {
      if (mainContent) {
        // Check header
        expect(within(mainContent).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
        // Check messages
        expect(within(mainContent).getByText('Hello there!')).toBeInTheDocument();
        expect(within(mainContent).getByText('Hi!')).toBeInTheDocument();
      }
    });

    // --- 3. Check Message Styling ---
    // Find *your* message
    const userMessage = screen.getByText('Hi!').closest('.message-bubble');
    expect(userMessage).toHaveClass('bg-blue-600 text-white');

    // Find the *other participant's* message
    const otherMessage = screen.getByText('Hello there!').closest('.message-bubble');
    expect(otherMessage).toHaveClass('bg-white text-gray-900');
  });
});
