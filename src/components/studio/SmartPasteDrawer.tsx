import React, { useState, useMemo } from 'react';
import { smartParseText, extractPolicyMetadata, SmartDetection, ExtractedPolicyMetadata } from '../../doc/smartParse';
import { Block } from '../../doc/model';

interface SmartPasteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (parsedText: string, blocks: Block[], metadata?: ExtractedPolicyMetadata) => void;
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

  // Extract metadata and clean text
  const { metadata, cleanText } = useMemo(() => {
    if (!inputText.trim()) return { metadata: {}, cleanText: '' };
    return extractPolicyMetadata(inputText);
  }, [inputText]);

  // Run smart parser on clean text
  const parseResult = useMemo(() => {
    if (!inputText.trim()) return { blocks: [], detections: [] };
    return smartParseText(cleanText || inputText);
  }, [inputText, cleanText]);

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
    onApply(cleanText || inputText, parseResult.blocks, metadata);
    setInputText('');
    onClose();
  };

  const hasDetectedMetadata = Boolean(
    metadata.title || metadata.code || metadata.category || metadata.dept || metadata.version
  );

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
                اللصق الذكي المطور (Smart Paste)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الصق النص المنسوخ من Word أو PDF أو ChatGPT وسيتم استخراج البيانات وتنسيق الكتل تلقائياً
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
              الصق النص الخام هنا (يمكن لصق صفحة كاملة بما فيها الترويسة والجدول):
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="مثال:
اسم السياسة طلب الدم ومشتقاته تاريخ الإصدار 2025/6/15
رقم السياسة SMC/MIH/ICD.20 رقم الإصدار 1
الأقسام المعنية جميع أقسام المستشفى
السياسة
تضع وتنفذ مستشفى المنصورة الدولي...
الغرض
ضمان عملية صحيحة وفعالة...
الإجراءات
-1 يقوم الطبيب..."
              rows={8}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-y leading-relaxed"
            />
          </div>

          {/* Auto-detected metadata banner */}
          {hasDetectedMetadata && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <span>🎯</span> تم التعرف التلقائي على بيانات الوثيقة (ستُملأ في اللوحة فوراً):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                {metadata.title && (
                  <div>
                    <span className="text-slate-500 block">العنوان:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">{metadata.title}</span>
                  </div>
                )}
                {metadata.code && (
                  <div>
                    <span className="text-slate-500 block">الكود:</span>
                    <span className="font-bold font-mono text-teal-700 dark:text-teal-300 block">{metadata.code}</span>
                  </div>
                )}
                {metadata.category && (
                  <div>
                    <span className="text-slate-500 block">التصنيف:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 block">{metadata.category}</span>
                  </div>
                )}
                {metadata.version && (
                  <div>
                    <span className="text-slate-500 block">الإصدار:</span>
                    <span className="font-bold block">{metadata.version}</span>
                  </div>
                )}
                {metadata.effectiveDate && (
                  <div>
                    <span className="text-slate-500 block">تاريخ التفعيل:</span>
                    <span className="font-mono block">{metadata.effectiveDate}</span>
                  </div>
                )}
                {metadata.dept && (
                  <div>
                    <span className="text-slate-500 block">الأقسام:</span>
                    <span className="truncate block">{metadata.dept}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detections Summary */}
          {parseResult.detections.length > 0 && (
            <div className="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <span>✨</span> الكتل الهيكلية المكتشفة ({parseResult.blocks.length} كتلة):
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
