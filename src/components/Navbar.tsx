import React, { useState } from 'react';
import { Policy, AuthUser } from '../types';

export type TabType = 'home' | 'policies' | 'bundles' | 'architecture' | 'admin';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  policiesCount: number;
  bundlesCount: number;
  isAuthorizedAdmin: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onLogin: () => void;
  onLogout: () => void;
  currentUser: AuthUser | null;
  isFirebaseConnected: boolean;
  activeReadingPolicy?: Policy | null;
  onBackFromReading?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  policiesCount,
  bundlesCount,
  isAuthorizedAdmin,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onLogin,
  onLogout,
  currentUser,
  isFirebaseConnected,
  activeReadingPolicy,
  onBackFromReading,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: TabType) => {
    if (activeReadingPolicy && onBackFromReading) {
      onBackFromReading();
    }
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-sm no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Right Section: Dynamic Header - Policy Title OR Hospital Brand */}
          <div className="flex items-center gap-3 min-w-0 max-w-[55%] sm:max-w-[50%] md:max-w-none">
            {activeReadingPolicy ? (
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onBackFromReading}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 font-bold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer border border-teal-200 dark:border-teal-800"
                  title="العودة لمكتبة السياسات"
                >
                  <span className="text-base leading-none">←</span>
                  <span className="hidden sm:inline">رجوع</span>
                </button>

                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-teal-700 text-white shrink-0 font-mono">
                  {activeReadingPolicy.code}
                </span>

                <div className="min-w-0">
                  <h1
                    className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white truncate"
                    title={activeReadingPolicy.title}
                  >
                    {activeReadingPolicy.title}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {activeReadingPolicy.dept}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
                onClick={() => handleTabClick('home')}
              >
                <img
                  src="/assets/logo.jpg"
                  alt="شعار مستشفى المنصورة الدولي"
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm bg-white shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                      مستشفى المنصورة الدولي
                    </h1>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 shrink-0">
                      MIH
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                    أمانة المراكز الطبية المتخصصة (SMC) • بوابة الجودة
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="التنقل الرئيسي">
            <button
              type="button"
              onClick={() => handleTabClick('home')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                currentTab === 'home' && !activeReadingPolicy
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              🏠 الرئيسية
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('policies')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                currentTab === 'policies'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              📚 مكتبة السياسات (<span>{policiesCount}</span>)
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('bundles')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                currentTab === 'bundles' && !activeReadingPolicy
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              📋 حزم الرعاية (<span>{bundlesCount}</span>)
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('architecture')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                currentTab === 'architecture' && !activeReadingPolicy
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              🏛️ المعايير
            </button>

            {isAuthorizedAdmin && (
              <button
                type="button"
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-red-800 text-white'
                    : 'bg-red-700 hover:bg-red-800 text-white'
                }`}
              >
                <span>⚡</span>
                <span>لوحة الإدارة</span>
              </button>
            )}
          </nav>

          {/* Left Actions (Controls integrated directly into Header) */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Switcher */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-base transition cursor-pointer border border-slate-200 dark:border-slate-700"
              title={darkMode ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن (مريح للعين)'}
              aria-label="تبديل الوضع الليلي"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Cloud Status Dot (Desktop) */}
            <div
              className="hidden sm:flex items-center cursor-pointer"
              onClick={onOpenSettings}
              title={isFirebaseConnected ? 'متصل سحابياً مع Firestore' : 'وضع تخزين محلي (Local)'}
            >
              <span
                className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
            </div>

            {/* Settings Button (Desktop) */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 items-center justify-center text-sm transition cursor-pointer border border-slate-200 dark:border-slate-700"
              title="إعدادات الربط السحابي ومفاتيح API"
              aria-label="الإعدادات"
            >
              ⚙️
            </button>

            {/* Admin Profile / Login Button (Desktop) */}
            <div className="hidden md:flex items-center">
              {currentUser && isAuthorizedAdmin ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 px-2.5 rounded-xl">
                  <img
                    className="w-5 h-5 rounded-full border border-teal-500 object-cover"
                    src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                    alt="avatar"
                  />
                  <span className="font-bold text-xs text-slate-900 dark:text-white max-w-[110px] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    👑 مدير
                  </span>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-bold mr-1 cursor-pointer"
                  >
                    خروج
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>🔐</span>
                  <span>دخول الإدارة</span>
                </button>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                aria-label="فتح القائمة الرئيسية"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay & Drawer (STRICTLY ON THE RIGHT FOR RTL) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" dir="rtl">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer anchored strictly to the RIGHT */}
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-5 space-y-5 overflow-y-auto custom-scroll border-l border-slate-200 dark:border-slate-800 z-10 transition-transform">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/assets/logo.jpg" alt="logo" className="w-9 h-9 object-contain rounded-lg p-0.5 bg-white border border-slate-200" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                    مستشفى المنصورة الدولي
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    بوابة إدارة سياسات الجودة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* DEDICATED ADMIN BUTTON IN SIDEBAR (Explicit User Requirement) */}
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-slate-800/80 border border-teal-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {currentUser && isAuthorizedAdmin ? '👑 مدير الجودة المعتمد' : '🔐 صلاحيات إدارة الجودة'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isFirebaseConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {isFirebaseConnected ? 'سحابي متصل' : 'محلي'}
                </span>
              </div>

              {currentUser && isAuthorizedAdmin ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      className="w-7 h-7 rounded-full border border-teal-500 object-cover"
                      src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                      alt="avatar"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 text-red-700 dark:text-red-300 font-bold text-xs transition cursor-pointer text-center"
                  >
                    تسجيل خروج المدير
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🔐</span>
                  <span>دخول الإدارة (Google)</span>
                </button>
              )}
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex flex-col space-y-1.5">
              <button
                type="button"
                onClick={() => handleTabClick('home')}
                className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                  currentTab === 'home' && !activeReadingPolicy
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏠 الرئيسية
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('policies')}
                className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${
                  currentTab === 'policies'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>📚 مكتبة السياسات</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono">
                  {policiesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('bundles')}
                className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${
                  currentTab === 'bundles'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>📋 حزم الرعاية الإكلينيكية</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono">
                  {bundlesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('architecture')}
                className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                  currentTab === 'architecture'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏛️ الهيكلية ومعايير GAHAR
              </button>

              {isAuthorizedAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabClick('admin')}
                  className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                    currentTab === 'admin'
                      ? 'bg-red-800 text-white'
                      : 'bg-red-700 hover:bg-red-800 text-white'
                  }`}
                >
                  <span>⚡</span>
                  <span>لوحة إدارة الجودة والسياسات</span>
                </button>
              )}
            </nav>

            {/* Bottom Controls in Sidebar */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-auto">
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <span>وضع القراءة</span>
                <span>{darkMode ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <span>⚙️</span>
                <span>إعدادات الربط السحابي ومفاتيح API</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
