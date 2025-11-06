// #region 📜 Imports
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
// #endregion 📜 Imports

// #region 🛡️ Types and Constants

/**
 * Defines the structure of the draft object as it is stored
 * in sessionStorage, including metadata.
 * @template TProfile The type of the profile data.
 */
type StoredDraft<TProfile> = TProfile & {
  timestamp: number;
  version: string;
};

/**
 * Describes the updater function for the profile state,
 * allowing either a new value or a function.
 * @template TProfile The type of the profile data.
 */
type ProfileUpdater<TProfile> = SetStateAction<TProfile>;

/**
 * Defines the public return shape of the useProfileDraft hook.
 * @template TProfile The type of the profile data.
 */
export interface UseProfileDraftResult<TProfile> {
  /** The current profile state (draft or initial). */
  profile: TProfile;
  /**
   * Updates the profile state and automatically saves the draft
   * to sessionStorage.
   */
  setProfile: Dispatch<ProfileUpdater<TProfile>>;
  /**
   * Attempts to load the draft from sessionStorage.
   * @returns The saved profile data (TProfile) or null if no valid draft exists.
   */
  loadDraft: () => TProfile | null;
  /** Clears the draft from sessionStorage. */
  clearDraft: () => void;
  /** True if a draft was successfully loaded or saved. */
  hasDraft: boolean;
  /** The source of the current draft data. */
  draftSource: "session" | null;
}

const DRAFT_KEY = "profileDraft";
const DRAFT_VERSION = "2.0";

// #endregion 🛡️ Types and Constants

// #region 🎣 Hook Implementation

/**
 * Manages a draft state for a profile, automatically saving to and loading
 * from sessionStorage with cross-tab synchronization and error handling.
 *
 * @param initialProfile The default/initial state of the profile.
 * @returns An object containing the draft state and management functions.
 */
export const useProfileDraft = <TProfile extends object>(
  initialProfile: TProfile,
): UseProfileDraftResult<TProfile> => {
  const [profile, setProfile] = useState<TProfile>(initialProfile);
  const [hasDraft, setHasDraft] = useState(false);

  // #region 💾 Storage Logic (Callbacks)

  /**
   * Saves the provided profile data to sessionStorage with metadata.
   * Handles QuotaExceededError by clearing storage and retrying once.
   */
  const saveToSessionStorage = useCallback((profileData: TProfile) => {
    const draftToStore: StoredDraft<TProfile> = {
      ...profileData,
      timestamp: Date.now(),
      version: DRAFT_VERSION,
    };

    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftToStore));
      console.log("💾 Draft saved to sessionStorage");
    } catch (error: unknown) {
      console.warn("❌ Failed to save to sessionStorage:", error);

      // Check if it's a QuotaExceededError
      if (
        error instanceof DOMException && error.name === "QuotaExceededError"
      ) {
        console.warn("⚠️ Quota exceeded. Clearing storage and retrying...");
        try {
          // Clear and retry saving
          sessionStorage.clear();
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftToStore));
          console.log("💾 Draft saved after clearing storage");
        } catch (retryError: unknown) {
          console.error(
            "❌ Failed to save even after clearing storage:",
            retryError,
          );
        }
      }
    }
  }, []);

  /**
   * Loads and parses the draft from sessionStorage.
   * Returns only the profile data, stripping metadata.
   * Clears corrupted data if parsing fails.
   */
  const loadFromSessionStorage = useCallback((): TProfile | null => {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft) as StoredDraft<TProfile>;
        console.log("📂 Draft loaded from sessionStorage");
        setHasDraft(true);

        // Strip metadata before returning the profile data
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        const { timestamp: _ts, version: _v, ...profileData } = parsed;
        return profileData as TProfile;
      }
      return null;
    } catch (error: unknown) {
      console.warn("❌ Failed to load draft from sessionStorage:", error);
      // Clear corrupted data
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch (clearError: unknown) {
        console.warn("❌ Failed to clear corrupted draft:", clearError);
      }
      return null;
    }
  }, []);

  /**
   * Clears the draft from sessionStorage and resets the hasDraft flag.
   */
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      console.log("🗑️ Draft cleared from sessionStorage");
    } catch (error: unknown) {
      console.warn("❌ Failed to clear draft:", error);
    }
  }, []);

  // #endregion 💾 Storage Logic (Callbacks)

  // #region 🔄 Synchronization Effect

  /**
   * Listens for storage events to sync drafts across tabs.
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DRAFT_KEY && e.newValue) {
        try {
          const newDraft = JSON.parse(e.newValue) as StoredDraft<TProfile>;

          // Strip metadata before setting state
          // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
          const { timestamp: _ts, version: _v, ...profileData } = newDraft;

          setProfile(profileData as TProfile);
          setHasDraft(true);
          console.log("🔄 Draft synchronized from another tab");
        } catch (error: unknown) {
          console.warn("❌ Failed to sync draft from storage event:", error);
        }
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, []);

  // #endregion 🔄 Synchronization Effect

  // #region 🚀 State Management

  /**
   * An enhanced setter function that updates the profile state
   * and automatically triggers a save to sessionStorage.
   */
  const updateProfile = useCallback(
    (updater: ProfileUpdater<TProfile>) => {
      setProfile((prev) => {
        const updated = typeof updater === "function"
          // eslint-disable-next-line no-unused-vars
          ? (updater as (prev: TProfile) => TProfile)(prev)
          : updater;

        saveToSessionStorage(updated);
        setHasDraft(true); // Mark as having a draft on save
        return updated;
      });
    },
    [saveToSessionStorage],
  );

  // #endregion 🚀 State Management

  return {
    profile,
    setProfile: updateProfile,
    loadDraft: loadFromSessionStorage,
    clearDraft,
    hasDraft,
    draftSource: hasDraft ? "session" : null,
  };
};

// #endregion 🎣 Hook Implementation
