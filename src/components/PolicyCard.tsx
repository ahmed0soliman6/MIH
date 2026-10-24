import React from 'react';
import { Policy } from '../types';
import { CATEGORY_META } from '../data/meta';
import { Language, UI_STRINGS, CATEGORY_TRANSLATIONS } from '../utils/translations';

export interface PolicyCardProps {
  policy: Policy;
  lang?: Language;
  isAuthorizedAdmin: boolean;
  isFav: boolean;
  index?: number;
  onOpenDocument: (policy: Policy) => void;
  onOpenPresentation: (policy: Policy) => void;
  onEditPolicy: (policy: Policy) => void;
  onDeletePolicy: (policyId: string) => void;
  onToggleBookmark?: (policyId: string) => void;
}

export const PolicyCard = React.memo<PolicyCardProps>(({
  policy: p,
  lang = 'ar',
  isAuthorizedAdmin,
  isFav,
  index = 0,
  onOpenDocument,
  onOpenPresentation,
  onEditPolicy,
  onDeletePolicy,
  onToggleBookmark,
}) => {
  const t = UI_STRINGS[lang] || UI_STRINGS.ar;
  const isEn = lang === 'en';

  const meta = (CATEGORY_META as Record<string, any>)[p.category] || {
    name: p.category || 'القسم المعتمد',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: '📋',
    desc: '',
  };
  const catTrans = (CATEGORY_TRANSLATIONS[lang] as Record<string, any>)?.[p.category];
  const categoryName = catTrans ? catTrans.name.split(' ')[0] : meta.name.split(' ')[0];
  const slidesCount = Array.isArray(p.slides) ? p.slides.length : 0;

  return (
    <article
      className="card-lift bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex flex-col justify-between p-5 space-y-4"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 190px',
        // Optional CSS var for stagger if needed
        ['--i' as any]: index,
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${meta.badge} dark:bg-slate-900/90 dark:text-teal-200 dark:border-slate-600`}
          >
            {p.code} • {categoryName}
          </span>

          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold">
            {p.version || (isEn ? 'Version 1.0' : 'الإصدار 1.0')}
          </span>
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
});

PolicyCard.displayName = 'PolicyCard';
