import React, { useState } from 'react';
import { Policy, AuthUser } from '../types';

export type TabType = 'home' | 'policies' | 'bundles' | 'architecture' | 'admin';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  policiesCount: number;
  bundlesCount: number;
  isFirebaseConnected: boolean;
  currentUser: AuthUser | null;
  isAuthorizedAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeReadingPolicy?: Policy | null;
  onBackFromReading?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  policiesCount,
  bundlesCount,
  currentUser,
  isAuthorizedAdmin,
  onLogin,
  onLogout,
  darkMode,
  onToggleDarkMode,
  activeReadingPolicy,
  onBackFromReading,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-sm no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          
          {/* Right Section: Mobile Hamburger (Strictly Right in RTL) + Hospital Brand or Policy Title */}
          <div className="flex items-center gap-2.5 min-w-0 max-w-[70%] sm:max-w-[65%] md:max-w-none">
            {/* Mobile Hamburger Button (Strictly on the right side for RTL) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
              aria-label="فتح القائمة الرئيسية"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dynamic Header Display: Policy Title OR Hospital Brand */}
            {activeReadingPolicy ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onBackFromReading}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 font-bold text-xs flex items-center gap-1 transition shrink-0 cursor-pointer border border-teal-200 dark:border-teal-800"
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
                className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none min-w-0"
                onClick={() => handleTabClick('home')}
              >
                <img
                  src="/assets/logo.jpg"
                  alt="شعار مستشفى المنصورة الدولي"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm bg-white shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                      مستشفى المنصورة الدولي
                    </h1>
                    <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 shrink-0">
                      MIH
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate hidden xs:block">
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

          {/* Left Actions in Header (Night mode removed as requested) */}
          <div className="flex items-center gap-2">
            {/* Desktop Admin Login Button */}
            <div className="hidden sm:flex items-center">
              {currentUser && isAuthorizedAdmin ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 px-2.5 rounded-xl">
                  <img
                    className="w-5 h-5 rounded-full border border-teal-500 object-cover"
                    src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                    alt="avatar"
                  />
                  <span className="font-bold text-xs text-slate-900 dark:text-white max-w-[120px] truncate">
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
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>دخول الإدارة</span>
                </button>
              )}
            </div>

            {/* Mobile Simple Google Sign-In or Avatar on Left */}
            <div className="flex sm:hidden items-center">
              {currentUser && isAuthorizedAdmin ? (
                <button
                  type="button"
                  onClick={() => handleTabClick('admin')}
                  className="flex items-center gap-1.5 p-1 px-2 rounded-xl bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-xs font-bold text-teal-800 dark:text-teal-300"
                >
                  <img
                    className="w-5 h-5 rounded-full object-cover"
                    src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                    alt="avatar"
                  />
                  <span>لوحة الإدارة</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="p-2 rounded-xl bg-teal-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  title="تسجيل الدخول بحساب Google"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>دخول</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay & Drawer (STRICTLY ON THE RIGHT SIDE FOR ARABIC RTL) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" dir="rtl">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer anchored strictly to the RIGHT */}
          <div className="fixed inset-y-0 right-0 w-72 sm:w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-5 space-y-4 overflow-y-auto custom-scroll border-l border-slate-200 dark:border-slate-800 z-10 transition-transform">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/logo.jpg"
                  alt="logo"
                  className="w-8 h-8 object-contain rounded-lg p-0.5 bg-white border border-slate-200"
                />
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
                aria-label="إغلاق القائمة"
              >
                ✕
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex flex-col space-y-1 py-1">
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
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
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
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
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

            {/* Bottom Controls in Sidebar: Simple Google Sign-in & Theme toggle (No API Keys modal) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 mt-auto">
              {/* Optional Dark Mode toggle for readers */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <span>مظهر القراءة</span>
                <span className="text-[11px] font-extrabold">{darkMode ? '☀️ الوضع الفاتح' : '🌙 الوضع الليلي'}</span>
              </button>

              {/* Simple Google Login Button at bottom without explanations */}
              {currentUser && isAuthorizedAdmin ? (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        className="w-6 h-6 rounded-full border border-teal-500 object-cover shrink-0"
                        src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                        alt="avatar"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.displayName || currentUser.email}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                      مدير
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold text-xs transition cursor-pointer text-center"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>تسجيل الدخول بحساب Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
