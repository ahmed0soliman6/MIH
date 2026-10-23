import React, { useState } from 'react';
import { Policy, AuthUser } from '../types';
import { Language, UI_STRINGS } from '../utils/translations';

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
  onOpenSettings?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeReadingPolicy?: Policy | null;
  onBackFromReading?: () => void;
  onToggleSidebar?: () => void;
  lang?: Language;
  onToggleLanguage?: () => void;
  bookmarksCount?: number;
  onOpenBookmarks?: () => void;
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
  onToggleSidebar,
  lang = 'ar',
  onToggleLanguage,
  bookmarksCount = 0,
  onOpenBookmarks,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-xs no-print transition-colors">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2 flex items-center justify-between gap-3">
          
          {/* Left / Start Section: Hamburger Toggle + Back Button + Active Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Sidebar Toggle Button (Opens mobile drawer or toggles sidebar focus) */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-800 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95 lg:hidden"
              aria-label={t.deptGuide}
              title={t.deptGuide}
            >
              <svg className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline text-xs font-black tracking-tight">{t.deptGuide}</span>
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                if (activeReadingPolicy && onBackFromReading) {
                  onBackFromReading();
                } else if (currentTab !== 'home') {
                  handleTabClick('home');
                } else if (window.history.length > 1) {
                  window.history.back();
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 active:scale-95"
              title={t.backBtn}
              aria-label={t.backBtn}
            >
              <span className="text-sm font-black">{isEn ? '←' : '←'}</span>
              <span className="hidden sm:inline">{t.backBtn}</span>
            </button>

            {/* Title Display */}
            {activeReadingPolicy ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-black px-2 py-0.5 rounded bg-teal-700 text-white shrink-0 font-mono">
                  {activeReadingPolicy.code}
                </span>

                <div className="min-w-0">
                  <h1
                    className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate"
                    title={activeReadingPolicy.title}
                  >
                    {activeReadingPolicy.title}
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {activeReadingPolicy.dept}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer select-none min-w-0"
                onClick={() => handleTabClick('home')}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {t.hospitalName}
                    </h1>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 shrink-0 font-mono">
                      MIH
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Navigation Links (Clean, un-crowded pills) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 shrink-0" aria-label="Main Navigation">
            <button
              type="button"
              onClick={() => handleTabClick('home')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'home' && !activeReadingPolicy
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              🏠 {t.navHome}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('policies')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentTab === 'policies'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>📚 {t.navPolicies}</span>
              <span className="text-[10px] font-mono opacity-80">({policiesCount})</span>
            </button>

            {onOpenBookmarks && (
              <button
                type="button"
                onClick={onOpenBookmarks}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 whitespace-nowrap"
                title={t.bookmarks}
              >
                <span>❤️</span>
                <span className="hidden xl:inline">{t.bookmarks}</span>
                {bookmarksCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-mono">
                    {bookmarksCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleTabClick('bundles')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentTab === 'bundles' && !activeReadingPolicy
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>📋 {t.navBundles}</span>
              <span className="text-[10px] font-mono opacity-80">({bundlesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('architecture')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'architecture' && !activeReadingPolicy
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              🏛️ {t.navArchitecture}
            </button>

            {isAuthorizedAdmin && (
              <button
                type="button"
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  currentTab === 'admin'
                    ? 'bg-red-800 text-white'
                    : 'bg-red-700 hover:bg-red-800 text-white'
                }`}
              >
                <span>⚡</span>
                <span>{t.navAdmin}</span>
              </button>
            )}
          </nav>

          {/* Right / End Section: Quick User Status / Mobile Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && isAuthorizedAdmin ? (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 px-2.5 rounded-xl">
                <img
                  className="w-5 h-5 rounded-full border border-teal-500 object-cover shrink-0"
                  src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                  alt="avatar"
                />
                <span className="font-bold text-xs text-slate-900 dark:text-white max-w-[110px] truncate hidden xl:inline">
                  {currentUser.displayName || currentUser.email}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  👑
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
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
                <span className="hidden sm:inline">{t.adminLogin}</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Drawer (with full bilingual support) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" dir={isEn ? 'ltr' : 'rtl'}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer anchored strictly based on layout direction */}
          <div className={`fixed inset-y-0 ${isEn ? 'left-0 border-r' : 'right-0 border-l'} w-72 sm:w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-5 space-y-4 overflow-y-auto custom-scroll border-slate-200 dark:border-slate-800 z-10 transition-transform`}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/logo.jpg"
                  alt="logo"
                  className="w-8 h-8 object-contain rounded-lg p-0.5 bg-white border border-slate-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
                  }}
                />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                    {t.hospitalName}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.hospitalSub}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex flex-col space-y-1 py-1">
              <button
                type="button"
                onClick={() => handleTabClick('home')}
                className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                  currentTab === 'home' && !activeReadingPolicy
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏠 {t.navHome}
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('policies')}
                className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${
                  currentTab === 'policies'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>📚 {t.navPolicies}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                  {policiesCount}
                </span>
              </button>

              {onOpenBookmarks && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenBookmarks();
                  }}
                  className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-between text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 cursor-pointer`}
                >
                  <span className="flex items-center gap-2">
                    <span>❤️</span>
                    <span>{t.bookmarks}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 text-[11px] font-mono">
                    {bookmarksCount}
                  </span>
                </button>
              )}

              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onToggleSidebar();
                  }}
                  className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 cursor-pointer`}
                >
                  <span>📂</span>
                  <span>{t.deptGuide}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleTabClick('bundles')}
                className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${
                  currentTab === 'bundles'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>📋 {t.navBundles}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                  {bundlesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('architecture')}
                className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                  currentTab === 'architecture'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏛️ {t.navArchitecture}
              </button>

              {isAuthorizedAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabClick('admin')}
                  className={`w-full ${isEn ? 'text-left' : 'text-right'} px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                    currentTab === 'admin'
                      ? 'bg-red-800 text-white'
                      : 'bg-red-700 hover:bg-red-800 text-white'
                  }`}
                >
                  <span>⚡</span>
                  <span>{t.navAdmin}</span>
                </button>
              )}
            </nav>

            {/* Bottom Controls in Drawer: Coordinated Language & Dark Mode row */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 mt-auto">
              <div className="grid grid-cols-2 gap-2">
                {/* Language Switch */}
                {onToggleLanguage && (
                  <button
                    type="button"
                    onClick={onToggleLanguage}
                    className="py-2 px-3 rounded-xl bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 text-teal-900 dark:text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-teal-200 dark:border-slate-700"
                  >
                    <span>🌐</span>
                    <span>{isEn ? 'عربي' : 'English'}</span>
                  </button>
                )}

                {/* Dark Mode Switch */}
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <span>{darkMode ? '☀️' : '🌙'}</span>
                  <span>{darkMode ? t.lightMode : t.darkMode}</span>
                </button>
              </div>

              {/* Login/Logout in Drawer */}
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
                      {t.adminBadge}
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
                    {t.logout}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
                  <span>{t.adminLogin}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
