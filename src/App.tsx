import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Policy, Bundle, AuthUser, SystemSettings, AdminRole, AdminEntry } from './types';
import { DEFAULT_BUNDLES } from './data/meta';
import {
  getStoredSettings,
  saveStoredSettings,
  getCachedBundles,
  saveCachedBundles
} from './services/storage';
import { loadFirebase } from './services/firebaseLoader';
import { isFirebaseConfigured } from './services/firebaseConfig';
import {
  loadPolicyIndex,
  loadPolicyContent,
  loadSearchTexts
} from './services/policyData';
import { usePublishScheduler } from './hooks/usePublishScheduler';

import { Navbar, TabType } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PoliciesView } from './components/PoliciesView';
import { BundlesView } from './components/BundlesView';
import { ArchitectureView } from './components/ArchitectureView';
import { PermissionDeniedModal } from './components/PermissionDeniedModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Toast } from './components/Toast';
import { DepartmentSidebar } from './components/DepartmentSidebar';
import { Footer } from './components/Footer';
import { Language, UI_STRINGS } from './utils/translations';
import { useViewTransition } from './hooks/useViewTransition';

// تحميل كسول للمكونات الثقيلة/النادرة وقارئ الوثيقة مع التحميل المسبق في وقت الخمول
const DocumentModal = lazy(() => import('./components/DocumentModal').then((m) => ({ default: m.DocumentModal })));
const AdminView = lazy(() => import('./components/AdminView').then((m) => ({ default: m.AdminView })));
const PresentationModal = lazy(() => import('./components/PresentationModal').then((m) => ({ default: m.PresentationModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const AdminLoginModal = lazy(() => import('./components/AdminLoginModal').then((m) => ({ default: m.AdminLoginModal })));

async function loadDefaultPolicies(): Promise<Policy[]> {
  const mod = await import('./data/defaultPolicies');
  return mod.DEFAULT_POLICIES;
}

export const App: React.FC = () => {
  const startViewTransition = useViewTransition();
  const [settings, setSettings] = useState<SystemSettings>(getStoredSettings);
  // جلسة المدير نشطة؟ (تلميح أداء فقط، ليس أمنياً) — تحميل Firebase مشروط بها
  const [adminSessionActive, setAdminSessionActive] = useState<boolean>(
    () => localStorage.getItem('mih_admin_hint') === '1'
  );
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [searchTexts, setSearchTexts] = useState<Record<string, string> | undefined>(undefined);
  const adminModeRef = useRef<boolean>(false);

  // تحميل مسبق في وقت الخمول لقارئ الوثيقة (Idle Prefetch)
  useEffect(() => {
    const prefetch = () => {
      import('./components/DocumentModal');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(prefetch, { timeout: 2500 });
      return () => (window as any).cancelIdleCallback?.(id);
    } else {
      const timer = setTimeout(prefetch, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const [bundles, setBundles] = useState<Bundle[]>(getCachedBundles);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mih_dark_mode') === 'true';
  });

  // Sync dark class on documentElement for complete HTML/body styling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('mih_dark_mode', String(next));
      return next;
    });
  };

  // Language state (AR / EN) persisted in localStorage
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('mih_portal_lang') as Language) || 'ar';
  });

  // Sync lang and dir on documentElement
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => {
      const next: Language = prev === 'ar' ? 'en' : 'ar';
      localStorage.setItem('mih_portal_lang', next);
      return next;
    });
  };

  // Bookmarked policies state (persisted in localStorage)
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('mih_bookmarked_policies');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (policyId: string) => {
    setBookmarkedIds((prev) => {
      const isSaved = prev.includes(policyId);
      const next = isSaved ? prev.filter((id) => id !== policyId) : [...prev, policyId];
      try {
        localStorage.setItem('mih_bookmarked_policies', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save bookmark in localStorage', e);
      }
      const t = UI_STRINGS[lang] || UI_STRINGS.ar;
      showToast(isSaved ? t.bookmarkRemoved : t.bookmarkAdded);
      return next;
    });
  };

  const handleOpenBookmarks = () => {
    setSelectedCategory('BOOKMARKS');
    setCurrentTab('policies');
    setSearchQuery('');
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) {
      if (currentTab !== 'policies') {
        setCurrentTab('policies');
      }
      if (!searchTexts) {
        loadSearchTexts().then(setSearchTexts).catch(() => {});
      }
    }
  };

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Auth & Connection
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminList, setAdminList] = useState<AdminEntry[]>([]);
  const isAuthorizedAdmin = adminRole !== null;
  const canDelete = adminRole === 'admin' || adminRole === 'superadmin';
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(() => isFirebaseConfigured(settings));
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Modals
  const [activeDocPolicy, setActiveDocPolicy] = useState<Policy | null>(null);
  const [activePresPolicy, setActivePresPolicy] = useState<Policy | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [permissionDeniedEmail, setPermissionDeniedEmail] = useState<string | null>(null);

  // Editing policy
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  // Loading & Toast
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const fbRef = useRef<{
    app: any;
    auth: any;
    db: any;
  }>({ app: null, auth: null, db: null });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const friendlyError = (e: any): string => {
    const m: string = e?.message || String(e);
    return m.includes('permission') || m.includes('insufficient')
      ? 'لا تملك الصلاحية اللازمة لهذه العملية (تحقق من دورك وقواعد Firestore).'
      : m;
  };

  // خطاف النشر التلقائي عبر Vercel Deploy Hook
  const { publishStatus, schedulePublish, triggerPublishNow } = usePublishScheduler({
    onShowToast: showToast,
    isAdmin: isAuthorizedAdmin
  });

  const refreshAdminList = async () => {
    if (fbRef.current.db) {
      const fb = await loadFirebase();
      setAdminList(await fb.listAdmins(fbRef.current.db));
    }
  };

  // جلب الفهرس الثابت للزوار (صفر قراءات لفايرستور)
  const fetchStaticPolicies = async () => {
    setIsInitialLoading(true);
    setInitialLoadError(null);
    try {
      const list = await loadPolicyIndex();
      if (!adminModeRef.current) {
        setPolicies(list);
      }
    } catch {
      try {
        const defs = await loadDefaultPolicies();
        if (!adminModeRef.current) setPolicies(defs);
      } catch (fallbackErr: any) {
        setInitialLoadError('تعذر تحميل السياسات.');
      }
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchStaticPolicies();
  }, []);

  // التحميل المسبق التدريجي في وقت الخمول للزائر (Prefetching)
  useEffect(() => {
    if (isInitialLoading || policies.length === 0) return;
    const idleTimer = setTimeout(() => {
      if ((navigator as any).connection?.saveData || adminModeRef.current) return;
      const remaining = policies.filter((p) => p._summary);
      let idx = 0;
      const runNext = async () => {
        if (idx >= remaining.length || adminModeRef.current) return;
        const p = remaining[idx++];
        try {
          await loadPolicyContent(p);
        } catch (_) {}
        runNext();
      };
      runNext();
      runNext();
      runNext();
    }, 3000);

    return () => clearTimeout(idleTimer);
  }, [isInitialLoading, policies.length]);

  // فحص اللقطة كل 15 دقيقة عند عودة التركيز للتبويب
  useEffect(() => {
    let lastFetch = Date.now();
    const handleVisChange = async () => {
      if (document.visibilityState === 'visible' && !adminModeRef.current) {
        if (Date.now() - lastFetch > 15 * 60 * 1000) {
          lastFetch = Date.now();
          try {
            const fresh = await loadPolicyIndex();
            if (!adminModeRef.current) setPolicies(fresh);
          } catch (_) {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, []);

  // إدارة جلسة المدير: لا يُحمَّل Firebase إلا إذا وُجد تلميح جلسة الإدارة في المتصفح
  useEffect(() => {
    if (!adminSessionActive) return;

    let unsubscribePolicies: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    (async () => {
      try {
        const fb = await loadFirebase();
        const { isConfigured, auth, db } = fb.initFirebaseService(settings);
        fbRef.current = { app: null, auth, db };
        setIsFirebaseConnected(isConfigured);

        if (!isConfigured || !auth || !db) return;

        unsubscribeAuth = fb.subscribeToAuth(auth, async (user) => {
          setCurrentUser(user);
          if (!user?.email) {
            setAdminRole(null);
            setAdminList([]);
            adminModeRef.current = false;
            localStorage.removeItem('mih_admin_hint');
            setAdminSessionActive(false);
            if (unsubscribePolicies) {
              unsubscribePolicies();
              unsubscribePolicies = null;
            }
            return;
          }

          const role = await fb.getAdminRole(db, user.email);
          setAdminRole(role);

          if (role) {
            setPermissionDeniedEmail(null);
            adminModeRef.current = true;
            localStorage.setItem('mih_admin_hint', '1');
            showToast(`مرحباً بك: ${user.displayName || user.email} (${role}) 👑`);

            if (role === 'admin' || role === 'superadmin') {
              setAdminList(await fb.listAdmins(db));
            }

            // في وضع المدير: الاشتراك الحي والمباشر في Firestore
            if (!unsubscribePolicies) {
              unsubscribePolicies = fb.subscribeToPolicies(
                db,
                (remoteList) => {
                  if (adminModeRef.current && remoteList.length > 0) {
                    setPolicies(remoteList);
                  }
                }
              );
            }
          } else {
            setAdminList([]);
            setPermissionDeniedEmail(user.email);
            adminModeRef.current = false;
            localStorage.removeItem('mih_admin_hint');
          }
        });
      } catch (err) {
        console.warn('Failed to restore admin session:', err);
      }
    })();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribePolicies) unsubscribePolicies();
    };
  }, [settings.firebase, adminSessionActive]);

  // Update URL Hash without reload
  const updateHash = (newHash: string) => {
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  };

  // Open & Close Document Handlers مع دعم التحميل الكسول
  const handleOpenDocument = async (p: Policy) => {
    let fullPolicy = p;
    if (p._summary) {
      setIsLoading(true);
      setLoadingMessage('جاري تحميل محتوى السياسة...');
      try {
        fullPolicy = await loadPolicyContent(p);
        setPolicies((prev) => prev.map((item) => (item.id === fullPolicy.id ? fullPolicy : item)));
      } catch (err: any) {
        showToast(`تعذر فتح السياسة: ${err.message || err}`);
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }
    setActiveDocPolicy(fullPolicy);
    setActivePresPolicy(null);
    updateHash(`#/policy/${fullPolicy.id}`);
  };

  const handleCloseDocument = () => {
    setActiveDocPolicy(null);
    updateHash(currentTab === 'home' ? '#/' : `#/${currentTab}`);
  };

  // Open & Close Presentation Handlers مع دعم التحميل الكسول
  const handleOpenPresentation = async (p: Policy) => {
    let fullPolicy = p;
    if (p._summary) {
      setIsLoading(true);
      setLoadingMessage('جاري تحميل محتوى عرض السياسة...');
      try {
        fullPolicy = await loadPolicyContent(p);
        setPolicies((prev) => prev.map((item) => (item.id === fullPolicy.id ? fullPolicy : item)));
      } catch (err: any) {
        showToast(`تعذر فتح العرض: ${err.message || err}`);
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }
    setActivePresPolicy(fullPolicy);
    setActiveDocPolicy(null);
    updateHash(`#/present/${fullPolicy.id}`);
  };

  const handleClosePresentation = () => {
    setActivePresPolicy(null);
    updateHash(currentTab === 'home' ? '#/' : `#/${currentTab}`);
  };

  // Tab switch handler with scroll to top & hash update via View Transitions
  const handleTabChange = (tab: TabType) => {
    startViewTransition(() => {
      setCurrentTab(tab);
      setActiveDocPolicy(null);
      setActivePresPolicy(null);
      updateHash(tab === 'home' ? '#/' : `#/${tab}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // Department / Category filter handler with hash update via View Transitions
  const handleSelectCategory = (cat: string) => {
    startViewTransition(() => {
      setSelectedCategory(cat);
      setSearchQuery('');
      setCurrentTab('policies');
      setActiveDocPolicy(null);
      setActivePresPolicy(null);
      updateHash(`#/category/${cat}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // Synchronize state with URL Hash for seamless reload (F5) & direct link sharing
  useEffect(() => {
    const syncFromHash = async () => {
      const hash = window.location.hash || '';
      if (!hash || hash === '#' || hash === '#/') return;

      const clean = hash.replace(/^#\/?/, '');
      const parts = clean.split('/');
      const route = parts[0];
      const param = decodeURIComponent(parts.slice(1).join('/'));

      if (route === 'policy' && param) {
        const found = policies.find((p) => p.id === param || p.code === param || p.code?.replace(/\//g, '_') === param);
        if (found) {
          await handleOpenDocument(found);
        }
      } else if (route === 'present' && param) {
        const found = policies.find((p) => p.id === param || p.code === param || p.code?.replace(/\//g, '_') === param);
        if (found) {
          await handleOpenPresentation(found);
        }
      } else if (route === 'category' || route === 'department') {
        if (param) {
          setSelectedCategory(param);
          setCurrentTab('policies');
          setActiveDocPolicy(null);
          setActivePresPolicy(null);
        }
      } else if (['home', 'policies', 'bundles', 'architecture', 'admin'].includes(route)) {
        setCurrentTab(route as TabType);
        if (route === 'policies' && param) {
          setSelectedCategory(param);
        }
        setActiveDocPolicy(null);
        setActivePresPolicy(null);
      }
    };

    if (policies.length > 0) {
      syncFromHash();
    }
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, [policies]);

  // Login triggers
  const handleOpenLogin = () => {
    setIsAdminLoginOpen(true);
  };

  // Google Login via Firebase Auth (يتم تحميل Firebase ديناميكياً عند الضغط فقط)
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoadingMessage('جاري الاتصال بخدمات Firebase...');
    try {
      const fb = await loadFirebase();
      const { isConfigured, auth, db } = fb.initFirebaseService(settings);
      fbRef.current = { app: null, auth, db };
      setIsFirebaseConnected(isConfigured);

      if (!isConfigured || !auth || !db) {
        throw new Error('لم يتم تهيئة إعدادات Firebase بعد. يرجى إدخال مفاتيح المشروع في الإعدادات.');
      }

      await fb.loginWithGoogle(auth);
      // تفعيل جلسة المدير: يعيد تشغيل تأثير الاشتراك فيتحقق من الدور ويشترك بـ Firestore ويحدّث الحالة
      localStorage.setItem('mih_admin_hint', '1');
      setAdminSessionActive(true);
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const fb = await loadFirebase();
      if (fbRef.current.auth) {
        await fb.logoutUser(fbRef.current.auth);
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem('mih_admin_hint');
    setAdminSessionActive(false);
    adminModeRef.current = false;
    setCurrentUser(null);
    setAdminRole(null);
    setAdminList([]);
    if (currentTab === 'admin') {
      setCurrentTab('home');
    }
    // إعادة تحميل اللقطة الثابتة للزوار
    await fetchStaticPolicies();
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Policy Save — حفظ في Firestore ثم جدولة النشر التلقائي
  const handleSavePolicy = async (policy: Policy) => {
    let savedToCloud = false;
    if (fbRef.current.db) {
      if (!adminRole || !currentUser?.email) {
        showToast('سجّل الدخول بحساب مدير معتمد لحفظ السياسة');
        return;
      }
      try {
        const fb = await loadFirebase();
        await fb.savePolicyToFirestore(fbRef.current.db, policy, currentUser.email);
        savedToCloud = true;
        // جدولة النشر التلقائي للزوار بعد 30 ثانية
        schedulePublish();
      } catch (e: any) {
        console.warn('Firestore save failed:', e);
        showToast(`تعذر الحفظ في Firestore: ${friendlyError(e)}`);
        return;
      }
    }

    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.id === policy.id);
      return idx > -1 ? prev.map((p, i) => (i === idx ? policy : p)) : [policy, ...prev];
    });

    setEditingPolicy(null);
    showToast(savedToCloud ? 'تم الحفظ في Firestore وجدولة النشر التلقائي' : 'تم حفظ السياسة محلياً');
    handleTabChange('policies');
  };

  // Policy Delete — حذف من Firestore ثم جدولة النشر التلقائي
  const handleDeletePolicy = async (policyId: string) => {
    if (!canDelete) {
      showToast('الحذف متاح لدور admin أو superadmin فقط');
      return;
    }
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه السياسة نهائياً؟')) return;

    if (fbRef.current.db) {
      try {
        const fb = await loadFirebase();
        await fb.deletePolicyFromFirestore(fbRef.current.db, policyId);
        // جدولة النشر التلقائي للزوار
        schedulePublish();
      } catch (e: any) {
        showToast(`تعذر الحذف من Firestore: ${friendlyError(e)}`);
        return;
      }
    }

    setPolicies((prev) => prev.filter((p) => p.id !== policyId));
    showToast('تم حذف السياسة وجدولة نشر التحديث');
  };

  // تهيئة أولية يدوية: تضيف السياسات الافتراضية غير الموجودة فقط
  const handleSeedFirestore = async () => {
    if (!fbRef.current.db) {
      showToast('يرجى التأكد من ربط وتوصيل Firebase في الإعدادات أولاً');
      return;
    }
    if (!adminRole || !currentUser?.email) {
      showToast('سجّل الدخول بحساب مدير معتمد أولاً');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('جاري إضافة السياسات الافتراضية غير الموجودة إلى Cloud Firestore...');
    try {
      const fb = await loadFirebase();
      const defaults = await loadDefaultPolicies();
      const res = await fb.seedFirestoreWithDefaults(fbRef.current.db, defaults, currentUser.email);
      setIsLoading(false);
      if (res.success) {
        showToast(`تمت إضافة ${res.count} سياسة جديدة وتخطي ${res.skipped} موجودة مسبقاً.`);
        if (res.count > 0) schedulePublish();
      } else {
        showToast(`خطأ في الرفع: ${res.error}`);
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(`خطأ: ${err.message || err}`);
    }
  };

  // Policy Edit Trigger
  const handleStartEdit = (policy: Policy) => {
    if (!isAuthorizedAdmin) {
      showToast('تعديل السياسات مخصص للمديرين المصرح لهم فقط');
      return;
    }
    setEditingPolicy(policy);
    handleTabChange('admin');
  };

  // Bundle Checklist Item Toggle
  const handleToggleBundleItem = (bundleId: string, itemIndex: number, checked: boolean) => {
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        const newItems = [...b.items];
        newItems[itemIndex] = { ...newItems[itemIndex], checked };
        return { ...b, items: newItems };
      });
      saveCachedBundles(updated);
      return updated;
    });
  };

  // Bundle Check All
  const handleCheckAllBundle = (bundleId: string) => {
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        return {
          ...b,
          items: b.items.map((it) => ({ ...it, checked: true }))
        };
      });
      saveCachedBundles(updated);
      return updated;
    });
    showToast('تم تأشير استيفاء جميع عناصر الحزمة بنسبة 100%');
  };

  // Export JSON with UTF-8 BOM
  const handleExportJson = () => {
    const dataStr = JSON.stringify({ policies, bundles }, null, 2);
    const blob = new Blob(['\uFEFF' + dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mih-quality-policies-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف السياسات بنجاح (JSON)');
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (isFirebaseConnected) {
      showToast('السحابة هي المصدر الرسمي للسياسات. استخدم زر المزامنة لإضافة الافتراضي غير الموجود.');
      return;
    }
    if (confirm('هل أنت متأكد من رغبتك في استعادة السياسات الافتراضية (محلياً)؟')) {
      const defP = JSON.parse(JSON.stringify(await loadDefaultPolicies()));
      const defB = JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
      setPolicies(defP);
      setBundles(defB);
      saveCachedBundles(defB);
      showToast('تمت استعادة البيانات الافتراضية للمستشفى');
    }
  };

  // Import Batch Policies & Sync to Firestore with chunked upsert & progress
  const handleImportBatchPolicies = async (
    imported: Policy[],
    onProgress?: (progress: { current: number; total: number; percent: number }) => void
  ): Promise<{ addedCount?: number; updatedCount?: number } | void> => {
    if (isFirebaseConnected && (!adminRole || !currentUser?.email)) {
      showToast('سجّل الدخول بحساب مدير معتمد لاستيراد السياسات');
      throw new Error('سجّل الدخول بحساب مدير معتمد لاستيراد السياسات');
    }

    let addedCount = 0;
    let updatedCount = 0;

    if (fbRef.current.db && currentUser?.email) {
      const fb = await loadFirebase();
      const res = await fb.upsertPoliciesBatch(fbRef.current.db, imported, currentUser.email, onProgress);
      if (!res.success) throw new Error(res.error || 'فشل الحفظ السحابي');
      addedCount = res.addedCount;
      updatedCount = res.updatedCount;
      schedulePublish();
    } else {
      const existingIds = new Set(policies.map((p) => p.id));
      imported.forEach((p) => {
        if (existingIds.has(p.id)) updatedCount++;
        else addedCount++;
      });
      if (onProgress) {
        onProgress({ current: imported.length, total: imported.length, percent: 100 });
      }
    }

    setPolicies((prev) => {
      const updated = [...prev];
      imported.forEach((newP) => {
        const idx = updated.findIndex((p) => p.id === newP.id || p.code === newP.code);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...newP };
        } else {
          updated.unshift(newP);
        }
      });
      return updated;
    });

    return { addedCount, updatedCount };
  };

  // Save Settings (Firebase / Cloudinary)
  const handleSaveSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    setIsFirebaseConnected(isFirebaseConfigured(newSettings));
    showToast('تم حفظ الإعدادات');
  };

  // إدارة المديرين (superadmin)
  const handleAddAdmin = async (email: string, role: AdminRole) => {
    try {
      const fb = await loadFirebase();
      await fb.addAdminDoc(fbRef.current.db, email, role, currentUser?.email || '');
      await refreshAdminList();
      showToast(`تم اعتماد ${email} بدور ${role}`);
    } catch (e: any) {
      showToast(`تعذر إضافة المدير: ${friendlyError(e)}`);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    try {
      const fb = await loadFirebase();
      await fb.deleteAdminDoc(fbRef.current.db, email);
      await refreshAdminList();
      showToast(`تمت إزالة ${email}`);
    } catch (e: any) {
      showToast(`تعذر الإزالة: ${friendlyError(e)}`);
    }
  };

  const handleUpdateAdminRole = async (email: string, role: AdminRole) => {
    const clean = email.trim().toLowerCase();
    setAdminList((prev) =>
      prev.map((a) => (a.email.toLowerCase() === clean ? { ...a, role } : a))
    );
    try {
      const fb = await loadFirebase();
      await fb.updateAdminRole(fbRef.current.db, clean, role);
      await refreshAdminList();
      showToast(`تم تغيير صلاحية ${clean} إلى (${role}) بنجاح 👑`);
    } catch (e: any) {
      await refreshAdminList();
      showToast(`تعذر تعديل الصلاحية: ${friendlyError(e)}`);
      throw e;
    }
  };

  return (
    <div
      className={
        darkMode
          ? 'dark min-h-screen flex bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white transition-colors duration-200'
          : 'min-h-screen flex bg-slate-50 text-slate-900 selection:bg-teal-600 selection:text-white transition-colors duration-200'
      }
    >
      {/* Permanent Full-Height Sidebar with Hospital Brand */}
      <DepartmentSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        policies={policies}
        bundlesCount={bundles.length}
        onSelectPolicy={handleOpenDocument}
        onLaunchPresentation={handleOpenPresentation}
        onSelectCategory={handleSelectCategory}
        selectedCategory={selectedCategory}
        currentTab={currentTab}
        onNavigateTab={handleTabChange}
        isAuthorizedAdmin={isAuthorizedAdmin}
        currentUser={currentUser}
        onLogin={handleOpenLogin}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        lang={lang}
        onToggleLanguage={toggleLanguage}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={toggleBookmark}
        onOpenBookmarks={handleOpenBookmarks}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          activeReadingPolicy={activeDocPolicy}
          onBackFromReading={() => setActiveDocPolicy(null)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          lang={lang}
        />

        {/* Main Views Container */}
        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-8">
          {initialLoadError && (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
                ⚠️ {initialLoadError}
              </p>
              <button
                type="button"
                onClick={fetchStaticPolicies}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-sm"
              >
                إعادة المحاولة 🔄
              </button>
            </div>
          )}

          {currentTab === 'home' && (
            <HomeView
              policies={policies}
              bundles={bundles}
              isAuthorizedAdmin={isAuthorizedAdmin}
              onNavigateTab={handleTabChange}
              onFilterCategory={handleSelectCategory}
              onSearchQuery={(q) => {
                setSearchQuery(q);
                setSelectedCategory('ALL');
              }}
              onOpenDocument={handleOpenDocument}
              onOpenPresentation={handleOpenPresentation}
              onQuickAddPolicy={() => {
                setEditingPolicy(null);
                handleTabChange('admin');
              }}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
            />
          )}

          {currentTab === 'policies' && (
            <PoliciesView
              policies={policies}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              isAuthorizedAdmin={isAuthorizedAdmin}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (q && !searchTexts) {
                  loadSearchTexts().then(setSearchTexts).catch(() => {});
                }
              }}
              onCategoryChange={handleSelectCategory}
              onOpenDocument={handleOpenDocument}
              onOpenPresentation={handleOpenPresentation}
              onEditPolicy={handleStartEdit}
              onDeletePolicy={handleDeletePolicy}
              onAddPolicy={() => {
                setEditingPolicy(null);
                handleTabChange('admin');
              }}
              lang={lang}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              searchTexts={searchTexts}
              isLoading={isInitialLoading}
            />
          )}

          {currentTab === 'bundles' && (
            <BundlesView
              bundles={bundles}
              onToggleItem={handleToggleBundleItem}
              onCheckAll={handleCheckAllBundle}
            />
          )}

          {currentTab === 'architecture' && <ArchitectureView />}

          {currentTab === 'admin' && (
            <Suspense fallback={<div className="py-16 text-center text-sm font-bold text-slate-500">جاري تحميل لوحة الإدارة...</div>}>
              <AdminView
                policies={policies}
                editingPolicy={editingPolicy}
                settings={settings}
                onSavePolicy={handleSavePolicy}
                onResetEditor={() => setEditingPolicy(null)}
                onExportJson={handleExportJson}
                onResetDefaults={handleResetDefaults}
                onShowLoading={(l, m) => {
                  setIsLoading(l);
                  setLoadingMessage(m || '');
                }}
                onShowToast={showToast}
                onUpdateSettings={handleSaveSettings}
                onSeedFirestore={handleSeedFirestore}
                onImportPolicies={handleImportBatchPolicies}
                adminRole={adminRole}
                adminList={adminList}
                currentUserEmail={currentUser?.email || ''}
                onAddAdmin={handleAddAdmin}
                onRemoveAdmin={handleRemoveAdmin}
                onUpdateAdminRole={handleUpdateAdminRole}
                publishStatus={publishStatus}
                onTriggerPublishNow={triggerPublishNow}
              />
            </Suspense>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Modals & Overlays */}
      <Suspense fallback={null}>
        {activeDocPolicy && (
          <DocumentModal
            policy={activeDocPolicy}
            isOpen={true}
            isAuthorizedAdmin={isAuthorizedAdmin}
            onClose={handleCloseDocument}
            onLaunchPresentation={handleOpenPresentation}
            onEditPolicy={handleStartEdit}
            lang={lang}
            isBookmarked={bookmarkedIds.includes(activeDocPolicy.id)}
            onToggleBookmark={toggleBookmark}
            searchQuery={searchQuery}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {activePresPolicy && (
          <PresentationModal
            policy={activePresPolicy}
            isOpen={true}
            onClose={handleClosePresentation}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            isOpen={true}
            settings={settings}
            onClose={() => setIsSettingsOpen(false)}
            onSave={handleSaveSettings}
          />
        )}

        {isAdminLoginOpen && (
          <AdminLoginModal
            isOpen={true}
            settings={settings}
            isFirebaseConfigured={isFirebaseConnected}
            onClose={() => setIsAdminLoginOpen(false)}
            onGoogleLogin={handleGoogleLogin}
          />
        )}
      </Suspense>

      <PermissionDeniedModal
        isOpen={Boolean(permissionDeniedEmail)}
        userEmail={permissionDeniedEmail || ''}
        onClose={() => setPermissionDeniedEmail(null)}
        onRecheck={async () => {
          if (!permissionDeniedEmail || !fbRef.current.db) return;
          const fb = await loadFirebase();
          const role = await fb.getAdminRole(fbRef.current.db, permissionDeniedEmail);
          if (role) {
            setAdminRole(role);
            setPermissionDeniedEmail(null);
            if (role === 'admin' || role === 'superadmin') await refreshAdminList();
            showToast(`تم التحقق بنجاح! مرحباً بك بدور ${role} 👑`);
          } else {
            showToast('هذا البريد غير معتمد بعد. اطلب من المدير العام (superadmin) اعتماده.');
          }
        }}
      />

      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />

      <Toast message={toastMessage} />
    </div>
  );
};
