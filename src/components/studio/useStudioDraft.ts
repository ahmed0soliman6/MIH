import { useState, useEffect, useRef, useCallback } from 'react';

export interface StudioDraftState {
  title: string;
  code: string;
  category: string;
  dept: string;
  version: string;
  date?: string;
  purpose: string;
  rawText: string;
  contentHtml: string;
  effectiveDate?: string;
  reviewDate?: string;
  responsibilities?: string;
  target_departments?: string;
  savedAt: number;
}

export function useStudioDraft(
  policyId: string | null | undefined,
  currentState: Omit<StudioDraftState, 'savedAt'>,
  onRestore: (draft: StudioDraftState) => void
) {
  const draftKey = `mih_studio_draft_v1:${policyId || 'new'}`;
  const [hasExistingDraft, setHasExistingDraft] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const initialLoadRef = useRef(true);

  // Check for existing draft on mount / policy change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed: StudioDraftState = JSON.parse(stored);
        // Only trigger if draft is newer than 1 minute ago and has content
        if (parsed && (parsed.title || parsed.rawText || parsed.contentHtml)) {
          setHasExistingDraft(true);
        }
      }
    } catch (e) {
      console.warn('Failed to read draft from localStorage', e);
    }
  }, [draftKey]);

  // Debounced auto-save every 2s
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    setIsDirty(true);
    const timer = setTimeout(() => {
      try {
        const payload: StudioDraftState = {
          ...currentState,
          savedAt: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLastSavedTime(timeStr);
        setIsDirty(false);
      } catch (e) {
        console.warn('Failed to save draft to localStorage', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    draftKey,
    currentState.title,
    currentState.code,
    currentState.category,
    currentState.dept,
    currentState.version,
    currentState.purpose,
    currentState.rawText,
    currentState.contentHtml,
    currentState.effectiveDate,
    currentState.reviewDate,
    currentState.responsibilities,
  ]);

  // Warn on page unload if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const restoreDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed: StudioDraftState = JSON.parse(stored);
        onRestore(parsed);
        setHasExistingDraft(false);
        setIsDirty(false);
      }
    } catch (e) {
      console.warn('Failed to restore draft', e);
    }
  }, [draftKey, onRestore]);

  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasExistingDraft(false);
    } catch (e) {
      console.warn('Failed to discard draft', e);
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasExistingDraft(false);
      setIsDirty(false);
      setLastSavedTime(null);
    } catch (e) {
      console.warn('Failed to clear draft', e);
    }
  }, [draftKey]);

  return {
    hasExistingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
    lastSavedTime,
    isDirty,
    setIsDirty,
  };
}
