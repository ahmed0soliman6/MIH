import React, { useState, useMemo, useEffect } from 'react';
import { Policy, CategoryKey, AuthUser } from '../types';
import { CATEGORY_META } from '../data/meta';
import { TabType } from './Navbar';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';

interface DepartmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  policies: Policy[];
  onSelectPolicy: (policy: Policy) => void;
  onLaunchPresentation?: (policy: Policy) => void;
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string;
  currentTab?: TabType;
  onNavigateTab?: (tab: TabType) => void;
  isAuthorizedAdmin?: boolean;
  currentUser?: AuthUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  lang?: Language;
  onToggleLanguage?: () => void;
  bookmarkedIds?: string[];
  onToggleBookmark?: (policyId: string) => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  isOpen,
  onClose,
  policies,
  onSelectCategory,
  selectedCategory = 'ALL',
  currentTab = 'home',
  onNavigateTab,
  isAuthorizedAdmin = false,
  currentUser = null,
  onLogin,
  onLogout,
  darkMode = false,
  onToggleDarkMode,
  lang = 'ar',
  onToggleLanguage,
  bookmarkedIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  // Lock body scroll only when mobile modal drawer is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Group policies by category key
  const groupedPolicies = useMemo(() => {
    const map: Record<string, Policy[]> = {};
    const lowerSearch = searchTerm.trim().toLowerCase();

    policies.forEach((p) => {
      if (lowerSearch) {
        const matchesTitle = (p.title || '').toLowerCase().includes(lowerSearch);
        const matchesCode = (p.code || '').toLowerCase().includes(lowerSearch);
        const matchesDept = (p.dept || '').toLowerCase().includes(lowerSearch);
        const matchesCat = (p.category || '').toLowerCase().includes(lowerSearch);
        if (!matchesTitle && !matchesCode && !matchesDept && !matchesCat) {
          return;
        }
      }

      const cat = p.category || 'QPI';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });

    return map;
  }, [policies, searchTerm]);

  // Standard category order matching hospital quality structure
  const categoriesOrder: CategoryKey[] = [
    'NSR', 'IPC', 'MMS', 'QPI', 'FMS', 'ER', 'ICD', 'PCC', 'IMT', 'ACT', 'SAS', 'WFM'
  ];

  const renderSidebarContent = (isMobileView = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 select-none">
      
      {/* 1. Header: Hospital Brand & Portal Identity */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/logo.jpg"
            alt={t.hospitalName}
            className="w-10 h-10 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-white shadow-xs shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://ui-avatars.com/api/?name=MIH&background=0f766e&color=fff';
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-tight truncate">
                {t.hospitalName}
              </h3>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 shrink-0 font-mono">
                MIH
              </span>
            </div>
            <p className="text-[11px] text-teal-700 dark:text-teal-400 font-bold truncate mt-0.5">
              {t.deptGuide} ({policies.length} {isEn ? 'Policies' : 'سياسة'})
            </p>
          </div>
        </div>

        {/* Close Button only for mobile drawer view */}
        {isMobileView && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-95 shrink-0"
            title={t.close}
            aria-label={t.close}
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Main Navigation Quick Bar */}
      {onNavigateTab && (
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 flex items-center gap-1 overflow-x-auto custom-scroll shrink-0">
          <button
            type="button"
            onClick={() => {
              onNavigateTab('home');
              if (isMobileView) onClose();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              currentTab === 'home'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950'
            }`}
          >
            🏠 {t.navHome}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateTab('policies');
              if (isMobileView) onClose();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              currentTab === 'policies'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950'
            }`}
          >
            📚 {t.navPolicies}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateTab('bundles');
              if (isMobileView) onClose();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              currentTab === 'bundles'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950'
            }`}
          >
            📋 {t.navBundles}
          </button>

          {isAuthorizedAdmin && (
            <button
              type="button"
              onClick={() => {
                onNavigateTab('admin');
                if (isMobileView) onClose();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-red-800 text-white shadow-2xs'
                  : 'bg-red-700 hover:bg-red-800 text-white'
              }`}
            >
              ⚡ {t.navAdmin}
            </button>
          )}
        </div>
      )}

      {/* 3. Hospital Departments Search & Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>📁</span>
            <span>{t.deptDirectory}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (onSelectCategory) onSelectCategory('ALL');
              if (isMobileView) onClose();
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-teal-50'
            }`}
          >
            {isEn ? 'All (101)' : 'الكل (101)'}
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isEn ? 'Filter departments...' : 'تصفية أقسام المستشفى...'}
            className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={`absolute ${isEn ? 'right-2' : 'left-2'} top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Departments List (أقسام المستشفى الـ 12) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scroll">
        {categoriesOrder.map((catKey) => {
          const meta = CATEGORY_META[catKey] || CATEGORY_META.QPI;
          const catTrans = CATEGORY_TRANSLATIONS[lang]?.[catKey] || {
            name: meta.name,
            desc: meta.desc
          };
          const catPolicies = groupedPolicies[catKey] || [];
          const isSelected = selectedCategory === catKey;

          if (searchTerm && catPolicies.length === 0) {
            return null;
          }

          return (
            <div
              key={catKey}
              onClick={() => {
                if (onSelectCategory) {
                  onSelectCategory(catKey);
                }
                if (isMobileView) onClose();
              }}
              className={`w-full p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs group select-none ${
                isSelected
                  ? 'bg-teal-700 text-white border-teal-800 dark:border-teal-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 hover:bg-teal-50/80 dark:hover:bg-teal-950/60 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition ${
                    isSelected
                      ? 'bg-teal-800 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:scale-105'
                  }`}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0 truncate">
                  <span
                    className={`font-black text-xs block truncate leading-tight ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300'
                    }`}
                  >
                    {catTrans.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold block mt-0.5 ${
                      isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {catKey} • {catPolicies.length} {isEn ? 'Policies' : 'سياسة'}
                  </span>
                </div>
              </div>

              {/* Count Pill */}
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected
                      ? 'bg-teal-800 text-teal-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-teal-100 dark:group-hover:bg-teal-900 group-hover:text-teal-800 dark:group-hover:text-teal-200'
                  }`}
                >
                  {catPolicies.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. User Login / Admin Status Section (تسجيل الدخول / حظر المدير) */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 space-y-2.5 shrink-0">
        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>{isEn ? 'ADMIN & AUTH' : 'تسجيل الدخول والإدارة'}</span>
          {currentUser && isAuthorizedAdmin && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
              <span>👑</span>
              <span>{t.adminBadge}</span>
            </span>
          )}
        </div>

        {currentUser && isAuthorizedAdmin ? (
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <img
                className="w-7 h-7 rounded-full border border-teal-500 object-cover shrink-0"
                src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                alt="avatar"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {currentUser.displayName || currentUser.email}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout();
                if (isMobileView) onClose();
              }}
              className="w-full py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/80 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-bold text-xs transition cursor-pointer text-center border border-red-200 dark:border-red-900"
            >
              {t.logout}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onLogin) onLogin();
              if (isMobileView) onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

        {/* 6. Language Switcher & Dark/Light Mode Switcher Row */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
          {/* Language Toggle */}
          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              className={`py-1.5 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border active:scale-95 ${
                isEn
                  ? 'bg-teal-700 text-white border-teal-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
              }`}
              title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
            >
              <span>🌐</span>
              <span className="font-mono text-[11px] font-black">{isEn ? 'عربي' : 'English'}</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`py-1.5 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border active:scale-95 ${
                darkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={darkMode ? (isEn ? 'Switch to Light Mode' : 'تفعيل الوضع النهاري') : (isEn ? 'Switch to Night Mode' : 'تفعيل الوضع الليلي')}
            >
              <span>{darkMode ? '☀️' : '🌙'}</span>
              <span className="text-[11px] font-black">{darkMode ? (isEn ? 'Light' : 'نهاري') : (isEn ? 'Dark' : 'ليلي')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* A. Permanent Desktop Sidebar (Always Visible on screens >= lg) */}
      <aside
        className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs z-30 transition-colors"
        dir={isEn ? 'ltr' : 'rtl'}
        aria-label={t.deptGuide}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* B. Mobile Slide-Over Drawer (Toggled via Hamburger on smaller screens) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={onClose}
          />

          {/* Mobile Drawer Panel */}
          <div
            className={`fixed inset-y-0 ${isEn ? 'left-0 border-r' : 'right-0 border-l'} z-50 w-80 sm:w-88 max-w-[85vw] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out`}
            dir={isEn ? 'ltr' : 'rtl'}
          >
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

