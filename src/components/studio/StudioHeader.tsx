import React from 'react';
import { Policy } from '../../types';

interface StudioHeaderProps {
  title: string;
  code: string;
  isDirty: boolean;
  lastSavedTime: string | null;
  isSaving: boolean;
  onSave: () => void;
  onPrint: () => void;
  onToggleFullscreenPreview: () => void;
  onClose: () => void;
  activeView: 'editor' | 'preview';
  onChangeActiveView: (view: 'editor' | 'preview') => void;
  existingPolicies?: Policy[];
  currentPolicyId?: string;
  onSelectPolicy?: (id: string) => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  title,
  code,
  isDirty,
  lastSavedTime,
  isSaving,
  onSave,
  onPrint,
  onToggleFullscreenPreview,
  onClose,
  activeView,
  onChangeActiveView,
  existingPolicies = [],
  currentPolicyId,
  onSelectPolicy,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm" dir="rtl">
      {/* Title & Info */}
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="p-2 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-xl text-base font-bold shrink-0">
          ⚡
        </span>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            {existingPolicies.length > 0 && onSelectPolicy ? (
              <select
                value={currentPolicyId || 'new'}
                onChange={(e) => onSelectPolicy(e.target.value)}
                className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white bg-transparent border-b border-teal-500/50 py-0.5 outline-none cursor-pointer max-w-[200px] sm:max-w-xs truncate"
              >
                <option value="new">➕ إنشاء سياسة جديدة فارغة</option>
                {existingPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {title || 'سياسة جديدة بدون عنوان'}
              </h1>
            )}
            {code && (
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-teal-800 dark:text-teal-300 font-mono text-[10px] rounded-md font-bold shrink-0">
                {code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isSaving ? (
              <span className="text-teal-600 font-medium animate-pulse flex items-center gap-1">
                <span>🔄</span> جاري الحفظ في السحابة...
              </span>
            ) : isDirty ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                تغييرات غير محفوظة
              </span>
            ) : lastSavedTime ? (
              <span className="text-slate-500 dark:text-slate-400">
                تم الحفظ محلياً {lastSavedTime}
              </span>
            ) : (
              <span className="text-slate-400">مسودة جديدة</span>
            )}
          </div>
        </div>
      </div>

      {/* Middle View Switcher (for small/medium screens) */}
      <div className="flex lg:hidden items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => onChangeActiveView('editor')}
          className={`px-3 py-1 rounded-lg transition ${
            activeView === 'editor'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          المحرر
        </button>
        <button
          type="button"
          onClick={() => onChangeActiveView('preview')}
          className={`px-3 py-1 rounded-lg transition ${
            activeView === 'preview'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          المعاينة الحية
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onPrint}
          className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
          title="طباعة الوثيقة A4"
        >
          <span>🖨️</span>
          <span className="hidden sm:inline">طباعة</span>
        </button>

        <button
          type="button"
          onClick={onToggleFullscreenPreview}
          className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
          title="معاينة بملء الشاشة (Ctrl+Enter)"
        >
          <span>👁️</span>
          <span className="hidden sm:inline">ملء الشاشة</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
          title="حفظ السياسة (Ctrl+S)"
        >
          <span>💾</span>
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ (Ctrl+S)'}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          aria-label="إغلاق المحرر"
        >
          ✕
        </button>
      </div>
    </header>
  );
};
