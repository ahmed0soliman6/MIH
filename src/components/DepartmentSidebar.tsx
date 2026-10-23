import React, { useMemo, useEffect } from 'react';
import { Policy, CategoryKey, AuthUser } from '../types';
import { CATEGORY_META } from '../data/meta';
import { TabType } from './Navbar';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';

interface DepartmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  policies: Policy[];
  bundlesCount?: number;
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
  onOpenBookmarks?: () => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  isOpen,
  onClose,
  policies,
  bundlesCount = 5,
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
  onOpenBookmarks,
}) => {
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
    policies.forEach((p) => {
      const cat = p.category || 'QPI';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [policies]);

  // Standard category order matching hospital quality structure
  const categoriesOrder: CategoryKey[] = [
    'NSR', 'IPC', 'MMS', 'QPI', 'FMS', 'ER', 'ICD', 'PCC', 'IMT', 'ACT', 'SAS', 'WFM'
  ];

  const handleBookmarksClick = () => {
    if (onSelectCategory) {
      onSelectCategory('BOOKMARKS');
    } else if (onOpenBookmarks) {
      onOpenBookmarks();
    }
  };

  const renderSidebarContent = (isMobileView = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 select-none">
      
      {/* 1. Hospital Identity Header: Logo + Hospital Name (Always at top of sidebar) */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-2.5 shrink-0">
        <div
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          onClick={() => {
            if (onNavigateTab) onNavigateTab('home');
            if (onSelectCategory) onSelectCategory('ALL');
            if (isMobileView) onClose();
          }}
          title={isEn ? 'Mansoura International Hospital' : 'مستشفى المنصورة الدولي'}
        >
          {/* Hospital Logo Emblem */}
          <img
            src="/assets/logo.jpg"
            alt={isEn ? 'Mansoura International Hospital' : 'مستشفى المنصورة الدولي'}
            className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border border-teal-600/30 dark:border-teal-400/30 shadow-xs shrink-0 select-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=MIH&background=0f766e&color=fff&size=80';
            }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate leading-tight tracking-tight">
              {isEn ? 'Mansoura Int. Hospital' : 'مستشفى المنصورة الدولي'}
            </h1>
            <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400 truncate mt-0.5">
              {isEn ? 'Specialized Medical Centers' : 'أمانة المراكز الطبية المتخصصة'}
            </p>
          </div>
        </div>

        {isMobileView && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition cursor-pointer active:scale-95 shrink-0"
            title={t.close}
            aria-label={t.close}
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Top Action Buttons: Bookmarks (مفضلاتي) + Admin (لوحة الإدارة if authorized) + Home Button */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* زر مفضلاتي - يظهر لجميع المستخدمين */}
          <button
            type="button"
            onClick={() => {
              handleBookmarksClick();
              if (isMobileView) onClose();
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border shadow-2xs active:scale-95 ${
              selectedCategory === 'BOOKMARKS'
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
            title={t.bookmarks}
          >
            <span className="text-sm">❤️</span>
            <span>{isEn ? 'Bookmarks' : 'مفضلاتي'}</span>
            {bookmarkedIds.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  selectedCategory === 'BOOKMARKS'
                    ? 'bg-white text-rose-700'
                    : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                }`}
              >
                {bookmarkedIds.length}
              </span>
            )}
          </button>

          {/* زر لوحة الإدارة - يظهر فقط في حالة كان المستخدم مسجل دخول كمدير مصرح */}
          {currentUser && isAuthorizedAdmin && onNavigateTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateTab('admin');
                if (isMobileView) onClose();
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border active:scale-95 ${
                currentTab === 'admin'
                  ? 'bg-red-800 text-white border-red-900 shadow-xs'
                  : 'bg-red-700 hover:bg-red-800 text-white border-red-800'
              }`}
              title={t.navAdmin}
            >
              <span>⚡</span>
              <span>{isEn ? 'Admin' : 'لوحة الإدارة'}</span>
            </button>
          )}
        </div>

      </div>

      {/* 3. Section Title: أقسام ومعايير الجودة */}
      <div className="px-3.5 pt-3 pb-1 flex items-center justify-between text-slate-500 dark:text-slate-400 shrink-0">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span>📂</span>
          <span>{isEn ? 'Quality Standards & Depts' : 'أقسام ومعايير الجودة'}</span>
        </h3>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {policies.length} {isEn ? 'policies' : 'سياسة'}
        </span>
      </div>

      {/* 4. Scrollable Categories List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scroll">
        
        {/* Item 4.1: جميع السياسات المعتمدة (الكل) */}
        <div
          onClick={() => {
            if (onNavigateTab) onNavigateTab('policies');
            if (onSelectCategory) onSelectCategory('ALL');
            if (isMobileView) onClose();
          }}
          className={`w-full p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs group select-none ${
            currentTab === 'policies' && selectedCategory === 'ALL'
              ? 'bg-teal-700 text-white border-teal-800 dark:border-teal-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-teal-50/80 dark:hover:bg-teal-950/60 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition ${
                currentTab === 'policies' && selectedCategory === 'ALL'
                  ? 'bg-teal-800 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:scale-105'
              }`}
            >
              📚
            </div>
            <div className="min-w-0 truncate">
              <span
                className={`font-black text-xs block truncate leading-tight ${
                  currentTab === 'policies' && selectedCategory === 'ALL'
                    ? 'text-white'
                    : 'text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300'
                }`}
              >
                {isEn ? 'All Accredited Policies' : 'جميع السياسات المعتمدة (الكل)'}
              </span>
              <span
                className={`text-[10px] font-semibold block mt-0.5 ${
                  currentTab === 'policies' && selectedCategory === 'ALL'
                    ? 'text-teal-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {isEn ? 'Comprehensive Directory' : 'الدليل الشامل للسياسات'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                currentTab === 'policies' && selectedCategory === 'ALL'
                  ? 'bg-teal-800 text-teal-100'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {policies.length}
            </span>
          </div>
        </div>

        {/* Item 4.2: حزم مكافحة العدوى والوقاية (Clinical Care Bundles) */}
        <div
          onClick={() => {
            if (onNavigateTab) onNavigateTab('bundles');
            if (isMobileView) onClose();
          }}
          className={`w-full p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs group select-none ${
            currentTab === 'bundles'
              ? 'bg-teal-700 text-white border-teal-800 dark:border-teal-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition ${
                currentTab === 'bundles'
                  ? 'bg-teal-800 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 group-hover:scale-105'
              }`}
            >
              📋
            </div>
            <div className="min-w-0 truncate">
              <span
                className={`font-black text-xs block truncate leading-tight ${
                  currentTab === 'bundles'
                    ? 'text-white'
                    : 'text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                }`}
              >
                {isEn ? 'Infection Control Bundles' : 'حزم مكافحة العدوى والوقاية'}
              </span>
              <span
                className={`text-[10px] font-semibold block mt-0.5 ${
                  currentTab === 'bundles'
                    ? 'text-teal-100'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {isEn ? 'CLABSI, VAP, CAUTI, SSI, Sepsis' : 'قوائم تدقيق الحزم الإكلينيكية'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                currentTab === 'bundles'
                  ? 'bg-teal-800 text-teal-100'
                  : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              {bundlesCount}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="pt-1.5 pb-0.5 px-2">
          <div className="h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Item 4.3: The 12 Hospital Quality Departments & Standards */}
        {categoriesOrder.map((catKey) => {
          const meta = CATEGORY_META[catKey] || CATEGORY_META.QPI;
          const catTrans = CATEGORY_TRANSLATIONS[lang]?.[catKey] || {
            name: meta.name,
            desc: meta.desc,
          };
          const catPolicies = groupedPolicies[catKey] || [];
          const isSelected = currentTab === 'policies' && selectedCategory === catKey;

          return (
            <div
              key={catKey}
              onClick={() => {
                if (onNavigateTab) onNavigateTab('policies');
                if (onSelectCategory) onSelectCategory(catKey);
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

      {/* 5. Bottom Controls: Login/Logout + Language + Dark Mode in the SAME ROW */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Login / Logout */}
          {currentUser && isAuthorizedAdmin ? (
            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout();
                if (isMobileView) onClose();
              }}
              className="flex-1 min-w-0 py-2 px-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/80 dark:hover:bg-red-900 dark:text-red-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 border border-red-200 dark:border-red-900 active:scale-95 shadow-2xs"
              title={`${currentUser.displayName || currentUser.email} - ${t.logout}`}
            >
              <span>🚪</span>
              <span className="truncate">{t.logout}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onLogin) onLogin();
                if (isMobileView) onClose();
              }}
              className="flex-1 min-w-0 py-2 px-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              title={t.adminLogin}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
              <span className="truncate">{isEn ? 'Admin' : 'دخول'}</span>
            </button>
          )}

          {/* Language Toggle */}
          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              className={`flex-1 min-w-0 py-2 px-1.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer border active:scale-95 shadow-2xs ${
                isEn
                  ? 'bg-teal-700 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700'
              }`}
              title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
            >
              <span>🌐</span>
              <span className="font-mono text-xs font-black truncate">{isEn ? 'عربي' : 'English'}</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`flex-1 min-w-0 py-2 px-1.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer border active:scale-95 shadow-2xs ${
                darkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={
                darkMode
                  ? isEn
                    ? 'Switch to Light Mode'
                    : 'تفعيل الوضع النهاري'
                  : isEn
                  ? 'Switch to Night Mode'
                  : 'تفعيل الوضع الليلي'
              }
            >
              <span>{darkMode ? '☀️' : '🌙'}</span>
              <span className="text-xs font-black truncate">
                {darkMode ? (isEn ? 'Light' : 'نهاري') : isEn ? 'Dark' : 'ليلي'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* A. Permanent Full-Page Desktop Sidebar (Always Visible on screens >= lg) */}
      <aside
        className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-0 h-screen border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-30 transition-colors"
        dir={isEn ? 'ltr' : 'rtl'}
        aria-label="قائمة أقسام ومعايير الجودة"
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
            className={`fixed inset-y-0 ${
              isEn ? 'left-0 border-r' : 'right-0 border-l'
            } z-50 w-80 sm:w-88 max-w-[85vw] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out`}
            dir={isEn ? 'ltr' : 'rtl'}
          >
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
