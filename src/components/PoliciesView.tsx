import React, { useState, useMemo } from 'react';
import { Policy, CategoryKey } from '../types';
import { CATEGORY_META, isManualPolicy } from '../data/meta';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';
import { normalizeArabic } from '../utils/arabic';

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
}

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
}) => {
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BOOKMARKS' | 'MANUAL' | 'CORE'>('ALL');

  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  const bookmarksCount = bookmarkedIds.length;
  const manualPoliciesCount = policies.filter(isManualPolicy).length;
  const corePoliciesCount = policies.length - manualPoliciesCount;

  const normalizedQuery = useMemo(() => normalizeArabic(searchQuery.trim()), [searchQuery]);

  // فهرس بحث مُطبَّع (يُبنى مرة واحدة لكل تغيّر في السياسات وليس مع كل ضغطة مفتاح)
  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    policies.forEach((p) => {
      map.set(p.id, normalizeArabic(`${p.title} ${p.code} ${p.dept} ${p.purpose} ${p.plain_text || ''}`));
    });
    return map;
  }, [policies]);

  const filtered = useMemo(
    () =>
      policies.filter((p) => {
        const isManual = isManualPolicy(p);
        const isFav = bookmarkedIds.includes(p.id);

        if (sourceFilter === 'BOOKMARKS' && !isFav) return false;
        if (sourceFilter === 'MANUAL' && !isManual) return false;
        if (sourceFilter === 'CORE' && isManual) return false;

        const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
        const matchQuery = !normalizedQuery || (searchIndex.get(p.id) || '').includes(normalizedQuery);
        return matchCategory && matchQuery;
      }),
    [policies, sourceFilter, bookmarkedIds, selectedCategory, normalizedQuery, searchIndex]
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isEn ? 'Accredited Quality Policies Library' : 'مكتبة سياسات الجودة المعتمدة'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            {isEn
              ? 'Browse, read, and bookmark accredited clinical policies or launch interactive presentation slides'
              : 'تصفح وقراءة وحفظ السياسات المعتمدة في مفضلتك أو تشغيلها في وضع العرض التقديمي'}
          </p>
        </div>

        {isAuthorizedAdmin && (
          <button
            type="button"
            onClick={onAddPolicy}
            className="self-start sm:self-auto bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <span>➕</span>
            <span>{isEn ? 'Add New Clinical Policy' : 'إضافة سياسة جديدة'}</span>
          </button>
        )}
      </div>

      {/* Source Filters Bar with Bookmarks Tab */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSourceFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            sourceFilter === 'ALL'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          {isEn ? `All Policies (${policies.length})` : `جميع السياسات (${policies.length})`}
        </button>

        {/* Dedicated Bookmarks ("مفضلاتي") Filter Tab */}
        <button
          type="button"
          onClick={() => setSourceFilter('BOOKMARKS')}
          className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            sourceFilter === 'BOOKMARKS'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          <span>❤️</span>
          <span>{t.bookmarksFilterTab} ({bookmarksCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('MANUAL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            sourceFilter === 'MANUAL'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          📖 {isEn ? `Comprehensive Manual (${manualPoliciesCount})` : `المجلد الشامل (${manualPoliciesCount})`}
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('CORE')}
          className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            sourceFilter === 'CORE'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          🏥 {isEn ? `Core Policies (${corePoliciesCount})` : `السياسات القياسية الأساسية (${corePoliciesCount})`}
        </button>
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-3 transition-colors">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full ${isEn ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none transition`}
          />
          <span className={`absolute ${isEn ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400`}>
            🔍
          </span>
        </div>

        <div className="w-full md:w-72">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none transition cursor-pointer"
          >
            <option value="ALL">{t.allCategories}</option>
            {Array.from(new Set([...(Object.keys(CATEGORY_META) as CategoryKey[]), ...policies.map((p) => p.category).filter(Boolean)])).map((cat) => {
              const catKey = cat as CategoryKey;
              const catTrans = CATEGORY_TRANSLATIONS[lang]?.[catKey];
              const meta = CATEGORY_META[catKey];
              const label = catTrans ? catTrans.name : (meta ? meta.name : cat);
              return (
                <option key={cat} value={cat}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Policies Grid or Empty State */}
      {filtered.length === 0 ? (
        sourceFilter === 'BOOKMARKS' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-950/60 p-12 text-center space-y-4 shadow-xs transition-colors">
            <span className="text-5xl block animate-bounce">❤️</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.noBookmarks}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {t.noBookmarksDesc}
            </p>
            <button
              type="button"
              onClick={() => {
                setSourceFilter('ALL');
                onSearchChange('');
                onCategoryChange('ALL');
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
                setSourceFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
            >
              {isEn ? 'Show All Policies' : 'إظهار جميع السياسات'}
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const meta = (CATEGORY_META as Record<string, any>)[p.category] || {
              name: p.category || 'القسم المعتمد',
              badge: 'bg-teal-100 text-teal-800 border-teal-200',
              icon: '📋',
              desc: ''
            };
            const catTrans = (CATEGORY_TRANSLATIONS[lang] as Record<string, any>)?.[p.category];
            const categoryName = catTrans ? catTrans.name.split(' ')[0] : meta.name.split(' ')[0];
            const slidesCount = Array.isArray(p.slides) ? p.slides.length : 0;
            const isManual = isManualPolicy(p);
            const isFav = bookmarkedIds.includes(p.id);

            return (
              <article
                key={p.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-500 dark:hover:border-teal-400 transition-all flex flex-col justify-between p-5 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${meta.badge} dark:bg-slate-900/90 dark:text-teal-200 dark:border-slate-600`}>
                      {p.code} • {categoryName}
                    </span>

                    {isManual ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <span>📖</span>
                        <span>{isEn ? 'Official Manual' : 'مجلد الـ 320 صفحة'}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-400 font-bold">
                        {p.version || (isEn ? 'Version 1.0' : 'الإصدار 1.0')}
                      </span>
                    )}
                  </div>

                  {/* Title with Interactive Heart Bookmark Button beside it */}
                  <div className="flex items-start justify-between gap-2 pt-0.5">
                    <h3
                      onClick={() => onOpenDocument(p)}
                      className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 flex-1 cursor-pointer hover:text-teal-700 dark:hover:text-teal-300 transition"
                      title={p.title}
                    >
                      {p.title}
                    </h3>

                    {/* Interactive Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark?.(p.id);
                      }}
                      className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-90 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs group ${
                        isFav
                          ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-700/80 text-slate-400 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-50/50 border-slate-200 dark:border-slate-600'
                      }`}
                      title={isFav ? t.removeFromBookmarks : t.addToBookmarks}
                      aria-label={isFav ? t.removeFromBookmarks : t.addToBookmarks}
                    >
                      <span className="text-base sm:text-lg transition-transform group-hover:scale-125 duration-200">
                        {isFav ? '❤️' : '🤍'}
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-100 line-clamp-3 leading-relaxed font-semibold">
                    {p.purpose}
                  </p>

                  <div className="text-xs text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="truncate">
                      <strong className="text-slate-900 dark:text-white font-black">
                        {isEn ? 'Dept:' : 'القسم:'}
                      </strong>{' '}
                      {p.dept}
                    </span>
                    {slidesCount > 0 && (
                      <span className="text-teal-700 dark:text-teal-300 font-extrabold shrink-0 mr-2">
                        📊 {slidesCount} {isEn ? 'Slides' : 'شرائح'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(p)}
                      className="flex-1 bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <span>📖</span>
                      <span>{isEn ? 'Read Policy' : 'قراءة الوثيقة'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPresentation(p)}
                      className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer border border-transparent dark:border-slate-600 active:scale-95"
                      title={t.slides}
                    >
                      <span>📽️</span>
                      <span>{t.slides}</span>
                    </button>
                  </div>

                  {isAuthorizedAdmin && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => onEditPolicy(p)}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-200 hover:text-amber-900 dark:hover:text-amber-300 text-xs font-bold py-1.5 px-2 rounded-lg transition text-center cursor-pointer border border-slate-200 dark:border-slate-600"
                      >
                        ✏️ {t.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePolicy(p.id)}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-950 text-slate-500 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 text-xs font-bold py-1.5 px-3 rounded-lg transition text-center cursor-pointer border border-slate-200 dark:border-slate-600"
                        title={isEn ? 'Delete this policy' : 'حذف هذه السياسة'}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
