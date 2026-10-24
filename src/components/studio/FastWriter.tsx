import React, { useRef } from 'react';

interface FastWriterProps {
  value: string;
  onChange: (newValue: string) => void;
  onOpenSmartPaste: () => void;
  maxLength?: number;
}

export const FastWriter: React.FC<FastWriterProps> = ({
  value,
  onChange,
  onOpenSmartPaste,
  maxLength = 300000,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Statistics
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));
  const usagePercent = Math.min(100, Math.round((charCount / maxLength) * 100));

  const insertSnippet = (snippet: string, cursorOffset?: number) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value}\n${snippet}` : snippet);
      return;
    }

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const prefix = value.substring(0, start);
    const suffix = value.substring(end);

    // Add newline before if needed
    const needsNewline = prefix.length > 0 && !prefix.endsWith('\n');
    const inserted = `${needsNewline ? '\n' : ''}${snippet}`;
    const nextVal = prefix + inserted + suffix;
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      const nextPos = start + inserted.length + (cursorOffset || 0);
      el.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+B: Wrap selection in **
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.substring(start, end);
      const replacement = `**${selected || 'نص غامق'}**`;
      onChange(value.substring(0, start) + replacement + value.substring(end));
    }

    // Ctrl+I: Wrap selection in *
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.substring(start, end);
      const replacement = `*${selected || 'نص مائل'}*`;
      onChange(value.substring(0, start) + replacement + value.substring(end));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Quick Insert Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => insertSnippet('I. عنوان القسم:\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 font-bold transition flex items-center gap-1"
          title="إدراج قسم رئيسي بترقيم روماني"
        >
          <span>I.</span>
          <span>قسم</span>
        </button>

        <button
          type="button"
          onClick={() => insertSnippet('➢ عنوان فرعي:\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 font-bold transition flex items-center gap-1"
          title="إدراج عنوان فرعي مسطر"
        >
          <span>➢</span>
          <span>فرعي</span>
        </button>

        <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={() => insertSnippet('● نقطة رئيسية\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 transition flex items-center gap-1"
          title="نقطة دائرية"
        >
          <span>●</span>
          <span>نقطة</span>
        </button>

        <button
          type="button"
          onClick={() => insertSnippet('1. خطوة أولى\n2. خطوة ثانية\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 transition flex items-center gap-1 font-mono"
          title="قائمة رقمية"
        >
          <span>1.</span>
          <span>ترقيم</span>
        </button>

        <button
          type="button"
          onClick={() => insertSnippet('الصنف | الجرعة | التكرار\n---|---|---\nعنصر 1 | 10 ملجم | يومياً\nعنصر 2 | 20 ملجم | عند اللزوم\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 transition flex items-center gap-1"
          title="إدراج جدول"
        >
          <span>📊</span>
          <span>جدول</span>
        </button>

        <button
          type="button"
          onClick={() => insertSnippet('ملاحظة: يجب تسجيل كافة الإجراءات فور إتمامها.\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 transition flex items-center gap-1"
          title="مربع تنبيه"
        >
          <span>💡</span>
          <span>تنبيه</span>
        </button>

        <button
          type="button"
          onClick={() => insertSnippet('☐ بند تحقق أول\n☑ بند مكتمل\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 transition flex items-center gap-1"
          title="قائمة تحقق"
        >
          <span>☑️</span>
          <span>تحقق</span>
        </button>

        <button
          type="button"
          onClick={() => insertSnippet('---\n')}
          className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-600 transition flex items-center gap-1"
          title="فاصل صفحة للطباعة"
        >
          <span>📄</span>
          <span>فاصل</span>
        </button>

        <div className="mr-auto">
          <button
            type="button"
            onClick={onOpenSmartPaste}
            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-bold shadow-sm transition flex items-center gap-1.5"
            title="فتح نافذة اللصق الذكي لتحليل نصوص Word/PDF"
          >
            <span>📥</span>
            <span>لصق ذكي</span>
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative flex-1 min-h-[350px]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          dir="rtl"
          placeholder="اكتب هنا محتوى السياسة مباشرة، أو اضغط 'لصق ذكي' لتحليل نصوص Word و PDF...
مثال:
I. السياسة العامة:
● يلتزم جميع العاملين بتطبيق معايير السلامة.
   ✓ فحص يومي
   ✓ توثيق معتمد
الصنف | الجرعة | التكرار
أ | 10 | يومياً"
          className="w-full h-full p-4 text-sm font-sans leading-relaxed text-slate-900 dark:text-slate-100 bg-transparent resize-none focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Footer Info & Character Budget */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{charCount.toLocaleString('ar-EG')} حرف</span>
          <span>•</span>
          <span>{wordCount.toLocaleString('ar-EG')} كلمة</span>
          <span>•</span>
          <span>~{readingTimeMinutes} د قراءة</span>
        </div>

        <div className="flex items-center gap-2">
          {usagePercent >= 80 && (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              تنبيه: اقترب المحتوى من الحد الأقصى ({usagePercent}%)
            </span>
          )}
          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
