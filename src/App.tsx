import React, { useState, useEffect, useRef } from 'react';
import { Policy, Bundle, AuthUser, SystemSettings, CategoryKey } from './types';
import { DEFAULT_POLICIES, DEFAULT_BUNDLES } from './data/initialData';
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
  subscribeToWhitelist,
  fetchWhitelistFromFirestore,
  isEmailAdminInFirestore,
  saveWhitelistToFirestore,
  deleteAdminDocFromFirestore,
  loginWithGoogle,
  logoutUser,
  savePolicyToFirestore,
  deletePolicyFromFirestore,
  seedFirestoreWithDefaults
} from './services/firebase';
import { Navbar, TabType } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PoliciesView } from './components/PoliciesView';
import { BundlesView } from './components/BundlesView';
import { ArchitectureView } from './components/ArchitectureView';
import { AdminView } from './components/AdminView';
import { DocumentModal } from './components/DocumentModal';
import { PresentationModal } from './components/PresentationModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { PermissionDeniedModal } from './components/PermissionDeniedModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(getStoredSettings);
  const [policies, setPolicies] = useState<Policy[]>(getCachedPolicies);
  const [bundles, setBundles] = useState<Bundle[]>(getCachedBundles);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
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

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Auth & Connection
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
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

  const checkAdminWhitelist = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    const whitelist = settings.adminEmails || [];
    return whitelist.some((e) => e.trim().toLowerCase() === clean);
  };

  // Initialize Firebase and subscribe
  useEffect(() => {
    const { isConfigured, app, auth, db } = initFirebaseService(settings);
    fbRef.current = { app, auth, db };
    setIsFirebaseConnected(isConfigured);

    let unsubscribePolicies = () => {};
    let unsubscribeAuth = () => {};
    let unsubscribeWhitelist = () => {};

    if (isConfigured && db && auth) {
      unsubscribePolicies = subscribeToPolicies(db, (remotePolicies) => {
        setPolicies(remotePolicies);
        saveCachedPolicies(remotePolicies);
      });

      // Realtime subscription to authorized admin emails from Firestore
      unsubscribeWhitelist = subscribeToWhitelist(db, (remoteEmails) => {
        if (remoteEmails && remoteEmails.length > 0) {
          setSettings((prev) => {
            const combined = Array.from(new Set([...prev.adminEmails, ...remoteEmails]));
            const updated = { ...prev, adminEmails: combined };
            saveStoredSettings(updated);
            return updated;
          });
        }
      });

      unsubscribeAuth = subscribeToAuth(auth, async (user) => {
        setCurrentUser(user);
        if (user && user.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          let authorized = checkAdminWhitelist(cleanEmail);

          if (db) {
            try {
              // 1. Direct check in Firestore collections
              const firestoreAdmin = await isEmailAdminInFirestore(db, cleanEmail);
              if (firestoreAdmin) {
                authorized = true;
              }

              // 2. Fresh fetch of all admin emails from Firestore
              const fresh = await fetchWhitelistFromFirestore(db);
              if (fresh && fresh.length > 0) {
                if (fresh.some((e) => e.trim().toLowerCase() === cleanEmail)) {
                  authorized = true;
                }
                setSettings((prev) => {
                  const combined = Array.from(new Set([...prev.adminEmails, ...fresh, ...(authorized ? [cleanEmail] : [])]));
                  const updated = { ...prev, adminEmails: combined };
                  saveStoredSettings(updated);
                  return updated;
                });
              }
            } catch (e) {
              console.warn('Auth check whitelist error:', e);
            }
          }

          setIsAuthorizedAdmin(authorized);
          if (authorized) {
            localStorage.setItem('mih_admin_session', JSON.stringify(user));
            setPermissionDeniedEmail(null);
            showToast(`مرحباً بك: ${user.displayName || user.email} (مدير جودة معتمد) 👑`);
          } else {
            setPermissionDeniedEmail(user.email);
          }
        } else {
          setIsAuthorizedAdmin(false);
        }
      });
    }

    return () => {
      unsubscribePolicies();
      unsubscribeAuth();
      unsubscribeWhitelist();
    };
  }, [settings.firebase]);

  // Dynamically re-evaluate authorization if currentUser exists and whitelist changes
  useEffect(() => {
    if (currentUser && currentUser.email) {
      const authorized = checkAdminWhitelist(currentUser.email);
      if (authorized) {
        setIsAuthorizedAdmin(true);
        localStorage.setItem('mih_admin_session', JSON.stringify(currentUser));
        setPermissionDeniedEmail(null);
      }
    }
  }, [currentUser, settings.adminEmails]);

  // When an authorized admin is logged in, ensure Firestore has all currently approved emails
  useEffect(() => {
    if (isAuthorizedAdmin && isFirebaseConnected && fbRef.current.db && settings.adminEmails?.length > 0) {
      saveWhitelistToFirestore(fbRef.current.db, settings.adminEmails).catch((e) => {
        console.warn('Background sync whitelist error:', e);
      });
    }
  }, [isAuthorizedAdmin, isFirebaseConnected]);

  // Restore saved session on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('mih_admin_session');
      if (savedSession) {
        const user = JSON.parse(savedSession);
        if (user && user.email && checkAdminWhitelist(user.email)) {
          setCurrentUser(user);
          setIsAuthorizedAdmin(true);
        }
      }
    } catch (e) {
      console.warn('Session load error:', e);
    }
  }, [settings.adminEmails]);

  // Tab switch handler with scroll to top
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Login triggers
  const handleOpenLogin = () => {
    setIsAdminLoginOpen(true);
  };

  // Google Login via Firebase Auth
  const handleGoogleLogin = async () => {
    if (!isFirebaseConnected || !fbRef.current.auth) {
      throw new Error(
        'لم يتم تهيئة إعدادات Firebase بعد. يرجى إدخال مفاتيح المشروع في الإعدادات.'
      );
    }
    const user = await loginWithGoogle(fbRef.current.auth);
    if (user && user.email) {
      setCurrentUser(user);
      const cleanEmail = user.email.trim().toLowerCase();
      let authorized = checkAdminWhitelist(cleanEmail);

      // Dynamically verify with live Firestore
      if (fbRef.current.db) {
        try {
          const firestoreAdmin = await isEmailAdminInFirestore(fbRef.current.db, cleanEmail);
          if (firestoreAdmin) {
            authorized = true;
          }

          const fresh = await fetchWhitelistFromFirestore(fbRef.current.db);
          if (fresh && fresh.length > 0) {
            if (fresh.some((e) => e.trim().toLowerCase() === cleanEmail)) {
              authorized = true;
            }
            setSettings((prev) => {
              const combined = Array.from(new Set([...prev.adminEmails, ...fresh, ...(authorized ? [cleanEmail] : [])]));
              const updated = { ...prev, adminEmails: combined };
              saveStoredSettings(updated);
              return updated;
            });
          }
        } catch (e) {
          console.warn('Live fetch whitelist error:', e);
        }
      }

      setIsAuthorizedAdmin(authorized);
      if (authorized) {
        localStorage.setItem('mih_admin_session', JSON.stringify(user));
        setPermissionDeniedEmail(null);
        showToast(`مرحباً بك: ${user.displayName || user.email} (مدير جودة معتمد) 👑`);
      } else {
        setPermissionDeniedEmail(user.email);
      }
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      localStorage.removeItem('mih_admin_session');
      if (isFirebaseConnected && fbRef.current.auth) {
        await logoutUser(fbRef.current.auth);
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    setIsAuthorizedAdmin(false);
    if (currentTab === 'admin') {
      setCurrentTab('home');
    }
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Policy Save
  const handleSavePolicy = async (policy: Policy) => {
    let savedToCloud = false;
    if (isFirebaseConnected && fbRef.current.db && isAuthorizedAdmin) {
      try {
        await savePolicyToFirestore(fbRef.current.db, policy);
        savedToCloud = true;
      } catch (e: any) {
        console.warn('Could not save to Firestore, saving to local cache:', e);
      }
    }

    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.id === policy.id);
      let updated: Policy[];
      if (idx > -1) {
        updated = [...prev];
        updated[idx] = policy;
      } else {
        updated = [policy, ...prev];
      }
      saveCachedPolicies(updated);
      return updated;
    });

    setEditingPolicy(null);
    showToast(savedToCloud ? 'تم الحفظ والمزامنة السحابية في Firestore بنجاح' : 'تم حفظ السياسة بنجاح');
    handleTabChange('policies');
  };

  // Policy Delete
  const handleDeletePolicy = async (policyId: string) => {
    if (!isAuthorizedAdmin) {
      showToast('غير مصرح لك بحذف السياسات');
      return;
    }
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه السياسة نهائياً؟')) return;

    if (isFirebaseConnected && fbRef.current.db) {
      try {
        await deletePolicyFromFirestore(fbRef.current.db, policyId);
      } catch (e) {
        console.warn('Could not delete from Firestore:', e);
      }
    }

    setPolicies((prev) => {
      const updated = prev.filter((p) => p.id !== policyId);
      saveCachedPolicies(updated);
      return updated;
    });

    showToast('تم حذف السياسة بنجاح');
  };

  // Seed all default policies to Firestore
  const handleSeedFirestore = async () => {
    if (!fbRef.current.db) {
      showToast('يرجى التأكد من ربط وتوصيل Firebase في الإعدادات أولاً');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('جاري رفع ومزامنة كافة السياسات المعتمدة إلى Cloud Firestore...');
    const res = await seedFirestoreWithDefaults(fbRef.current.db, DEFAULT_POLICIES, currentUser?.email || 'admin@mih-quality.gov.eg');
    setIsLoading(false);
    if (res.success) {
      showToast(`تم بنجاح رفع ومزامنة ${res.count} سياسة معتمدة إلى Cloud Firestore!`);
    } else {
      showToast(`حدث خطأ أثناء الرفع: ${res.error}`);
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

  // Export JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify({ policies, bundles }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
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
  const handleResetDefaults = () => {
    if (confirm('هل أنت متأكد من رغبتك في استعادة السياسات الافتراضية؟')) {
      const defP = JSON.parse(JSON.stringify(DEFAULT_POLICIES));
      const defB = JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
      setPolicies(defP);
      setBundles(defB);
      saveCachedPolicies(defP);
      saveCachedBundles(defB);
      showToast('تمت استعادة البيانات الافتراضية للمستشفى');
    }
  };

  // Save Settings & Whitelist
  const handleSaveSettings = async (newSettings: SystemSettings) => {
    const prevEmails = settings.adminEmails || [];
    setSettings(newSettings);
    saveStoredSettings(newSettings);

    // Sync whitelist to Firestore if connected
    if (isFirebaseConnected && fbRef.current.db) {
      const newEmails = newSettings.adminEmails || [];
      const removed = prevEmails.filter((p) => !newEmails.includes(p));
      for (const rem of removed) {
        await deleteAdminDocFromFirestore(fbRef.current.db, rem);
      }
      const ok = await saveWhitelistToFirestore(fbRef.current.db, newEmails);
      if (ok) {
        showToast('تم حفظ وتحديث قائمة المديرين المعتمدين في فايرستور بنجاح 👑');
        return;
      }
    }

    showToast('تم حفظ وتحديث قائمة المديرين المعتمدين بنجاح 👑');
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
        onBackFromReading={() => setActiveDocPolicy(null)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-8">
        {currentTab === 'home' && (
          <HomeView
            policies={policies}
            bundles={bundles}
            isAuthorizedAdmin={isAuthorizedAdmin}
            onNavigateTab={handleTabChange}
            onFilterCategory={(cat) => {
              setSelectedCategory(cat);
              setSearchQuery('');
            }}
            onSearchQuery={(q) => {
              setSearchQuery(q);
              setSelectedCategory('ALL');
            }}
            onOpenDocument={(p) => setActiveDocPolicy(p)}
            onOpenPresentation={(p) => setActivePresPolicy(p)}
            onQuickAddPolicy={() => {
              setEditingPolicy(null);
              handleTabChange('admin');
            }}
          />
        )}

        {currentTab === 'policies' && (
          <PoliciesView
            policies={policies}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            isAuthorizedAdmin={isAuthorizedAdmin}
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onOpenDocument={(p) => setActiveDocPolicy(p)}
            onOpenPresentation={(p) => setActivePresPolicy(p)}
            onEditPolicy={handleStartEdit}
            onDeletePolicy={handleDeletePolicy}
            onAddPolicy={() => {
              setEditingPolicy(null);
              handleTabChange('admin');
            }}
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
          <AdminView
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
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Overlays */}
      <DocumentModal
        policy={activeDocPolicy}
        isOpen={Boolean(activeDocPolicy)}
        isAuthorizedAdmin={isAuthorizedAdmin}
        onClose={() => setActiveDocPolicy(null)}
        onLaunchPresentation={(p) => setActivePresPolicy(p)}
        onEditPolicy={handleStartEdit}
      />

      <PresentationModal
        policy={activePresPolicy}
        isOpen={Boolean(activePresPolicy)}
        onClose={() => setActivePresPolicy(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        settings={settings}
        isFirebaseConfigured={isFirebaseConnected}
        onClose={() => setIsAdminLoginOpen(false)}
        onGoogleLogin={handleGoogleLogin}
      />

      <PermissionDeniedModal
        isOpen={Boolean(permissionDeniedEmail)}
        userEmail={permissionDeniedEmail || ''}
        onClose={() => setPermissionDeniedEmail(null)}
        onRecheck={async () => {
          if (permissionDeniedEmail) {
            const cleanEmail = permissionDeniedEmail.trim().toLowerCase();
            let authorized = checkAdminWhitelist(cleanEmail);
            if (fbRef.current.db) {
              try {
                // 1. Direct check in Firestore collections
                const firestoreAdmin = await isEmailAdminInFirestore(fbRef.current.db, cleanEmail);
                if (firestoreAdmin) {
                  authorized = true;
                }

                // 2. Fresh fetch from Firestore
                const fresh = await fetchWhitelistFromFirestore(fbRef.current.db);
                if (fresh.some((e) => e.trim().toLowerCase() === cleanEmail)) {
                  authorized = true;
                }

                if (authorized) {
                  setSettings((prev) => {
                    const combined = Array.from(new Set([...prev.adminEmails, ...fresh, cleanEmail]));
                    const updated = { ...prev, adminEmails: combined };
                    saveStoredSettings(updated);
                    return updated;
                  });
                }
              } catch (e) {
                console.warn('Recheck error:', e);
              }
            }
            if (authorized) {
              setIsAuthorizedAdmin(true);
              setPermissionDeniedEmail(null);
              if (currentUser) {
                localStorage.setItem('mih_admin_session', JSON.stringify(currentUser));
              }
              showToast('تم التحقق بنجاح من فايرستور! مرحباً بك كمدير معتمد 👑');
            } else {
              showToast('لا يزال هذا البريد غير مسجل في فايرستور. اطلب من المدير اعتماده أولاً.');
            }
          }
        }}
      />

      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />

      <Toast message={toastMessage} />
    </div>
  );
};
