import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Policy, CategoryKey } from '../types';
import { CATEGORY_META } from '../data/meta';
import { sanitizeHtml } from '../utils/sanitize';
import { highlightHtmlText } from '../utils/arabic';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface DocumentModalProps {
  policy: Policy | null;
  isOpen: boolean;
  isAuthorizedAdmin: boolean;
  onClose: () => void;
  onLaunchPresentation: (policy: Policy) => void;
  onEditPolicy: (policy: Policy) => void;
  lang?: Language;
  isBookmarked?: boolean;
  onToggleBookmark?: (policyId: string) => void;
  searchQuery?: string;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  policy,
  isOpen,
  isAuthorizedAdmin,
  onClose,
  onLaunchPresentation,
  onEditPolicy,
  lang = 'ar',
  isBookmarked = false,
  onToggleBookmark,
  searchQuery = '',
}) => {
  const dialogRef = useDialogA11y<HTMLDivElement>({ isOpen, onClose });
  const [readingProgress, setReadingProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  // Calculate highlighted HTML and match count
  const { renderedHtml, matchCount } = useMemo(() => {
    if (!policy?.content_html) return { renderedHtml: '', matchCount: 0 };
    const clean = sanitizeHtml(policy.content_html);
    if (!searchQuery || !searchQuery.trim()) {
      return { renderedHtml: clean, matchCount: 0 };
    }
    const res = highlightHtmlText(clean, searchQuery.trim());
    return { renderedHtml: res.html, matchCount: res.matchCount };
  }, [policy?.content_html, searchQuery]);

  // Reset scroll and progress on policy change
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setReadingProgress(0);
    }
  }, [isOpen, policy?.id]);

  // التمرير التلقائي السلس إلى أول نتيجة بحث مظللة (Auto-scroll to first match)
  useEffect(() => {
    if (isOpen && searchQuery && searchQuery.trim()) {
      const timer = setTimeout(() => {
        const firstMatch = scrollContainerRef.current?.querySelector('.search-highlight');
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, policy?.id, searchQuery, matchCount]);

  // Handle scroll progress
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setReadingProgress(100);
      return;
    }
    const currentProgress = Math.min(100, Math.max(0, Math.round((el.scrollTop / maxScroll) * 100)));
    setReadingProgress(currentProgress);
  };

  if (!isOpen || !policy) return null;

  const catKey = policy.category as CategoryKey;
  const meta = (CATEGORY_META as Record<string, any>)[catKey] || {
    name: policy.category || 'القسم المعتمد',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: '📋',
    desc: policy.category || ''
  };
  const catTrans = (CATEGORY_TRANSLATIONS[lang] as Record<string, any>)?.[catKey] || {
    name: meta.name,
    desc: meta.desc
  };

  const handleSafeClose = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onClose();
  };

  const currentFormattedDate = new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-EG', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date());

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSafeClose(e);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={policy.title}
    >
      <div
        ref={dialogRef}
        className="modal-enter bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full h-[94vh] sm:h-[92vh] shadow-2xl overflow-hidden flex flex-col transition-colors relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Toolbar */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0 no-print z-20">
          
          {/* Policy Info Title in Toolbar */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg sm:text-xl shrink-0">📖</span>
            <div className="min-w-0">
              <span className="font-extrabold text-xs sm:text-sm block truncate text-slate-100">
                {policy.title}
              </span>
              <span className="text-[10px] text-teal-400 font-mono block truncate">
                {policy.code} • {t.policyDocApproved} ({readingProgress}%)
              </span>
            </div>
            {matchCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 shrink-0 shadow-xs animate-pulse">
                <span>🔍</span>
                <span>{matchCount} مطابقة للبحث</span>
              </span>
            )}
          </div>

          {/* Action Buttons: Presentation, Bookmark Heart Toggle, Edit, & Close (PDF report button removed per request) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Interactive Bookmark Button in Toolbar */}
            <button
              type="button"
              onClick={() => onToggleBookmark?.(policy.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer border active:scale-95 ${
                isBookmarked
                  ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={isBookmarked ? t.removeFromBookmarks : t.addToBookmarks}
            >
              <span className="text-sm transition-transform duration-200 hover:scale-125">
                {isBookmarked ? '❤️' : '🤍'}
              </span>
              <span className="hidden sm:inline">
                {isBookmarked ? t.bookmarks : t.addToBookmarks}
              </span>
            </button>

            {/* Slides Presentation Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onLaunchPresentation(policy);
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
              title={t.slides}
            >
              <span>📽️</span>
              <span className="hidden sm:inline">{t.slides}</span>
            </button>

            {/* Admin Edit Policy Button */}
            {isAuthorizedAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPolicy(policy);
                }}
                className="px-2 sm:px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                title={t.edit}
              >
                <span>✏️</span>
                <span className="hidden md:inline">{t.edit}</span>
              </button>
            )}

            {/* Prominent, Responsive Close Button (Touch Friendly 44x44px target) */}
            <button
              type="button"
              onClick={handleSafeClose}
              onTouchEnd={handleSafeClose}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 hover:bg-red-600 active:bg-red-700 text-white flex items-center justify-center font-black text-lg transition-all shadow-md cursor-pointer border border-slate-700 active:scale-95"
              title={t.close}
              aria-label={t.close}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Animated Reading Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 shrink-0 overflow-hidden relative no-print">
          <div
            className="h-full bg-gradient-to-l from-teal-400 via-emerald-400 to-teal-500 transition-all duration-150 ease-out"
            style={{ width: `${readingProgress}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-3 bg-white/70 blur-xs transition-all duration-150"
            style={{ [isEn ? 'left' : 'right']: `calc(${100 - readingProgress}% - 6px)` }}
          />
        </div>

        {/* Scrollable Document Content */}
        <div
          id="printable-policy-document"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
          className="flex-1 overflow-y-auto overscroll-contain custom-scroll p-4 sm:p-10 space-y-6 print-document-mode text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 select-text"
        >

          {/* Policy Title & Accreditation Category Meta + Heart Bookmark Button */}
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border inline-block ${meta.badge} shadow-2xs`}>
                {policy.code} • {catTrans.name}
              </span>

              {isBookmarked && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                  <span>❤️</span>
                  <span>{t.bookmarks}</span>
                </span>
              )}
            </div>

            {/* Title with Interactive Heart Button directly beside it */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug flex-1">
                {policy.title}
              </h1>

              {/* Heart Button right next to title */}
              <button
                type="button"
                onClick={() => onToggleBookmark?.(policy.id)}
                className={`p-2 sm:px-3 sm:py-2 rounded-2xl border transition-all active:scale-90 flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 select-none group ${
                  isBookmarked
                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 border-slate-200 dark:border-slate-700'
                }`}
                title={isBookmarked ? t.removeFromBookmarks : t.addToBookmarks}
                aria-label={isBookmarked ? t.removeFromBookmarks : t.addToBookmarks}
              >
                <span className="text-lg sm:text-xl transition-transform group-hover:scale-125 duration-200">
                  {isBookmarked ? '❤️' : '🤍'}
                </span>
                <span className="text-xs font-bold hidden xs:inline">
                  {isBookmarked ? t.bookmarks : t.addToBookmarks}
                </span>
              </button>
            </div>
          </div>

          {/* Formal Metadata Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden shadow-2xs">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr className="bg-slate-50 dark:bg-slate-950/40">
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 w-1/4">
                    {t.applicableDepts}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {policy.dept}
                  </td>
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 w-1/5">
                    {t.responsibilities}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {Array.isArray(policy.responsibilities)
                      ? policy.responsibilities.join(' • ')
                      : (policy.responsibilities || (isEn ? 'Medical, Nursing and Quality Teams' : 'الأطباء والتمريض وفريق الجودة'))}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                    {t.effectiveDate}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {policy.effectiveDate || '—'}
                  </td>
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                    {t.reviewDate}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {policy.reviewDate || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Purpose Box with Accent Bar */}
          <div className="p-4 rounded-xl bg-teal-50/90 dark:bg-teal-950/60 border-r-4 border-teal-600 dark:border-teal-400 text-teal-950 dark:text-teal-100 space-y-1.5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 inline-block no-print" />
              <h4 className="text-xs font-black text-teal-900 dark:text-teal-200 uppercase tracking-wide">
                {t.purposeTitle}
              </h4>
            </div>
            <p className="text-sm font-semibold leading-relaxed text-teal-950 dark:text-teal-100">{policy.purpose}</p>
          </div>

          {/* Full Rich HTML Content with smooth reading lines & search highlight */}
          <div
            className="policy-content-html border-t border-slate-200 dark:border-slate-800 pt-4 text-slate-900 dark:text-slate-100 leading-relaxed font-normal"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {/* Footer info with Hospital Branding & Date */}
          <div className="mt-8 pt-4 border-t border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 gap-2 font-mono">
            <div>
              <span>🏥 {t.reportFooterHospital}</span> • <span>{t.reportFooterConfidential}</span>
            </div>
            <div className="text-teal-700 dark:text-teal-400 font-bold">
              {t.reportGeneratedAt} {currentFormattedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
