import React from 'react';
import { Slide } from '../../types';
import { generateSlidesFromHtml } from '../../services/aiAndParsers';

interface SlidesEditorProps {
  slides: Slide[];
  onChangeSlides: (slides: Slide[]) => void;
  contentHtml: string;
  policyTitle: string;
  policyCode: string;
  onShowToast: (msg: string) => void;
}

export const SlidesEditor: React.FC<SlidesEditorProps> = ({
  slides,
  onChangeSlides,
  contentHtml,
  policyTitle,
  policyCode,
  onShowToast,
}) => {
  const handleAutoGenerate = () => {
    if (!contentHtml.trim()) {
      onShowToast('لا يوجد محتوى في السياسة لتوليد الشرائح منه');
      return;
    }
    const generated = generateSlidesFromHtml(contentHtml, policyTitle);
    if (generated.length === 0) {
      onShowToast('لم يتم العثور على أقسام أو عناوين كافية لتوليد الشرائح');
      return;
    }
    onChangeSlides(generated);
    onShowToast(`تم توليد ${generated.length} شرائح بنجاح!`);
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      slide_number: slides.length + 1,
      slide_title: `شريحة ${slides.length + 1}`,
      bullet_points: ['نقطة رئيسية'],
    };
    onChangeSlides([...slides, newSlide]);
  };

  const handleRemoveSlide = (idx: number) => {
    const next = slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slide_number: i + 1 }));
    onChangeSlides(next);
  };

  const handleUpdateTitle = (idx: number, title: string) => {
    const next = [...slides];
    next[idx] = { ...next[idx], slide_title: title };
    onChangeSlides(next);
  };

  const handleUpdateBullets = (idx: number, rawBullets: string) => {
    const next = [...slides];
    next[idx] = {
      ...next[idx],
      bullet_points: rawBullets.split('\n').filter((b) => b.trim().length > 0),
    };
    onChangeSlides(next);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto space-y-4" dir="rtl">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>📊</span>
            <span>شرائح التدريب التفاعلية ({slides.length} شريحة)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>✨</span>
            <span>توليد الشرائح تلقائياً من المحتوى</span>
          </button>

          <button
            type="button"
            onClick={handleAddSlide}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition shadow-xs"
          >
            ➕ إضافة شريحة
          </button>
        </div>
      </div>

      {/* Empty State */}
      {slides.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-3">
          <span className="text-4xl block">📊</span>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            لا توجد شرائح تدريبية بعد
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            يمكنك توليد الشرائح تلقائياً من نص السياسة أو إضافة شرائح وتعديلها يدوياً
          </p>
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>توليد الشرائح الآن من المحتوى</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {slides.map((s, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                  شريحة {idx + 1} من {slides.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSlide(idx)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition"
                  title="حذف الشريحة"
                >
                  🗑️ حذف
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الشريحة:
                </label>
                <input
                  type="text"
                  value={s.slide_title}
                  onChange={(e) => handleUpdateTitle(idx, e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  النقاط (نقطة في كل سطر):
                </label>
                <textarea
                  rows={4}
                  value={(s.bullet_points || []).join('\n')}
                  onChange={(e) => handleUpdateBullets(idx, e.target.value)}
                  placeholder="اكتب كل نقطة في سطر منفصل..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 custom-scroll font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
