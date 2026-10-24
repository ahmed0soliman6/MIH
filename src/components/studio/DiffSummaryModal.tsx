import React from 'react';
import { Block } from '../../doc/model';

interface DiffSummaryModalProps {
  isOpen: boolean;
  originalBlocks: Block[];
  currentBlocks: Block[];
  onConfirmSave: () => void;
  onCancel: () => void;
}

export const DiffSummaryModal: React.FC<DiffSummaryModalProps> = ({
  isOpen,
  originalBlocks,
  currentBlocks,
  onConfirmSave,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Calculate simple diff
  const originalIds = new Set(originalBlocks.map((b) => b.id));
  const currentIds = new Set(currentBlocks.map((b) => b.id));

  let addedCount = 0;
  let deletedCount = 0;
  let modifiedCount = 0;

  for (const b of currentBlocks) {
    if (!originalIds.has(b.id)) {
      addedCount++;
    } else {
      const orig = originalBlocks.find((o) => o.id === b.id);
      if (orig && JSON.stringify(orig) !== JSON.stringify(b)) {
        modifiedCount++;
      }
    }
  }

  for (const b of originalBlocks) {
    if (!currentIds.has(b.id)) {
      deletedCount++;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-xl text-xl">
            📋
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ملخص الفروقات قبل الحفظ
            </h3>
            <p className="text-xs text-slate-500">
              مراجعة التغييرات التي تمت على بنية السياسة
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">الكتل الحالية:</span>
            <span className="font-bold text-slate-900 dark:text-white">{currentBlocks.length} كتلة</span>
          </div>
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>➕ كتل أضيفت:</span>
            <span>{addedCount}</span>
          </div>
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
            <span>✏️ كتل عُدّلت:</span>
            <span>{modifiedCount}</span>
          </div>
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
            <span>🗑️ كتل حُذفت:</span>
            <span>{deletedCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            الرجوع للمحرر
          </button>
          <button
            type="button"
            onClick={onConfirmSave}
            className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition"
          >
            تأكيد الحفظ في السحابة
          </button>
        </div>
      </div>
    </div>
  );
};
