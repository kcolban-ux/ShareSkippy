// #region Imports
import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useState,
} from "react";
// #endregion Imports

// #region Types
/**
 * @interface DraftMetadata
 * @description Structure of data stored in session storage alongside the profile data.
 */
interface DraftMetadata {
    timestamp: number;
    version: string;
}

/**
 * @interface StoredDraft<T>
 * @description The structure of the complete object stored in session storage.
 * @template T - The type of the user profile data.
 */
type StoredDraft<T> = T & DraftMetadata;

/**
 * @interface ProfileDraftHook<T>
 * @description The public API exposed by the hook.
 * @template T - The type of the user profile data.
 */
interface ProfileDraftHook<T> {
    profile: T;
    setProfile: Dispatch<SetStateAction<T>>; // Note: This setter is wrapped to auto-save.
    loadDraft: () => T | null;
    clearDraft: () => void;
    hasDraft: boolean;
    draftSource: "session" | null;
}

/**
 * @function isErrorWithMessage
 * @description Type guard to safely access the message property of an unknown error.
 * @param {unknown} error - The object caught in the catch block.
 * @returns {error is { message: string }}
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
    return (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
    );
}
// #endregion Types

// #region Hook Definition
/**
 * @hook
 * @description Manages a state object with automatic saving and loading to/from sessionStorage.
 * @template T - The type of the profile data (e.g., ProfileState interface).
 * @param {T} initialProfile - The initial starting data structure.
 * @returns {ProfileDraftHook<T>}
 */
export const useProfileDraft = <T extends Record<string, unknown>>(
    initialProfile: T,
): ProfileDraftHook<T> => {
    // #region State
    // FIX: State initialized with generic type T
    const [profile, setProfile] = useState<T>(initialProfile);
    const [hasDraft, setHasDraft] = useState<boolean>(false);
    // #endregion State

    // #region Storage Logic
    /**
     * @function saveToSessionStorage
     * @description Saves the given profile data to sessionStorage, handling quota errors.
     * @param {T} profileData - The current profile data to save.
     * @returns {void}
     */
    const saveToSessionStorage = useCallback((profileData: T): void => {
        const storedData: StoredDraft<T> = {
            ...profileData,
            timestamp: Date.now(),
            version: "2.0",
        };

        try {
            sessionStorage.setItem("profileDraft", JSON.stringify(storedData));
            console.log("💾 Draft saved to sessionStorage");
        } catch (error: unknown) {
            let errorMessage = "Failed to save to sessionStorage.";
            if (isErrorWithMessage(error)) errorMessage = error.message;

            console.warn(`❌ ${errorMessage}`, error);

            // Handle quota exceeded by clearing storage and retrying
            if (
                isErrorWithMessage(error) &&
                error.message.includes("QuotaExceededError")
            ) {
                try {
                    sessionStorage.clear();
                    sessionStorage.setItem(
                        "profileDraft",
                        JSON.stringify(storedData),
                    );
                    console.log("💾 Draft saved after clearing storage");
                } catch (retryError) {
                    console.error(
                        "❌ Failed to save even after clearing storage:",
                        retryError,
                    );
                }
            }
        }
    }, []);

    /**
     * @function loadFromSessionStorage
     * @description Loads the draft from sessionStorage, merging it with initial data structure.
     * @returns {T | null} - The loaded and merged profile data, or null if no valid draft exists.
     */
    const loadFromSessionStorage = useCallback((): T | null => {
        try {
            const draft = sessionStorage.getItem("profileDraft");
            if (draft) {
                // FIX: Cast parsed data to the expected stored structure
                const parsed: StoredDraft<T> = JSON.parse(draft);

                console.log("📂 Draft loaded from sessionStorage");
                setHasDraft(true);

                // Merge with initial state to ensure all fields are present and typed correctly
                // NOTE: This relies on the consumer calling setProfile with the result after initial load.
                return { ...initialProfile, ...parsed } as T;
            }
            return null;
        } catch (error: unknown) {
            console.warn("❌ Failed to load draft from sessionStorage:", error);

            // Clear corrupted data
            try {
                sessionStorage.removeItem("profileDraft");
            } catch (clearError) {
                console.warn("❌ Failed to clear corrupted draft:", clearError);
            }
            return null;
        }
    }, [initialProfile]);

    /**
     * @function clearDraft
     * @description Clears the draft from sessionStorage.
     * @returns {void}
     */
    const clearDraft = useCallback((): void => {
        try {
            sessionStorage.removeItem("profileDraft");
            setHasDraft(false);
            console.log("🗑️ Draft cleared from sessionStorage");
        } catch (error) {
            console.warn("❌ Failed to clear draft:", error);
        }
    }, []);
    // #endregion Storage Logic

    // #region Effects and Wrapped Setter
    /**
     * @effect
     * @description Handles cross-tab synchronization of the draft data.
     */
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent): void => {
            if (e.key === "profileDraft" && e.newValue) {
                try {
                    // FIX: Explicitly type the parsed incoming data
                    const newDraft: StoredDraft<T> = JSON.parse(e.newValue);

                    // FIX: Use the state updater function form which is properly typed
                    setProfile((prev: T) => ({ ...prev, ...newDraft }));
                    setHasDraft(true);

                    console.log("🔄 Draft synchronized from another tab");
                } catch (error) {
                    console.warn(
                        "❌ Failed to sync draft from storage event:",
                        error,
                    );
                }
            }
        };

        // Check window existence as this hook runs in a Next.js environment
        if (typeof globalThis !== "undefined") {
            globalThis.addEventListener("storage", handleStorageChange);
            return () =>
                globalThis.removeEventListener("storage", handleStorageChange);
        }
    }, []);

    /**
     * @function updateProfile
     * @description A wrapped state setter that automatically saves the resulting state to storage.
     * @param {SetStateAction<T>} updater - The new state object or an updater function.
     * @returns {void}
     */
    const updateProfile = useCallback(
        (updater: SetStateAction<T>): void => {
            // FIX: Explicitly type 'prev' in the state setter callback
            setProfile((prev: T) => {
                // Determine the updated object. Updater can be an object (T) or a function ((prev: T) => T).
                const updated = typeof updater === "function"
                    ? updater(prev)
                    : updater;

                // Save the new value before returning it to state
                saveToSessionStorage(updated);

                return updated;
            });
        },
        [saveToSessionStorage],
    );
    // #endregion Effects and Wrapped Setter

    // #region Hook Return
    return {
        profile,
        // Expose the wrapped setter as setProfile
        setProfile: updateProfile,
        loadDraft: loadFromSessionStorage,
        clearDraft,
        hasDraft,
        // FIX: Ensure draftSource returns 'session' or null, matching the interface
        draftSource: hasDraft ? "session" : null,
    };
    // #endregion Hook Return
};
