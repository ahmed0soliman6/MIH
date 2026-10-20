import React from 'react';
import { Policy, CategoryKey } from '../types';
import { CATEGORY_META } from '../data/initialData';

interface PoliciesViewProps {
  policies: Policy[];
  searchQuery: string;
  selectedCategory: string;
  isAuthorizedAdmin: boolean;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onOpenDocument: (policy: Policy) => void;
  onOpenPresentation: (policy: Policy) => void;
  onEditPolicy: (policy: Policy) => void;
  onDeletePolicy: (policyId: string) => void;
  onAddPolicy: () => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({
  policies,
  searchQuery,
  selectedCategory,
  isAuthorizedAdmin,
  onSearchChange,
  onCategoryChange,
  onOpenDocument,
  onOpenPresentation,
  onEditPolicy,
  onDeletePolicy,
  onAddPolicy,
}) => {
  const filtered = policies.filter((p) => {
    const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const blob = `${p.title} ${p.code} ${p.dept} ${p.purpose} ${p.plain_text || ''}`.toLowerCase();
    const matchQuery = !searchQuery || blob.includes(searchQuery.trim().toLowerCase());
    return matchCategory && matchQuery;
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            مكتبة سياسات الجودة المعتمدة
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            تصفح وقراءة وطباعة السياسات أو تشغيلها في وضع العرض التقديمي
          </p>
        </div>

        {isAuthorizedAdmin && (
          <button
            type="button"
            onClick={onAddPolicy}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <span>➕</span>
            <span>إضافة أو رفع سياسة جديدة</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 transition-colors">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث فوري في العناوين والأكواد والنص الكامل للسياسات..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none transition"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>

        <div className="w-full md:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none transition cursor-pointer"
          >
            <option value="ALL">جميع الأقسام والتصنيفات</option>
            {(Object.keys(CATEGORY_META) as CategoryKey[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policies Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm transition-colors">
          <span className="text-4xl">🔍</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            لا توجد سياسات مطابقة لمعايير البحث الحالية
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جرب البحث بكلمات أخرى أو اختر "جميع الأقسام" لعرض المكتبة الكاملة.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onCategoryChange('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
          >
            إظهار جميع السياسات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const meta = CATEGORY_META[p.category] || CATEGORY_META.QPI;
            const slidesCount = Array.isArray(p.slides) ? p.slides.length : 0;
            return (
              <article
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-500 dark:hover:border-teal-500 transition-all flex flex-col justify-between p-5 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${meta.badge}`}>
                      {p.code} • {meta.name.split(' ')[0]}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                      {p.version || 'الإصدار 1.0'}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {p.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-semibold">
                    {p.purpose}
                  </p>

                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <span className="truncate">
                      <strong className="text-slate-800 dark:text-slate-200">القسم:</strong> {p.dept}
                    </span>
                    {slidesCount > 0 && (
                      <span className="text-teal-700 dark:text-teal-400 font-extrabold shrink-0 mr-2">
                        📊 {slidesCount} شرائح
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(p)}
                      className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>📖</span>
                      <span>وضع الوثيقة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPresentation(p)}
                      className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border border-transparent dark:border-slate-700"
                      title="تشغيل العرض التقديمي"
                    >
                      <span>📽️</span>
                      <span>عرض الشرائح</span>
                    </button>
                  </div>

                  {isAuthorizedAdmin && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onEditPolicy(p)}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 hover:text-amber-900 dark:hover:text-amber-300 text-xs font-bold py-1.5 px-2 rounded-lg transition text-center cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePolicy(p.id)}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950 text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 text-xs font-bold py-1.5 px-3 rounded-lg transition text-center cursor-pointer border border-slate-200 dark:border-slate-700"
                        title="حذف هذه السياسة"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
