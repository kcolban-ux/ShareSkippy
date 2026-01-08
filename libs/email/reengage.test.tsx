import {
  processReengageEmails,
  getReengageCandidates,
  scheduleReengageEmails,
  __testExports,
} from './reengage';
import { sendEmail, scheduleEmail } from './sendEmail';

// --- Global Mocks and Setup ---
jest.mock('./sendEmail', () => ({
  sendEmail: jest.fn(),
  scheduleEmail: jest.fn(),
}));

const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  single: jest.fn(),
};
const mockFrom = jest.fn(() => mockChain);
const mockSupabaseClient = { from: mockFrom };
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
  createServiceClient: jest.fn(() => mockSupabaseClient),
}));

const inactiveUser1: MockData = {
  id: 2,
  email: 'user1@test.com',
  first_name: 'Alice',
  user_activity: [{ at: '2025-10-20T00:00:00.000Z' }],
};
const activeUser: MockData = {
  id: 3,
  email: 'user3@test.com',
  first_name: 'Charlie',
  user_activity: [{ at: new Date().toISOString() }],
};

type MockData = {
  id: number;
  email?: string;
  first_name?: string;
  user_activity?: { at: string }[];
};

type MockResult = {
  data: MockData[] | null;
  error: { message: string } | null;
};

const mockSuccess = (data: MockData[] | null): MockResult => ({ data, error: null });
const mockError = (message: string): MockResult => ({ data: null, error: { message } });
const shouldSendReengageEmail = __testExports.shouldSendReengageEmail as (
  // eslint-disable-next-line no-unused-vars
  userId: string
) => Promise<boolean>;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-11-01T12:00:00.000Z'));
});
afterEach(() => {
  jest.clearAllMocks();
  for (const key in mockChain) {
    if (key === 'single') {
      continue;
    }
    const mockFn = mockChain[key as keyof typeof mockChain];
    mockFn.mockReturnThis();
  }
});
afterAll(() => {
  jest.useRealTimers();
});

// Helper to enforce correct return values for complex chains:
// This is necessary because the original code uses .not().not(), which breaks simple mockReturnThis() chains.
const setupComplexNotChain = (result: MockResult) => {
  // Mock the *first* .not call to return a mock object where the SECOND .not call resolves the promise.
  mockChain.not.mockImplementationOnce(() => ({
    not: jest.fn().mockResolvedValue(result),
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  }));
};

// Helper for the getReengageCandidates chain which ends in .order() after double .not()
const setupGetCandidatesChain = (result: MockResult) => {
  // We mock the *first* .not call to return a mock object where the final .order() resolves the promise.
  mockChain.not.mockImplementationOnce(() => ({
    not: jest.fn().mockReturnThis(), // Second .not() returns a chainable object
    order: jest.fn().mockResolvedValue(result), // The final call resolves the promise
    eq: jest.fn().mockReturnThis(),
  }));
};

describe('shouldSendReengageEmail', () => {
  it('should return true if no recent email was sent', async () => {
    mockChain.single.mockResolvedValue(mockSuccess(null));
    const result = await shouldSendReengageEmail('user-new');
    expect(result).toBe(true);
  });

  it('should return false if a recent email was sent', async () => {
    mockChain.single.mockResolvedValue(mockSuccess([{ id: 1 }]));
    const result = await shouldSendReengageEmail('user-recent');
    expect(result).toBe(false);
  });
});

describe('processReengageEmails', () => {
  it('should successfully send emails to eligible users (Happy Path)', async () => {
    mockChain.limit.mockResolvedValue(mockSuccess([{ id: 1 }]));
    setupComplexNotChain(mockSuccess([inactiveUser1]));
    mockChain.single.mockResolvedValue(mockSuccess(null));
    (sendEmail as jest.Mock).mockResolvedValue(undefined);

    const result = await processReengageEmails();

    expect(result.sent).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.errors).toEqual([]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('should return 0 processed if user activity table does not exist', async () => {
    mockChain.limit.mockResolvedValue(mockError("Could not find the table named 'user_activity'"));

    const result = await processReengageEmails();

    expect(result.processed).toBe(0);
  });

  it('should track an error if sending an email fails', async () => {
    mockChain.limit.mockResolvedValue(mockSuccess([{ id: 1 }]));
    setupComplexNotChain(mockSuccess([inactiveUser1]));
    mockChain.single.mockResolvedValue(mockSuccess(null));
    (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP Failure'));

    const result = await processReengageEmails();

    expect(result.sent).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});

// --- 3. Test Suite: getReengageCandidates ---
describe('getReengageCandidates', () => {
  it('should return only users inactive for 7+ days', async () => {
    setupGetCandidatesChain(mockSuccess([inactiveUser1, activeUser]));

    const result = await getReengageCandidates();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2); // Only inactiveUser1 should be returned
  });

  it('should throw an error if data fetching fails', async () => {
    mockChain.not.mockImplementationOnce(() => ({
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue(mockError('DB Timeout')),
      eq: jest.fn().mockReturnThis(),
    }));

    await expect(getReengageCandidates()).rejects.toThrow(
      'Failed to fetch re-engage candidates: DB Timeout'
    );
  });
});

// --- 4. Test Suite: scheduleReengageEmails ---
describe('scheduleReengageEmails', () => {
  it('should successfully schedule emails for all eligible candidates (Happy Path)', async () => {
    setupGetCandidatesChain(mockSuccess([inactiveUser1]));
    mockChain.single.mockResolvedValue(mockSuccess(null));
    (scheduleEmail as jest.Mock).mockResolvedValue(undefined);

    const result = await scheduleReengageEmails();

    expect(result.scheduled).toBe(1);
    expect(result.errors).toEqual([]);
    expect(scheduleEmail).toHaveBeenCalledTimes(1);
  });

  it('should not schedule if getReengageCandidates returns no users', async () => {
    setupGetCandidatesChain(mockSuccess([]));

    const result = await scheduleReengageEmails();

    expect(result.scheduled).toBe(0);
  });
});
