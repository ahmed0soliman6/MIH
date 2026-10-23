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
  lang?: Language;
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
  lang = 'ar',
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
      };
    }

    if (currentTab === 'bundles') {
      return {
        icon: '📋',
        title: isEn ? 'Infection Control Bundles' : 'حزم مكافحة العدوى والوقاية',
      };
    }

    if (currentTab === 'admin') {
      return {
        icon: '⚡',
        title: isEn ? 'Admin Panel' : 'لوحة الإدارة',
      };
    }

    if (currentTab === 'architecture') {
      return {
        icon: '🏛️',
        title: isEn ? 'Standards & Architecture' : 'معايير وبنية النظام',
      };
    }

    if (currentTab === 'policies') {
      if (selectedCategory === 'BOOKMARKS') {
        return {
          icon: '❤️',
          title: isEn ? 'My Bookmarks' : 'مفضلاتي',
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
        };
      }

      return {
        icon: '📚',
        title: isEn ? 'All Policies' : 'جميع السياسات المعتمدة',
      };
    }

    // Default Home
    return {
      icon: '🏥',
      title: t.hospitalName,
    };
  };

  const sectionInfo = getActiveSectionInfo();

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-xs no-print transition-colors">
        <div className="w-full px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Start Section (Right in RTL): Hamburger Toggle + Back Button + Active Section Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Sidebar Toggle Button */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-800 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center shadow-2xs active:scale-95"
              aria-label={t.deptGuide}
              title={isEn ? 'Toggle Menu' : 'فتح/إغلاق القائمة الجانبية'}
            >
              <svg className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
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

            {/* Active Section / Page Title Only */}
            <div
              className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none"
              onClick={() => {
                if (currentTab !== 'home') onTabChange('home');
              }}
              title={isEn ? 'Current Section' : 'القسم المفتوح حالياً'}
            >
              <span className="text-base shrink-0">{sectionInfo.icon}</span>
              <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white truncate">
                {sectionInfo.title}
              </h1>
            </div>
          </div>

          {/* End Section: ONLY Search Icon on Mobile / Search Bar on Desktop */}
          {onSearchChange && (
            <div className="flex items-center shrink-0">
              {/* Desktop Search Bar */}
              <div className="hidden md:flex relative w-64 lg:w-88">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={isEn ? 'Search policies...' : 'ابحث عن أي سياسة...'}
                  className={`w-full ${isEn ? 'pl-8 pr-8' : 'pr-8 pl-8'} py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none transition`}
                />
                <span className={`absolute ${isEn ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none`}>
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className={`absolute ${isEn ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer`}
                    title="مسح"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Mobile Search Icon Button */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                className={`p-2 rounded-xl transition cursor-pointer border md:hidden active:scale-95 ${
                  isMobileSearchOpen || searchQuery
                    ? 'bg-teal-700 text-white border-teal-600'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title={isEn ? 'Search policies' : 'البحث عن سياسة'}
                aria-label="Search"
              >
                <span className="text-base leading-none">🔍</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Search Bar Dropdown (Toggled only when search icon is clicked) */}
        {isMobileSearchOpen && onSearchChange && (
          <div className="md:hidden px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={isEn ? 'Search policies...' : 'ابحث برقم السياسة أو الكود...'}
                  className={`w-full ${isEn ? 'pl-8 pr-8' : 'pr-8 pl-8'} py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-600 outline-none`}
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
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
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
