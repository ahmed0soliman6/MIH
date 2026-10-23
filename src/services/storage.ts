import { SystemSettings, Policy, Bundle } from '../types';
import { DEFAULT_BUNDLES } from '../data/meta';

const SETTINGS_KEY = 'mih_system_settings_v3';
const POLICIES_CACHE_KEY = 'mih_policies_cache_v11';
const BUNDLES_CACHE_KEY = 'mih_bundles_cache_v10';

// مفاتيح قديمة يجب تنظيفها (كانت تحمل مفتاح Gemini وقائمة الإيميلات وجلسة الأدمن في المتصفح)
const LEGACY_KEYS = ['mih_admin_session', 'mih_policies_cache_v10'];

export function getStoredSettings(): SystemSettings {
  const env = (import.meta as any).env || {};
  const envApiKey = env.VITE_FIREBASE_API_KEY || '';
  const envProjectId = env.VITE_FIREBASE_PROJECT_ID || '';
  const envAuthDomain = env.VITE_FIREBASE_AUTH_DOMAIN || '';
  const envCloudName = env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const envCloudPreset = env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

  let stored: any = {};
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored settings:', e);
  }

  const settings: SystemSettings = {
    firebase: {
      apiKey: stored.firebase?.apiKey || envApiKey,
      projectId: stored.firebase?.projectId || envProjectId,
      authDomain: stored.firebase?.authDomain || envAuthDomain || (envProjectId ? `${envProjectId}.firebaseapp.com` : '')
    },
    cloudinaryName: stored.cloudinaryName || envCloudName,
    cloudinaryPreset: stored.cloudinaryPreset || envCloudPreset
  };

  // إن كانت الإعدادات المخزنة تحمل حقولاً قديمة (geminiKey / adminEmails) أعد كتابتها نظيفة
  if ('geminiKey' in stored || 'adminEmails' in stored) {
    saveStoredSettings(settings);
  }
  return settings;
}

export function saveStoredSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

/** كاش محلي لعرض سريع قبل وصول Firestore. لا يحتوي افتراضيات؛ تُحمَّل عند الحاجة فقط. */
export function getCachedPolicies(): Policy[] {
  try {
    const raw = localStorage.getItem(POLICIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read cached policies:', e);
  }
  return [];
}

export function saveCachedPolicies(policies: Policy[]): void {
  try {
    localStorage.setItem(POLICIES_CACHE_KEY, JSON.stringify(policies));
  } catch (e) {
    // امتلاء الحصة (5MB) — الكاش اختياري، فنتجاهله
    console.warn('Failed to save policies to localStorage:', e);
  }
}

export function getCachedBundles(): Bundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
