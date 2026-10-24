import React, { useState, useEffect, useRef } from 'react';
import { Policy } from '../types';
import { Language, UI_STRINGS } from '../utils/translations';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { OfficialDocument } from '../doc/OfficialDocument';

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

  // Default mode: 'reading' on mobile (< 768px), 'page' (A4) on larger screens
  const [docMode, setDocMode] = useState<'page' | 'reading'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'reading';
    }
    return 'page';
  });

  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);

  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  // Reset scroll and progress on policy change
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setReadingProgress(0);
    }
  }, [isOpen, policy?.id]);

  // Auto-scroll to first search highlight if present
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
  }, [isOpen, policy?.id, searchQuery]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleSafeClose = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onClose();
  };

  if (!isOpen || !policy) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-1 sm:p-4 overscroll-contain"
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
        className="modal-enter bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full h-[96vh] sm:h-[94vh] shadow-2xl overflow-hidden flex flex-col transition-colors relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Toolbar */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0 no-print z-20">
          
          {/* Policy Info in Toolbar */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-base sm:text-lg shrink-0">🏛️</span>
            <div className="min-w-0">
              <span className="font-extrabold text-xs sm:text-sm block truncate text-slate-100">
                {policy.title}
              </span>
              <span className="text-[10px] text-teal-400 font-mono block truncate">
                {policy.code} • {t.policyDocApproved} ({readingProgress}%)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle (Page vs Reading) */}
            <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDocMode('page')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  docMode === 'page'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض ورقة A4 الرسمية"
              >
                📄 ورقة A4
              </button>
              <button
                type="button"
                onClick={() => setDocMode('reading')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  docMode === 'reading'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض القراءة المرنة"
              >
                📱 قراءة
              </button>
            </div>

            {/* Zoom Controls for Page Mode */}
            {docMode === 'page' && (
              <div className="hidden md:flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-xl border border-slate-700 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                  className="px-1 text-slate-400 hover:text-white cursor-pointer font-bold"
                  title="تصغير"
                >
                  -
                </button>
                <span className="text-slate-300 min-w-[36px] text-center">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                  className="px-1 text-slate-400 hover:text-white cursor-pointer font-bold"
                  title="تكبير"
                >
                  +
                </button>
              </div>
            )}

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition flex items-center gap-1 shadow-sm cursor-pointer border border-slate-700"
              title="طباعة الوثيقة الرسمية أو حفظها كـ PDF"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">طباعة / PDF</span>
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

            {/* Bookmark Heart Button */}
            <button
              type="button"
              onClick={() => onToggleBookmark?.(policy.id)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border active:scale-95 ${
                isBookmarked
                  ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={isBookmarked ? t.removeFromBookmarks : t.addToBookmarks}
            >
              <span className="text-sm">{isBookmarked ? '❤️' : '🤍'}</span>
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

            {/* Close Button */}
            <button
              type="button"
              onClick={handleSafeClose}
              onTouchEnd={handleSafeClose}
              className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 hover:bg-red-600 active:bg-red-700 text-white flex items-center justify-center font-black text-base transition-all shadow-md cursor-pointer border border-slate-700 active:scale-95"
              title={t.close}
              aria-label={t.close}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Animated Reading Progress Bar */}
        <div className="w-full h-1 bg-slate-800 shrink-0 overflow-hidden relative no-print">
          <div
            className="h-full bg-gradient-to-l from-teal-400 via-emerald-400 to-teal-500 transition-all duration-150 ease-out"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Scrollable Container with Official Document */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto overscroll-contain custom-scroll select-text ${
            docMode === 'page'
              ? 'bg-slate-200/70 dark:bg-slate-950 p-2 sm:p-6'
              : 'bg-white dark:bg-slate-900 p-3 sm:p-8'
          }`}
        >
          <OfficialDocument
            policy={policy}
            mode={docMode}
            watermark={showWatermark}
            searchQuery={searchQuery}
            zoomScale={zoomScale}
          />
        </div>
      </div>
    </div>
  );
};
