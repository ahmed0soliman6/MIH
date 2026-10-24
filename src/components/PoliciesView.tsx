import React, { useMemo, useState, useEffect, useRef, useDeferredValue } from 'react';
import { Policy, CategoryKey } from '../types';
import { CATEGORY_META } from '../data/meta';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';
import { normalizeArabic } from '../utils/arabic';
import { PolicyCard } from './PolicyCard';

interface PoliciesViewProps {
  policies: Policy[];
  searchQuery: string;
  selectedCategory: string;
  isAuthorizedAdmin: boolean;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onOpenDocument: (policy: Policy) => void;
  onOpenPresentation: (policy: Policy) => void;
  onEditPolicy: (policy: Policy) => void;
  onDeletePolicy: (policyId: string) => void;
  onAddPolicy: () => void;
  lang?: Language;
  bookmarkedIds?: string[];
  onToggleBookmark?: (policyId: string) => void;
  searchTexts?: Record<string, string>;
  isLoading?: boolean;
}

interface QuickChip {
  id: string;
  label: string;
  labelEn: string;
  categoryFilter?: string;
  keywordFilter?: string;
}

const EMERGENCY_CHIPS: QuickChip[] = [
  { id: 'ALL', label: '🌐 الكل', labelEn: '🌐 All Policies', categoryFilter: 'ALL' },
  { id: 'EMERGENCY', label: '🚨 الكود الأزرق والطوارئ', labelEn: '🚨 Code Blue & Emergency', categoryFilter: 'ER', keywordFilter: 'انعاش طوارئ ازرق blue cpr' },
  { id: 'BUNDLES', label: '🩺 حزم الرعاية الإكلينيكية (Bundles)', labelEn: '🩺 Clinical Bundles', keywordFilter: 'حزمة حزم bundle clabsi cauti vap ssi' },
  { id: 'IPC', label: '🛡️ مكافحة العدوى IPC', labelEn: '🛡️ Infection Control IPC', categoryFilter: 'IPC' },
  { id: 'MMS', label: '💊 الأدوية عالية الخطورة MMS', labelEn: '💊 High-Alert Meds MMS', categoryFilter: 'MMS' },
  { id: 'NSR', label: '📋 المعايير الوطنية للسلامة NSR', labelEn: '📋 National Safety NSR', categoryFilter: 'NSR' },
];

export const PoliciesView: React.FC<PoliciesViewProps> = ({
  policies,
  searchQuery,
  selectedCategory,
  isAuthorizedAdmin,
  onSearchChange,
  onCategoryChange,
  onOpenDocument,
  onOpenPresentation,
  onEditPolicy,
  onDeletePolicy,
  onAddPolicy,
  lang = 'ar',
  bookmarkedIds = [],
  onToggleBookmark,
  isLoading = false,
}) => {
  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  const [activeChipId, setActiveChipId] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = useMemo(() => normalizeArabic(deferredSearchQuery.trim()), [deferredSearchQuery]);
  const queryTokens = useMemo(() => normalizedQuery.split(/\s+/).filter(Boolean), [normalizedQuery]);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(24);
  }, [deferredSearchQuery, selectedCategory, activeChipId]);

  // بناء فهرس بحث مُطبَّع شامل لكافة الحقول (عنوان، كود، قسم، غرض، نص، أقسام مستهدفة)
  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    policies.forEach((p) => {
      const combined = [
        p.title,
        p.code,
        p.dept,
        p.target_departments,
        p.category,
        p.purpose,
        p.plain_text,
        p.summary,
        p.effectiveDate,
        Array.isArray(p.responsibilities) ? p.responsibilities.join(' ') : p.responsibilities,
      ]
        .filter(Boolean)
        .join(' ');
      map.set(p.id, normalizeArabic(combined));
    });
    return map;
  }, [policies]);

  const isBookmarksCategory = selectedCategory === 'BOOKMARKS';

  // معالجة الضغط على شرائح الوصول السريع للطوارئ
  const handleChipClick = (chip: QuickChip) => {
    setActiveChipId(chip.id);
    if (chip.categoryFilter) {
      onCategoryChange(chip.categoryFilter);
    } else {
      onCategoryChange('ALL');
    }
  };

  const filtered = useMemo(() => {
    const activeChip = EMERGENCY_CHIPS.find((c) => c.id === activeChipId);
    const chipKeywords = activeChip?.keywordFilter
      ? normalizeArabic(activeChip.keywordFilter).split(/\s+/).filter(Boolean)
      : [];

    return policies.filter((p) => {
      const isFav = bookmarkedIds.includes(p.id);
      if (isBookmarksCategory && !isFav) return false;

      // فحص التصنيف
      let matchCategory =
        selectedCategory === 'ALL' ||
        selectedCategory === 'BOOKMARKS' ||
        p.category === selectedCategory;

      const indexedText = searchIndex.get(p.id) || '';

      // فحص شريحة الطوارئ النشطة إذا كانت تعتمد على الكلمات المفتاحية مثل Bundles
      if (activeChipId === 'BUNDLES' && chipKeywords.length > 0) {
        const matchesAnyKeyword = chipKeywords.some((kw) => indexedText.includes(kw));
        if (!matchesAnyKeyword) return false;
      } else if (activeChipId === 'EMERGENCY') {
        const isErCat = p.category === 'ER';
        const matchesEmergencyKw = chipKeywords.some((kw) => indexedText.includes(kw));
        if (!isErCat && !matchesEmergencyKw) return false;
      } else if (activeChip?.categoryFilter && activeChip.categoryFilter !== 'ALL') {
        if (p.category !== activeChip.categoryFilter) return false;
      }

      // فحص كلمات البحث (تطبيع عربي متعدد الكلمات: أ/إ/آ/ا ، ة/ه ، ى/ي ، والتشكيل)
      const matchQuery =
        queryTokens.length === 0 ||
        queryTokens.every((token) => indexedText.includes(token));

      return matchCategory && matchQuery;
    });
  }, [
    policies,
    isBookmarksCategory,
    bookmarkedIds,
    selectedCategory,
    queryTokens,
    searchIndex,
    activeChipId,
  ]);

  // Sentinel IntersectionObserver for progressive +24 loading
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 24, filtered.length));
        }
      },
      { rootMargin: '600px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visiblePolicies = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  return (
    <section className="space-y-4 select-none">
      {/* Quick Access Emergency Chips Bar (Top of policy library as compact scrollable chips) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1 pt-0.5 no-scrollbar">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 shrink-0 px-2 flex items-center gap-1">
            <span>⚡</span>
            <span className="hidden sm:inline">{isEn ? 'Quick Filter:' : 'الوصول السريع:'}</span>
          </span>
          {EMERGENCY_CHIPS.map((chip) => {
            const isSelected = activeChipId === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-95 flex items-center gap-1.5 shadow-2xs ${
                  isSelected
                    ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-600 dark:border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{isEn ? chip.labelEn : chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle Admin Action Bar (only if authorized admin) */}
      {isAuthorizedAdmin && (
        <div className="flex justify-between items-center gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            {isEn ? 'Total Policies Shown:' : 'إجمالي السياسات المعروضة:'}{' '}
            <span className="text-teal-700 dark:text-teal-400 font-black font-mono">
              {filtered.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onAddPolicy}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <span>➕</span>
            <span>{isEn ? 'Add New Clinical Policy' : 'إضافة سياسة جديدة'}</span>
          </button>
        </div>
      )}

      {/* Skeleton Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-28 h-5 skeleton" />
                <div className="w-16 h-4 skeleton" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="w-5/6 h-5 skeleton" />
                <div className="w-1/2 h-5 skeleton" />
              </div>
              <div className="w-full h-12 skeleton" />
              <div className="w-full h-8 skeleton" />
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                <div className="flex-1 h-9 skeleton" />
                <div className="w-20 h-9 skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        isBookmarksCategory ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-950/60 p-12 text-center space-y-4 shadow-xs transition-colors">
            <span className="text-5xl block">❤️</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.noBookmarks}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {t.noBookmarksDesc}
            </p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onCategoryChange('ALL');
                setActiveChipId('ALL');
              }}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              {isEn ? 'Browse All Policies' : 'تصفح جميع السياسات وحفظ ما تحتاجه'}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-xs transition-colors">
            <span className="text-4xl">🔍</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {isEn ? 'No policies found matching current search filters' : 'لا توجد سياسات مطابقة لمعايير البحث الحالية'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Try different keywords or select "All Standards" to view all hospital policies.'
                : 'جرب البحث بكلمات أخرى أو اختر "جميع الأقسام" لعرض المكتبة الكاملة.'}
            </p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onCategoryChange('ALL');
                setActiveChipId('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
            >
              {isEn ? 'Show All Policies' : 'إظهار جميع السياسات'}
            </button>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visiblePolicies.map((p, idx) => (
              <PolicyCard
                key={p.id}
                policy={p}
                lang={lang}
                isAuthorizedAdmin={isAuthorizedAdmin}
                isFav={bookmarkedIds.includes(p.id)}
                index={idx}
                onOpenDocument={onOpenDocument}
                onOpenPresentation={onOpenPresentation}
                onEditPolicy={onEditPolicy}
                onDeletePolicy={onDeletePolicy}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>

          {/* Progressive Loading Sentinel & Fallback "Show All" */}
          {visibleCount < filtered.length && (
            <div className="pt-6 pb-2 flex flex-col items-center gap-3">
              <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setVisibleCount(filtered.length)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
              >
                {isEn ? `Show All Policies (${filtered.length})` : `عرض الكل (${filtered.length} سياسة)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
