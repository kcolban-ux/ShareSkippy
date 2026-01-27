import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MeetingModal from './MeetingModal'; // Adjust path as needed

// #region Type Definitions
interface Recipient {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
}

interface Conversation {
  id: string;
  availability_id: string;
}

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Recipient;
  conversation: Conversation | null;
  onMeetingCreated: () => void;
}

interface PostgrestResponse {
  error: Error | null;
  data?: unknown;
}

interface MockUpdateBuilder {
  // eslint-disable-next-line no-unused-vars
  eq: (column: string, value: string) => Promise<PostgrestResponse>;
}

interface MeetingInsertData {
  requester_id: string;
  recipient_id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
}

interface MessageInsertData {
  sender_id: string;
  recipient_id: string;
  subject: string;
}

interface ConversationUpdateData {
  last_message_at: string;
}
// #endregion

// #region Mocks

// 1. Mock Supabase
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();

jest.mock('@/lib/supabase/client', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: mockGetUser,
      },
      from: (tableName: string) => mockFrom(tableName),
    }),
  };
});

const mockInsertChain = {
  select: () => mockSelect(),
};
const mockUpdateChain: MockUpdateBuilder = {
  eq: (column: string, value: string) => mockEq(column, value),
};

mockFrom.mockImplementation((tableName: string) => {
  if (tableName === 'meetings') {
    return {
      insert: (data: MeetingInsertData) => {
        mockInsert(data); // Log the call
        return mockInsertChain; // Return the chain: .select()
      },
    };
  }
  if (tableName === 'messages') {
    return {
      insert: (data: MessageInsertData) => {
        mockInsert(data); // Log the call
        return Promise.resolve({ error: null });
      },
    };
  }
  if (tableName === 'conversations') {
    return {
      update: (data: ConversationUpdateData) => {
        mockUpdate(data); // Log the call
        return mockUpdateChain; // Return the chain: .eq()
      },
    };
  }
  return {
    insert: () => mockInsertChain,
    update: () => mockUpdateChain,
  };
});

mockSelect.mockImplementation(() => ({
  single: () => mockSingle(),
}));
mockEq.mockImplementation(() => Promise.resolve({ error: null }));

// 2. Mock DatePicker Component
jest.mock('@/components/ui/DatePicker', () => ({
  __esModule: true,
  default: (props: {
    // eslint-disable-next-line no-unused-vars
    onDateSelect: (date: string) => void;
    placeholder: string;
    selectedDate: string;
  }) => (
    <input
      data-testid="datepicker"
      aria-label={props.placeholder} // Use placeholder for easy selection
      value={props.selectedDate}
      onChange={(e) => props.onDateSelect(e.target.value)}
    />
  ),
}));

// 3. Mock Globals
globalThis.fetch = jest.fn();
globalThis.alert = jest.fn();
jest.spyOn(console, 'error').mockImplementation(() => {});

// **FIX: Use local time string, not UTC, for MOCK_NOW**
const MOCK_NOW = new Date('2025-11-10T10:00:00');

// #endregion

// #region Mock Data
const mockRecipient: Recipient = {
  id: 'recipient-uuid-123',
  first_name: 'Jane',
  last_name: 'Doe',
  profile_photo_url: 'https://example.com/avatar.png',
};

const mockConversation: Conversation = {
  id: 'convo-uuid-456',
  availability_id: 'avail-uuid-789',
};

const mockAuthUser = {
  id: 'user-uuid-abc',
};

const mockCreatedMeeting = {
  id: 'meeting-uuid-xyz',
  requester_id: mockAuthUser.id,
  recipient_id: mockRecipient.id,
  title: 'Test Meeting',
};

const mockOnClose = jest.fn();
const mockOnMeetingCreated = jest.fn();

const defaultProps: MeetingModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  recipient: mockRecipient,
  conversation: mockConversation,
  onMeetingCreated: mockOnMeetingCreated,
};

const renderComponent = (props: Partial<MeetingModalProps> = {}) => {
  return render(<MeetingModal {...defaultProps} {...props} />);
};

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/Meeting Title/i), {
    target: { value: 'Test Meeting' },
  });
  fireEvent.change(screen.getByLabelText(/Meeting Place/i), {
    target: { value: 'Test Location' },
  });

  fireEvent.change(screen.getByLabelText('Select start date'), {
    target: { value: '2025-11-11' }, // Tomorrow
  });
  fireEvent.change(screen.getByLabelText(/Start Time/i), {
    target: { value: '14:00' }, // 2:00 PM
  });

  fireEvent.change(screen.getByLabelText('Select end date'), {
    target: { value: '2025-11-11' }, // Tomorrow
  });
  fireEvent.change(screen.getByLabelText(/End Time/i), {
    target: { value: '15:00' }, // 3:00 PM
  });
};
// #endregion

describe('MeetingModal', () => {
  beforeEach(() => {
    // **FIX: Move timer mocks into beforeEach**
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);

    jest.clearAllMocks();

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    mockGetUser.mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    });

    mockSingle.mockResolvedValue({ data: mockCreatedMeeting, error: null });
    mockEq.mockResolvedValue({ error: null });
  });

  // **FIX: Add afterEach to reset timers**
  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders null when isOpen is false', () => {
    const { container } = renderComponent({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /Schedule Meeting/i })).toBeInTheDocument();
  });

  it('displays recipient information correctly', () => {
    renderComponent();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Meeting with')).toBeInTheDocument();
    expect(screen.getByAltText('Jane Doe')).toHaveAttribute('src', mockRecipient.profile_photo_url);
  });

  it('handles user input changes', () => {
    renderComponent();
    const titleInput = screen.getByLabelText(/Meeting Title/i);
    fireEvent.change(titleInput, { target: { value: 'My New Meeting' } });
    expect(titleInput).toHaveValue('My New Meeting');

    const timeInput = screen.getByLabelText(/Start Time/i);
    fireEvent.change(timeInput, { target: { value: '13:30' } });
    expect(timeInput).toHaveValue('13:30');

    const dateInput = screen.getByLabelText('Select start date');
    fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
    expect(dateInput).toHaveValue('2025-12-25');
  });

  it('calls onClose when the close button is clicked', () => {
    renderComponent();
    // This test assumes you've added aria-label="Close" to the 'X' button
    // in your component file, as advised.
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledWith();
  });

  it('calls onClose when the cancel button is clicked', () => {
    renderComponent();
    // This test will now pass because you fixed the component HTML
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledWith();
  });

  // #region Validation Tests
  it('shows an error if title is missing on submit', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));

    await waitFor(() => {
      expect(screen.getByText('Meeting title is required')).toBeInTheDocument();
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows an error if start date or time is missing on submit', async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/Meeting Title/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));

    await waitFor(() => {
      expect(screen.getByText('Start date and time are required')).toBeInTheDocument();
    });
  });

  it('shows an error if end time is before start time', async () => {
    renderComponent();
    fillForm();

    fireEvent.change(screen.getByLabelText(/Start Time/i), {
      target: { value: '16:00' }, // 4:00 PM
    });
    fireEvent.change(screen.getByLabelText(/End Time/i), {
      target: { value: '15:00' }, // 3:00 PM
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));

    await waitFor(() => {
      expect(screen.getByText('End time must be after start time')).toBeInTheDocument();
    });
  });

  it('shows an error if start time is in the past', async () => {
    renderComponent();
    fillForm();

    fireEvent.change(screen.getByLabelText('Select start date'), {
      target: { value: '2025-11-10' }, // Today (MOCK_NOW is 10:00 AM)
    });
    fireEvent.change(screen.getByLabelText(/Start Time/i), {
      target: { value: '09:00' }, // 9:00 AM (in the past)
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));

    // This test will now pass because MOCK_NOW is a local time
    await waitFor(() => {
      expect(screen.getByText('Meeting cannot be scheduled in the past')).toBeInTheDocument();
    });
  });

  it('shows an error if user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    renderComponent();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to schedule a meeting')).toBeInTheDocument();
    });
  });

  it('shows an error if meeting insertion fails', async () => {
    const dbError = new Error('Database insertion failed');
    mockSingle.mockResolvedValue({ data: null, error: dbError });

    renderComponent();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));

    await waitFor(() => {
      expect(screen.getByText(dbError.message)).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });
  // #endregion

  // #region Happy Path
  it('submits the form successfully with all API calls', async () => {
    renderComponent();
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send Meeting Request/i }));
    });

    await waitFor(() => {
      // 1. Check Auth
      expect(mockGetUser).toHaveBeenCalledTimes(1);

      const expectedStart = new Date('2025-11-11T14:00');
      const expectedEnd = new Date('2025-11-11T15:00');

      // 2. Check Meeting Insertion
      expect(mockFrom).toHaveBeenCalledWith('meetings');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          requester_id: mockAuthUser.id,
          recipient_id: mockRecipient.id,
          availability_id: mockConversation.availability_id,
          conversation_id: mockConversation.id,
          title: 'Test Meeting',
          meeting_place: 'Test Location',
          start_datetime: expectedStart.toISOString(),
          end_datetime: expectedEnd.toISOString(),
          status: 'pending',
        })
      );
      expect(mockSingle).toHaveBeenCalledTimes(1);

      // 3. Check Message Insertion
      expect(mockFrom).toHaveBeenCalledWith('messages');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_id: mockAuthUser.id,
          recipient_id: mockRecipient.id,
          subject: 'Meeting Request: Test Meeting',
        })
      );

      // 4. Check Conversation Update
      expect(mockFrom).toHaveBeenCalledWith('conversations');
      // This test will now pass because the timer is exact
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          last_message_at: MOCK_NOW.toISOString(),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', mockConversation.id);

      // 5. Check Email API calls
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/emails/meeting-scheduled',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            meetingId: mockCreatedMeeting.id,
            userId: mockAuthUser.id,
          }),
        })
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/emails/meeting-scheduled',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            meetingId: mockCreatedMeeting.id,
            userId: mockRecipient.id,
          }),
        })
      );

      // 6. Check Callbacks
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnMeetingCreated).toHaveBeenCalledTimes(1);

      // 7. Check Alert
      expect(globalThis.alert).toHaveBeenCalledWith('Meeting request sent successfully!');
    });
  });
  // #endregion
});
