import { renderHook, act } from '@testing-library/react';
import { useProfileDraft } from './useProfileDraft';

// #region 🛡️ Types and Mock Data

interface MockProfile {
  name: string;
  email: string;
}

const initialProfileData: MockProfile = {
  name: 'John Doe',
  email: 'john@example.com',
};

const updatedProfileData: MockProfile = {
  name: 'Jane Doe',
  email: 'jane@example.com',
};

// #endregion 🛡️ Types and Mock Data

// #region  Mocks

// --- Mock sessionStorage ---
// We create a mock store and implement the Storage interface
const createMockStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getStore: () => store, // Helper to inspect the store
  };
};

let mockSessionStorage: ReturnType<typeof createMockStorage>;

// --- Mock window.addEventListener for 'storage' event ---
// eslint-disable-next-line no-unused-vars
const storageEventListeners: Record<string, (event: StorageEvent) => void> = {};
const mockAddEventListener = jest.fn((event, callback) => {
  if (event === 'storage') {
    storageEventListeners[event] = callback;
  }
});
const mockRemoveEventListener = jest.fn((event, callback) => {
  if (event === 'storage' && storageEventListeners[event] === callback) {
    delete storageEventListeners[event];
  }
});

// Helper to simulate a storage event from another tab
const dispatchStorageEvent = (newValue: string | null) => {
  const event = new StorageEvent('storage', {
    key: 'profileDraft',
    newValue,
  });
  if (storageEventListeners.storage) {
    storageEventListeners.storage(event);
  }
};

// --- Mock console ---
let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

// #endregion Mocks

// #region 🧪 Test Suite

describe('useProfileDraft', () => {
  // --- Test Setup ---
  beforeEach(() => {
    // 1. Setup mock storage
    mockSessionStorage = createMockStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    // 2. Setup mock event listeners
    Object.defineProperty(globalThis, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });
    Object.defineProperty(globalThis, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    });

    // 3. Suppress console noise
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // 4. Reset date mock if necessary (though Date.now() is fine)
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up all mocks
    mockSessionStorage.clear.mockClear();
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  // --- Helper to render the hook ---
  const renderDraftHook = () => renderHook(() => useProfileDraft(initialProfileData));

  // #region Initial State Tests
  it('should initialize with the initialProfile and hasDraft: false', () => {
    const { result } = renderDraftHook();

    expect(result.current.profile).toEqual(initialProfileData);
    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftSource).toBe(null);
  });
  // #endregion Initial State Tests

  // #region Storage Logic Tests
  it('should update profile, save to sessionStorage, and set hasDraft', () => {
    const { result } = renderDraftHook();

    act(() => {
      result.current.setProfile(updatedProfileData);
    });

    expect(result.current.profile).toEqual(updatedProfileData);
    expect(result.current.hasDraft).toBe(true); // Should be set on update
    expect(result.current.draftSource).toBe('session');
    expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'profileDraft',
      expect.stringContaining('"name":"Jane Doe"')
    );
  });

  it('should handle update with an updater function', () => {
    const { result } = renderDraftHook();

    act(() => {
      result.current.setProfile((prev) => ({
        ...prev,
        name: 'Updated Name',
      }));
    });

    expect(result.current.profile.name).toBe('Updated Name');
    expect(result.current.profile.email).toBe(initialProfileData.email);
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'profileDraft',
      expect.stringContaining('"name":"Updated Name"')
    );
  });

  it('should load a valid draft from sessionStorage', () => {
    // 1. Pre-populate storage
    const storedDraft = JSON.stringify({
      ...updatedProfileData,
      timestamp: Date.now(),
      version: '2.0',
    });
    mockSessionStorage.getItem.mockReturnValue(storedDraft);

    const { result } = renderDraftHook();

    // 2. Call loadDraft
    let loadedProfile: MockProfile | null = null;
    act(() => {
      loadedProfile = result.current.loadDraft();
    });

    // 3. Check results
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('profileDraft');
    expect(result.current.hasDraft).toBe(true);
    expect(loadedProfile).toEqual(updatedProfileData); // Should strip metadata
  });

  it('should handle corrupted data on load by clearing it', () => {
    mockSessionStorage.getItem.mockReturnValue('{invalid_json');

    const { result } = renderDraftHook();

    let loadedProfile: MockProfile | null = null;
    act(() => {
      loadedProfile = result.current.loadDraft();
    });

    expect(loadedProfile).toBe(null);
    expect(result.current.hasDraft).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '❌ Failed to load draft from sessionStorage:',
      expect.any(SyntaxError)
    );
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('profileDraft');
  });

  it('should clear the draft from sessionStorage and reset state', () => {
    // 1. Set up state as if a draft exists
    const { result } = renderDraftHook();
    act(() => {
      result.current.setProfile(updatedProfileData);
    });
    expect(result.current.hasDraft).toBe(true);
    expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(1);

    // 2. Clear the draft
    act(() => {
      result.current.clearDraft();
    });

    // 3. Check results
    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftSource).toBe(null);
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('profileDraft');
  });
  // #endregion Storage Logic Tests

  // #region Error Handling Tests
  it('should handle QuotaExceededError by clearing storage and retrying', () => {
    // 1. Simulate the first setItem call failing
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    mockSessionStorage.setItem.mockImplementationOnce((_key, _value) => {
      throw quotaError;
    });

    const { result } = renderDraftHook();

    // 2. Act
    act(() => {
      result.current.setProfile(updatedProfileData);
    });

    // 3. Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith('❌ Failed to save to sessionStorage:', quotaError);
    // It should have cleared storage
    expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
    // It should have called setItem a second time (the retry)
    expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(2);
    expect(mockSessionStorage.setItem).toHaveBeenLastCalledWith(
      'profileDraft',
      expect.stringContaining('"name":"Jane Doe"')
    );
    expect(result.current.profile).toEqual(updatedProfileData); // State should still update
  });

  it('should fail gracefully if retry also fails', () => {
    // 1. Simulate both setItem calls failing
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    const retryError = new DOMException('Still failed', 'QuotaExceededError');
    mockSessionStorage.setItem
      .mockImplementationOnce(() => {
        throw quotaError;
      })
      .mockImplementationOnce(() => {
        throw retryError;
      });

    const { result } = renderDraftHook();

    // 2. Act
    act(() => {
      result.current.setProfile(updatedProfileData);
    });

    // 3. Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Failed to save even after clearing storage:',
      retryError
    );
    expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
    expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(2);
  });
  // #endregion Error Handling Tests

  // #region Synchronization Tests
  it('should listen for storage events on mount and cleanup on unmount', () => {
    const { unmount } = renderDraftHook();

    expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('should update state when a storage event is received', () => {
    const { result } = renderDraftHook();
    expect(result.current.profile).toEqual(initialProfileData);

    const newDraftFromTab = JSON.stringify({
      ...updatedProfileData,
      timestamp: Date.now(),
      version: '2.0',
    });

    // Simulate event from another tab
    act(() => {
      dispatchStorageEvent(newDraftFromTab);
    });

    // Check if the hook's state updated
    expect(result.current.profile).toEqual(updatedProfileData);
    expect(result.current.hasDraft).toBe(true);
  });
  // #endregion Synchronization Tests
});
// #endregion 🧪 Test Suite
