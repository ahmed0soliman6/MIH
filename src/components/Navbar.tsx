import React, { useState } from 'react';
import { Policy, CategoryKey } from '../types';
import { CATEGORY_META } from '../data/meta';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';

export type TabType = 'home' | 'policies' | 'bundles' | 'architecture' | 'admin';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedCategory?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeReadingPolicy?: Policy | null;
  onBackFromReading?: () => void;
  onToggleSidebar?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lang?: Language;
  onToggleLanguage?: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  selectedCategory = 'ALL',
  searchQuery = '',
  onSearchChange,
  activeReadingPolicy,
  onBackFromReading,
  onToggleSidebar,
  darkMode,
  onToggleDarkMode,
  lang = 'ar',
  onToggleLanguage,
  onOpenSettings,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  // Determine the active section icon and title for the top header
  const getActiveSectionInfo = () => {
    if (activeReadingPolicy) {
      return {
        icon: '📄',
        title: activeReadingPolicy.title,
        subtitle: `${activeReadingPolicy.code} • ${activeReadingPolicy.dept}`,
        code: activeReadingPolicy.code,
      };
    }

    if (currentTab === 'bundles') {
      return {
        icon: '📋',
        title: isEn ? 'Infection Control & Care Bundles' : 'حزم مكافحة العدوى والوقاية',
        subtitle: isEn ? 'Clinical Care Bundles' : 'قوائم التحقق الإكلينيكية (5 حزم)',
      };
    }

    if (currentTab === 'admin') {
      return {
        icon: '⚡',
        title: isEn ? 'Admin & Quality Control Panel' : 'لوحة الإدارة وضبط الجودة',
        subtitle: isEn ? 'Management & Cloud Publishing' : 'إدارة السياسات والنشر السحابي',
      };
    }

    if (currentTab === 'architecture') {
      return {
        icon: '🏛️',
        title: isEn ? 'Accreditation Standards & Architecture' : 'معايير وبنية النظام',
        subtitle: isEn ? 'GAHAR Quality Architecture' : 'المعايير الوطنية المعتمدة',
      };
    }

    if (currentTab === 'policies') {
      if (selectedCategory === 'BOOKMARKS') {
        return {
          icon: '❤️',
          title: isEn ? 'My Bookmarked Policies' : 'مفضلاتي (السياسات المحفوظة)',
          subtitle: isEn ? 'Quick Access Saved List' : 'قائمة السياسات المحفوظة للوصول السريع',
        };
      }

      if (selectedCategory && selectedCategory !== 'ALL') {
        const catKey = selectedCategory as CategoryKey;
        const meta = CATEGORY_META[catKey];
        const catTrans = CATEGORY_TRANSLATIONS[lang]?.[catKey];
        const name = catTrans ? catTrans.name : (meta ? meta.name : selectedCategory);
        const icon = meta?.icon || '📁';
        return {
          icon,
          title: name,
          subtitle: meta?.desc || `${catKey} Quality Standard`,
        };
      }

      return {
        icon: '📚',
        title: isEn ? 'Accredited Policies Library' : 'مكتبة السياسات المعتمدة',
        subtitle: isEn ? 'All Hospital Clinical Policies' : 'جميع سياسات ولوائح المستشفى المعتمدة',
      };
    }

    // Default Home
    return {
      icon: '🏥',
      title: t.hospitalName,
      subtitle: isEn ? 'Comprehensive Quality Manual' : 'الدليل الشامل لسياسات الجودة وسلامة المرضى',
    };
  };

  const sectionInfo = getActiveSectionInfo();

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-xs no-print transition-colors">
        <div className="w-full px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Start Section (Right in RTL): Hamburger Toggle + Back Button + Active Section Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-initial">
            {/* Sidebar Toggle Button (Mobile & Desktop) */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-800 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
              aria-label={t.deptGuide}
              title={isEn ? 'Toggle Categories Sidebar' : 'فتح/إغلاق قائمة الأقسام والمعايير'}
            >
              <svg className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="hidden xl:inline text-xs font-black tracking-tight">{isEn ? 'Categories' : 'الأقسام'}</span>
            </button>

            {/* Back Button (shown if reading a policy or not on home) */}
            {(activeReadingPolicy || currentTab !== 'home') && (
              <button
                type="button"
                onClick={() => {
                  if (activeReadingPolicy && onBackFromReading) {
                    onBackFromReading();
                  } else {
                    onTabChange('home');
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xs flex items-center gap-1 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 active:scale-95"
                title={t.backBtn}
                aria-label={t.backBtn}
              >
                <span className="text-sm font-black">{isEn ? '←' : '←'}</span>
                <span className="hidden sm:inline">{t.backBtn}</span>
              </button>
            )}

            {/* Active Section / Department Title Display */}
            {activeReadingPolicy ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-black px-2 py-0.5 rounded bg-teal-700 text-white shrink-0 font-mono">
                  {sectionInfo.code}
                </span>
                <div className="min-w-0">
                  <h1
                    className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate"
                    title={sectionInfo.title}
                  >
                    {sectionInfo.title}
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {sectionInfo.subtitle}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer select-none min-w-0 group"
                onClick={() => onTabChange('home')}
                title={isEn ? 'Return to Home Overview' : 'الرئيسية • مستشفى المنصورة الدولي'}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800/80 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition">
                  {sectionInfo.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-teal-700 dark:group-hover:text-teal-300 transition">
                      {sectionInfo.title}
                    </h1>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 shrink-0 font-mono">
                      MIH
                    </span>
                  </div>
                  {sectionInfo.subtitle && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate hidden sm:block">
                      {sectionInfo.subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center Section: Large Search Bar for Desktop */}
          {onSearchChange && (
            <div className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6 min-w-0">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={isEn ? 'Search by title, code, procedure or keyword...' : 'ابحث برقم السياسة، الكود، اسم الإجراء أو الكلمات المفتاحية...'}
                  className={`w-full ${isEn ? 'pl-9 pr-9' : 'pr-9 pl-9'} py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition shadow-2xs`}
                />
                <span className={`absolute ${isEn ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none`}>
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className={`absolute ${isEn ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-0.5 rounded-full`}
                    title={isEn ? 'Clear' : 'مسح البحث'}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* End Section (Left in RTL): Mobile Search Icon + Dark Mode + Language + Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search Icon on Mobile */}
            {onSearchChange && (
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                className={`p-2 rounded-xl transition cursor-pointer border md:hidden ${
                  isMobileSearchOpen || searchQuery
                    ? 'bg-teal-700 text-white border-teal-600'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title={isEn ? 'Search policies' : 'البحث عن سياسة'}
                aria-label="Search"
              >
                <span className="text-sm">🔍</span>
              </button>
            )}

            {/* Language Switcher */}
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                className="px-2 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1 active:scale-95"
                title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
              >
                <span>🌐</span>
                <span className="font-mono text-[11px] font-black">{isEn ? 'عربي' : 'EN'}</span>
              </button>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`p-2 rounded-xl transition cursor-pointer border active:scale-95 ${
                darkMode
                  ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={darkMode ? (isEn ? 'Light Mode' : 'الوضع النهاري') : (isEn ? 'Dark Mode' : 'الوضع الليلي')}
              aria-label="Toggle theme"
            >
              <span className="text-sm">{darkMode ? '☀️' : '🌙'}</span>
            </button>

            {/* Settings (if provided) */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
                title={isEn ? 'Settings' : 'الإعدادات'}
              >
                <span className="text-sm">⚙️</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar Drawer (Shown when search icon is clicked on mobile) */}
        {isMobileSearchOpen && onSearchChange && (
          <div className="md:hidden px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={isEn ? 'Search policies...' : 'ابحث باسم السياسة أو الكود...'}
                  className={`w-full ${isEn ? 'pl-8 pr-8' : 'pr-8 pl-8'} py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-600 outline-none shadow-2xs`}
                />
                <span className={`absolute ${isEn ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-slate-400 text-xs`}>
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className={`absolute ${isEn ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-slate-400 text-xs`}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="px-2.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
