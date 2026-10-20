import { SystemSettings, Policy, Bundle } from '../types';
import { DEFAULT_POLICIES, DEFAULT_BUNDLES, DEFAULT_ADMIN_EMAILS } from '../data/initialData';

const SETTINGS_KEY = 'mih_system_settings_v3';
const POLICIES_CACHE_KEY = 'mih_policies_cache_v2';
const BUNDLES_CACHE_KEY = 'mih_bundles_cache_v2';

export function getStoredSettings(): SystemSettings {
  const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY || '';
  const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '';
  const envAuthDomain = (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '';
  const envGeminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const envCloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || '';
  const envCloudPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';

  let stored: Partial<SystemSettings> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse stored settings:', e);
  }

  // Merge admin emails
  const emails = Array.isArray(stored.adminEmails) ? [...stored.adminEmails] : [...DEFAULT_ADMIN_EMAILS];
  DEFAULT_ADMIN_EMAILS.forEach((defEmail) => {
    if (!emails.some((e: string) => e.toLowerCase() === defEmail.toLowerCase())) {
      emails.push(defEmail);
    }
  });

  return {
    firebase: {
      apiKey: stored.firebase?.apiKey || envApiKey,
      projectId: stored.firebase?.projectId || envProjectId,
      authDomain: stored.firebase?.authDomain || envAuthDomain || (envProjectId ? `${envProjectId}.firebaseapp.com` : '')
    },
    adminEmails: emails,
    geminiKey: stored.geminiKey || envGeminiKey,
    cloudinaryName: stored.cloudinaryName || envCloudName,
    cloudinaryPreset: stored.cloudinaryPreset || envCloudPreset
  };
}

export function saveStoredSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

export function getCachedPolicies(): Policy[] {
  try {
    const raw = localStorage.getItem(POLICIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached policies:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_POLICIES));
}

export function saveCachedPolicies(policies: Policy[]): void {
  try {
    localStorage.setItem(POLICIES_CACHE_KEY, JSON.stringify(policies));
  } catch (e) {
    console.warn('Failed to save policies to localStorage:', e);
  }
}

export function getCachedBundles(): Bundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached bundles:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
}

export function saveCachedBundles(bundles: Bundle[]): void {
  try {
    localStorage.setItem(BUNDLES_CACHE_KEY, JSON.stringify(bundles));
  } catch (e) {
    console.warn('Failed to save bundles to localStorage:', e);
  }
}
