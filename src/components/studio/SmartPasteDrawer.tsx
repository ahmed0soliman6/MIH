import React, { useState, useMemo } from 'react';
import { smartParseText, SmartDetection } from '../../doc/smartParse';
import { Block } from '../../doc/model';

interface SmartPasteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (parsedText: string, blocks: Block[]) => void;
}

export const SmartPasteDrawer: React.FC<SmartPasteDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [inputText, setInputText] = useState('');
  const [enabledRules, setEnabledRules] = useState<Record<string, boolean>>({
    sections: true,
    subheadings: true,
    lists: true,
    ordered: true,
    callouts: true,
    tables: true,
    checklists: true,
    pagebreaks: true,
    repeatedHeaders: true,
  });

  // Run smart parser on input
  const parseResult = useMemo(() => {
    if (!inputText.trim()) return { blocks: [], detections: [] };
    return smartParseText(inputText);
  }, [inputText]);

  if (!isOpen) return null;

  const toggleRule = (type: string) => {
    setEnabledRules((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleApply = () => {
    if (!inputText.trim()) {
      onClose();
      return;
    }
    onApply(inputText, parseResult.blocks);
    setInputText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-lg">
              📋
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                اللصق الذكي (Smart Paste)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الصق النص المنسوخ من Word أو PDF أو ChatGPT وسيتم تحليله وتنسيقه فوراً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              الصق النص الخام هنا:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="مثال:
I. السياسة العامة:
● البند الأول
● البند الثاني
   ✓ متطلب فرعي
الصنف | الجرعة | المدة
أ | 10 | 5 أيام"
              rows={8}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-y"
            />
          </div>

          {/* Detections Summary */}
          {parseResult.detections.length > 0 && (
            <div className="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <span>✨</span> الاكتشافات الذكية ({parseResult.blocks.length} كتل مكتشفة):
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-300 font-mono">
                  {parseResult.detections.reduce((acc, d) => acc + d.count, 0)} عنصر
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {parseResult.detections.map((det: SmartDetection) => {
                  const isEnabled = enabledRules[det.type] !== false;
                  return (
                    <button
                      key={det.type}
                      type="button"
                      onClick={() => toggleRule(det.type)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isEnabled
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <span>{det.label}</span>
                      <span className="bg-black/20 text-white px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                        {det.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!inputText.trim()}
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>تطبيق على المحرر</span>
            <span>←</span>
          </button>
        </div>
      </div>
    </div>
  );
};
