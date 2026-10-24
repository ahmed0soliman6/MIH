import React from 'react';

interface HtmlEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export const HtmlEditor: React.FC<HtmlEditorProps> = ({ value, onChange }) => {
  const lineCount = value.split('\n').length;
  const charCount = value.length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm font-mono text-xs" dir="ltr">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">&lt;/&gt;</span>
          <span className="text-slate-200 font-semibold">محرر كود HTML المتقدم</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 p-3">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<section class='mih-sec'>\n  <h2 class='mih-h2'>عنوان السياسة</h2>\n  <p class='mih-p'>محتوى السياسة...</p>\n</section>"
          className="w-full h-full bg-transparent text-emerald-300 focus:outline-none resize-none leading-relaxed selection:bg-teal-900"
          spellCheck={false}
        />
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between" dir="rtl">
        <span>💡 سيتم تحويل كود HTML تلقائياً إلى كتل هيكلية عند الرجوع للأوضاع الأخرى.</span>
      </div>
    </div>
  );
};
