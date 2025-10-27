import { useState, useEffect, useCallback } from 'react';

export const useProfileDraft = (initialProfile) => {
  const [profile, setProfile] = useState(initialProfile);
  const [hasDraft, setHasDraft] = useState(false);

  // Save to sessionStorage with error handling
  const saveToSessionStorage = useCallback((profileData) => {
    try {
      sessionStorage.setItem('profileDraft', JSON.stringify({
        ...profileData,
        timestamp: Date.now(),
        version: '2.0'
      }));
      // eslint-disable-next-line no-console
      console.log('💾 Draft saved to sessionStorage');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('❌ Failed to save to sessionStorage:', error);
      // Handle quota exceeded by clearing old data
      if (error.name === 'QuotaExceededError') {
        try {
          sessionStorage.clear();
          sessionStorage.setItem('profileDraft', JSON.stringify({
            ...profileData,
            timestamp: Date.now(),
            version: '2.0'
          }));
          // eslint-disable-next-line no-console
          console.log('💾 Draft saved after clearing storage');
        } catch (retryError) {
          // eslint-disable-next-line no-console
          console.error('❌ Failed to save even after clearing storage:', retryError);
        }
      }
    }
  }, []);

  // Load from sessionStorage with error handling
  const loadFromSessionStorage = useCallback(() => {
    try {
      const draft = sessionStorage.getItem('profileDraft');
      if (draft) {
        const parsed = JSON.parse(draft);
        // eslint-disable-next-line no-console
        console.log('📂 Draft loaded from sessionStorage');
        setHasDraft(true);
        return parsed;
      }
      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('❌ Failed to load draft from sessionStorage:', error);
      // Clear corrupted data
      try {
        sessionStorage.removeItem('profileDraft');
      } catch (clearError) {
        // eslint-disable-next-line no-console
        console.warn('❌ Failed to clear corrupted draft:', clearError);
      }
      return null;
    }
  }, []);

  // Clear draft from sessionStorage
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem('profileDraft');
      setHasDraft(false);
      // eslint-disable-next-line no-console
      console.log('🗑️ Draft cleared from sessionStorage');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('❌ Failed to clear draft:', error);
    }
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'profileDraft' && e.newValue) {
        try {
          const newDraft = JSON.parse(e.newValue);
          setProfile(newDraft);
          setHasDraft(true);
          // eslint-disable-next-line no-console
          console.log('🔄 Draft synchronized from another tab');
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('❌ Failed to sync draft from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update profile and auto-save
  const updateProfile = useCallback((updater) => {
    setProfile(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      saveToSessionStorage(updated);
      return updated;
    });
  }, [saveToSessionStorage]);

  return {
    profile,
    setProfile: updateProfile,
    loadDraft: loadFromSessionStorage,
    clearDraft,
    hasDraft,
    draftSource: hasDraft ? 'session' : null
  };
};
