import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Policy, Bundle, AuthUser, SystemSettings, AdminRole, AdminEntry } from './types';
import { DEFAULT_BUNDLES } from './data/meta';
import {
  getStoredSettings,
  saveStoredSettings,
  getCachedPolicies,
  saveCachedPolicies,
  getCachedBundles,
  saveCachedBundles
} from './services/storage';
import {
  initFirebaseService,
  subscribeToPolicies,
  subscribeToAuth,
  getAdminRole,
  listAdmins,
  addAdminDoc,
  updateAdminRole,
  deleteAdminDoc,
  loginWithGoogle,
  logoutUser,
  savePolicyToFirestore,
  deletePolicyFromFirestore,
  seedFirestoreWithDefaults,
  upsertPoliciesBatch
} from './services/firebase';
import { Navbar, TabType } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PoliciesView } from './components/PoliciesView';
import { BundlesView } from './components/BundlesView';
import { ArchitectureView } from './components/ArchitectureView';
import { DocumentModal } from './components/DocumentModal';
import { PermissionDeniedModal } from './components/PermissionDeniedModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Toast } from './components/Toast';
import { DepartmentSidebar } from './components/DepartmentSidebar';
import { Footer } from './components/Footer';
import { Language, UI_STRINGS } from './utils/translations';

// تحميل كسول للمكونات الثقيلة/النادرة (الإدارة، العرض التقديمي، الإعدادات، تسجيل الدخول)
const AdminView = lazy(() => import('./components/AdminView').then((m) => ({ default: m.AdminView })));
const PresentationModal = lazy(() => import('./components/PresentationModal').then((m) => ({ default: m.PresentationModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const AdminLoginModal = lazy(() => import('./components/AdminLoginModal').then((m) => ({ default: m.AdminLoginModal })));

async function loadDefaultPolicies(): Promise<Policy[]> {
  const mod = await import('./data/defaultPolicies');
  return mod.DEFAULT_POLICIES;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(getStoredSettings);
  const [policies, setPolicies] = useState<Policy[]>(getCachedPolicies);
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
    setCurrentTab('policies');
    setSelectedCategory('ALL');
    setSearchQuery('');
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
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
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

  const refreshAdminList = async () => {
    if (fbRef.current.db) setAdminList(await listAdmins(fbRef.current.db));
  };

  // تهيئة Firebase والاشتراكات. الصلاحيات تأتي من Firestore فقط (مجموعة admins) وتُفرض بالقواعد.
  useEffect(() => {
    const { isConfigured, auth, db } = initFirebaseService(settings);
    fbRef.current = { app: null, auth, db };
    setIsFirebaseConnected(isConfigured);

    if (!isConfigured || !db || !auth) {
      // وضع محلي: نعرض السياسات الافتراضية (تُحمَّل عند الحاجة فقط)
      loadDefaultPolicies().then((defs) => setPolicies((prev) => (prev.length === 0 ? defs : prev)));
      return;
    }

    const unsubscribePolicies = subscribeToPolicies(
      db,
      (remote, meta) => {
        if (remote.length > 0) {
          setPolicies(remote);
          saveCachedPolicies(remote);
        } else {
          // لا بيانات: إمّا قاعدة فارغة أو دون اتصال بلا كاش → نعرض الافتراضية للقراءة فقط
          loadDefaultPolicies().then((defs) => setPolicies((prev) => (meta.fromCache && prev.length ? prev : defs)));
        }
      },
      () => {
        loadDefaultPolicies().then((defs) => setPolicies((prev) => (prev.length === 0 ? defs : prev)));
      }
    );

    const unsubscribeAuth = subscribeToAuth(auth, async (user) => {
      setCurrentUser(user);
      if (!user?.email) {
        setAdminRole(null);
        setAdminList([]);
        return;
      }
      const role = await getAdminRole(db, user.email);
      setAdminRole(role);
      if (role) {
        setPermissionDeniedEmail(null);
        showToast(`مرحباً بك: ${user.displayName || user.email} (${role}) 👑`);
        if (role === 'admin' || role === 'superadmin') {
          setAdminList(await listAdmins(db));
        }
      } else {
        setAdminList([]);
        setPermissionDeniedEmail(user.email);
      }
    });

    return () => {
      unsubscribePolicies();
      unsubscribeAuth();
    };
  }, [settings.firebase]);

  // Update URL Hash without reload
  const updateHash = (newHash: string) => {
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  };

  // Open & Close Document Handlers
  const handleOpenDocument = (p: Policy) => {
    setActiveDocPolicy(p);
    setActivePresPolicy(null);
    updateHash(`#/policy/${p.id}`);
  };

  const handleCloseDocument = () => {
    setActiveDocPolicy(null);
    updateHash(currentTab === 'home' ? '#/' : `#/${currentTab}`);
  };

  // Open & Close Presentation Handlers
  const handleOpenPresentation = (p: Policy) => {
    setActivePresPolicy(p);
    setActiveDocPolicy(null);
    updateHash(`#/present/${p.id}`);
  };

  const handleClosePresentation = () => {
    setActivePresPolicy(null);
    updateHash(currentTab === 'home' ? '#/' : `#/${currentTab}`);
  };

  // Tab switch handler with scroll to top & hash update
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    setActiveDocPolicy(null);
    setActivePresPolicy(null);
    updateHash(tab === 'home' ? '#/' : `#/${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Department / Category filter handler with hash update
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setCurrentTab('policies');
    setActiveDocPolicy(null);
    setActivePresPolicy(null);
    updateHash(`#/category/${cat}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize state with URL Hash for seamless reload (F5) & direct link sharing
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash || '';
      if (!hash || hash === '#' || hash === '#/') return;

      const clean = hash.replace(/^#\/?/, '');
      const parts = clean.split('/');
      const route = parts[0];
      const param = decodeURIComponent(parts.slice(1).join('/'));

      if (route === 'policy' && param) {
        const found = policies.find((p) => p.id === param || p.code === param || p.code?.replace(/\//g, '_') === param);
        if (found) {
          setActiveDocPolicy(found);
          setActivePresPolicy(null);
        }
      } else if (route === 'present' && param) {
        const found = policies.find((p) => p.id === param || p.code === param || p.code?.replace(/\//g, '_') === param);
        if (found) {
          setActivePresPolicy(found);
          setActiveDocPolicy(null);
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

    syncFromHash();
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

  // Google Login via Firebase Auth — التحقق من الدور يتم في اشتراك onAuthStateChanged
  const handleGoogleLogin = async () => {
    if (!isFirebaseConnected || !fbRef.current.auth) {
      throw new Error('لم يتم تهيئة إعدادات Firebase بعد. يرجى إدخال مفاتيح المشروع في الإعدادات.');
    }
    await loginWithGoogle(fbRef.current.auth);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      if (isFirebaseConnected && fbRef.current.auth) {
        await logoutUser(fbRef.current.auth);
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    setAdminRole(null);
    setAdminList([]);
    if (currentTab === 'admin') {
      setCurrentTab('home');
    }
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Policy Save — لا نُظهر "تم الحفظ" إذا فشلت الكتابة السحابية
  const handleSavePolicy = async (policy: Policy) => {
    let savedToCloud = false;
    if (isFirebaseConnected && fbRef.current.db) {
      if (!adminRole || !currentUser?.email) {
        showToast('سجّل الدخول بحساب مدير معتمد لحفظ السياسة');
        return;
      }
      try {
        await savePolicyToFirestore(fbRef.current.db, policy, currentUser.email);
        savedToCloud = true;
      } catch (e: any) {
        console.warn('Firestore save failed:', e);
        showToast(`تعذر الحفظ في Firestore: ${friendlyError(e)}`);
        return; // نُبقي المحرر مفتوحاً حتى لا يضيع عمل المستخدم
      }
    }

    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.id === policy.id);
      const updated = idx > -1 ? prev.map((p, i) => (i === idx ? policy : p)) : [policy, ...prev];
      saveCachedPolicies(updated);
      return updated;
    });

    setEditingPolicy(null);
    showToast(savedToCloud ? 'تم الحفظ والمزامنة السحابية في Firestore بنجاح' : 'تم حفظ السياسة محلياً (غير متصل بالسحابة)');
    handleTabChange('policies');
  };

  // Policy Delete — حذف فعلي يتطلب دور admin أو أعلى
  const handleDeletePolicy = async (policyId: string) => {
    if (!canDelete) {
      showToast('الحذف متاح لدور admin أو superadmin فقط');
      return;
    }
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه السياسة نهائياً؟')) return;

    if (isFirebaseConnected && fbRef.current.db) {
      try {
        await deletePolicyFromFirestore(fbRef.current.db, policyId);
      } catch (e: any) {
        showToast(`تعذر الحذف من Firestore: ${friendlyError(e)}`);
        return;
      }
    }

    setPolicies((prev) => {
      const updated = prev.filter((p) => p.id !== policyId);
      saveCachedPolicies(updated);
      return updated;
    });
    showToast('تم حذف السياسة بنجاح');
  };

  // تهيئة أولية يدوية: تضيف السياسات الافتراضية غير الموجودة فقط ولا تلمس الموجود
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
    const defaults = await loadDefaultPolicies();
    const res = await seedFirestoreWithDefaults(fbRef.current.db, defaults, currentUser.email);
    setIsLoading(false);
    if (res.success) {
      showToast(`تمت إضافة ${res.count} سياسة جديدة وتخطي ${res.skipped} موجودة مسبقاً (لم يُكتب فوق أي سياسة).`);
    } else {
      showToast(`خطأ في الرفع: ${res.error}`);
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

  // Export JSON with UTF-8 BOM for seamless Arabic text compatibility
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

  // Reset to Defaults (محلياً فقط — السحابة هي المصدر الرسمي عند الاتصال)
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
      saveCachedPolicies(defP);
      saveCachedBundles(defB);
      showToast('تمت استعادة البيانات الافتراضية للمستشفى');
    }
  };

  // Import Batch Policies & Sync to Firestore
  const handleImportBatchPolicies = async (imported: Policy[]) => {
    if (isFirebaseConnected && (!adminRole || !currentUser?.email)) {
      showToast('سجّل الدخول بحساب مدير معتمد لاستيراد السياسات');
      return;
    }
    setIsLoading(true);
    setLoadingMessage(`جاري استيراد وحفظ (${imported.length}) سياسة في قاعدة البيانات السحابية...`);
    try {
      if (isFirebaseConnected && fbRef.current.db && currentUser?.email) {
        const res = await upsertPoliciesBatch(fbRef.current.db, imported, currentUser.email);
        if (!res.success) throw new Error(res.error || 'فشل الحفظ السحابي');
      }

      const updated = [...policies];
      imported.forEach((newP) => {
        const idx = updated.findIndex((p) => p.id === newP.id || p.code === newP.code);
        if (idx !== -1) updated[idx] = newP;
        else updated.unshift(newP);
      });
      setPolicies(updated);
      saveCachedPolicies(updated);

      setIsLoading(false);
      showToast(`تم استيراد (${imported.length}) سياسات بنجاح`);
    } catch (err: any) {
      setIsLoading(false);
      alert(`حدث خطأ أثناء الاستيراد: ${err.message || err}`);
    }
  };

  // Save Settings (Firebase / Cloudinary)
  const handleSaveSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    showToast('تم حفظ الإعدادات');
  };

  // إدارة المديرين (superadmin) — تُفرض بالقواعد أيضاً
  const handleAddAdmin = async (email: string, role: AdminRole) => {
    try {
      await addAdminDoc(fbRef.current.db, email, role, currentUser?.email || '');
      await refreshAdminList();
      showToast(`تم اعتماد ${email} بدور ${role}`);
    } catch (e: any) {
      showToast(`تعذر إضافة المدير: ${friendlyError(e)}`);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    try {
      await deleteAdminDoc(fbRef.current.db, email);
      await refreshAdminList();
      showToast(`تمت إزالة ${email}`);
    } catch (e: any) {
      showToast(`تعذرت الإزالة: ${friendlyError(e)}`);
    }
  };

  const handleUpdateAdminRole = async (email: string, role: AdminRole) => {
    try {
      await updateAdminRole(fbRef.current.db, email, role);
      await refreshAdminList();
      showToast(`تم تغيير صلاحية ${email} إلى (${role}) بنجاح 👑`);
    } catch (e: any) {
      showToast(`تعذر تعديل الصلاحية: ${friendlyError(e)}`);
    }
  };

  return (
    <div
      className={
        darkMode
          ? 'dark min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white transition-colors duration-200'
          : 'min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-600 selection:text-white transition-colors duration-200'
      }
    >
      {/* Main navigation header (TopBanner removed as requested; controls integrated directly here) */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        policiesCount={policies.length}
        bundlesCount={bundles.length}
        isAuthorizedAdmin={isAuthorizedAdmin}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogin={handleOpenLogin}
        onLogout={handleLogout}
        currentUser={currentUser}
        isFirebaseConnected={isFirebaseConnected}
        activeReadingPolicy={activeDocPolicy}
        onBackFromReading={handleCloseDocument}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        lang={lang}
        onToggleLanguage={toggleLanguage}
        bookmarksCount={bookmarkedIds.length}
        onOpenBookmarks={handleOpenBookmarks}
      />

      {/* Body Container: Permanent Sidebar + Main Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Department & Quality Sidebar (Permanent on Desktop, Drawer on Mobile) */}
        <DepartmentSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          policies={policies}
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
        />

        {/* Main Views Container */}
        <main className="flex-1 min-w-0 px-3 sm:px-5 lg:px-8 py-6 space-y-8">
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
              onSearchChange={setSearchQuery}
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
              />
            </Suspense>
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Modals & Overlays */}
      <DocumentModal
        policy={activeDocPolicy}
        isOpen={Boolean(activeDocPolicy)}
        isAuthorizedAdmin={isAuthorizedAdmin}
        onClose={handleCloseDocument}
        onLaunchPresentation={handleOpenPresentation}
        onEditPolicy={handleStartEdit}
        lang={lang}
        isBookmarked={activeDocPolicy ? bookmarkedIds.includes(activeDocPolicy.id) : false}
        onToggleBookmark={toggleBookmark}
      />

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
          const role = await getAdminRole(fbRef.current.db, permissionDeniedEmail);
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
