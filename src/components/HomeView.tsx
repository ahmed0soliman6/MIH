import React, { useState } from 'react';
import { Policy, Bundle, CategoryKey } from '../types';
import { CATEGORY_META } from '../data/initialData';
import { TabType } from './Navbar';

interface HomeViewProps {
  policies: Policy[];
  bundles: Bundle[];
  isAuthorizedAdmin: boolean;
  onNavigateTab: (tab: TabType) => void;
  onFilterCategory: (category: CategoryKey) => void;
  onSearchQuery: (query: string) => void;
  onOpenDocument: (policy: Policy) => void;
  onOpenPresentation: (policy: Policy) => void;
  onQuickAddPolicy: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  policies,
  bundles,
  isAuthorizedAdmin,
  onNavigateTab,
  onFilterCategory,
  onSearchQuery,
  onOpenDocument,
  onOpenPresentation,
  onQuickAddPolicy,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      onSearchQuery(searchInput.trim());
      onNavigateTab('policies');
    } else {
      onNavigateTab('policies');
    }
  };

  // Calculate compliance
  let totalItems = 0;
  let checkedItems = 0;
  bundles.forEach((b) => {
    (b.items || []).forEach((item) => {
      totalItems++;
      if (item.checked) checkedItems++;
    });
  });
  const compliancePct = totalItems === 0 ? 100 : Math.round((checkedItems / totalItems) * 100);

  const featuredPolicies = policies.slice(0, 3);
  const featuredBundles = bundles.slice(0, 3);

  return (
    <section className="space-y-8">
      {/* Hero Banner with Instant Search */}
      <div className="hero-mesh rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-bold">
            <span>✨</span>
            <span>نظام إلكتروني فائق السرعة • بدون استهلاك تخزين ملفات</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black leading-tight">
            الدليل الشامل لسياسات الجودة وسلامة المرضى
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-semibold">
            نظام رقمي تفاعلي يتيح لك تصفح، قراءة، وتشغيل عروض تدريبية لجميع سياسات المستشفى المعتمدة وفقاً لمعايير الهيئة العامة للاعتماد والرقابة الصحية (GAHAR).
          </p>

          {/* Quick Search in Hero */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث فوراً برقم السياسة، الكود، اسم الإجراء، أو الكلمات المفتاحية..."
                className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white text-slate-900 placeholder-slate-400 font-semibold text-sm shadow-md focus:ring-4 focus:ring-teal-400 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            </div>

            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>بحث في المكتبة</span>
              <span>←</span>
            </button>
          </form>

          {/* Quick action buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('policies')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur transition border border-white/20 cursor-pointer"
            >
              📚 تصفح جميع السياسات
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('bundles')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur transition border border-white/20 cursor-pointer"
            >
              📋 حزم الرعاية الإكلينيكية
            </button>

            {isAuthorizedAdmin && (
              <button
                type="button"
                onClick={onQuickAddPolicy}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>➕</span>
                <span>رفع وتحويل سياسة جديدة</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">إجمالي السياسات المعتمدة</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{policies.length}</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl font-bold">
            📚
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">حزم الرعاية الإكلينيكية (Bundles)</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{bundles.length}</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center text-2xl font-bold">
            📋
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">متوسط الالتزام بالحزم</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{compliancePct}%</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-bold">
            ✔
          </span>
        </div>
      </div>

      {/* Quality Categories Cards */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">أقسام ومعايير الجودة</h3>
          <p className="text-xs text-slate-500 font-semibold">اضغط على أي قسم لعرض وتصفية سياساته مباشرة</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(CATEGORY_META) as CategoryKey[]).map((catKey) => {
            const meta = CATEGORY_META[catKey];
            const count = policies.filter((p) => p.category === catKey).length;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => {
                  onFilterCategory(catKey);
                  onNavigateTab('policies');
                }}
                className="text-right p-5 rounded-2xl border border-slate-200 hover:border-teal-600 hover:shadow-md transition bg-slate-50/60 hover:bg-white flex flex-col justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-3xl">{meta.icon}</span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${meta.badge}`}>
                    {count} سياسات
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-teal-800 transition text-sm sm:text-base">
                    {meta.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-semibold">
                    {meta.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Policies and Bundles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest policies */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-900 text-base">📌 أحدث السياسات المعتمدة بالمستشفى</h4>
            <button
              type="button"
              onClick={() => onNavigateTab('policies')}
              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              عرض الكل ←
            </button>
          </div>
          <div className="space-y-3">
            {featuredPolicies.map((p) => {
              const meta = CATEGORY_META[p.category] || CATEGORY_META.QPI;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 transition flex items-center justify-between gap-3 bg-slate-50/60"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                        {p.code}
                      </span>
                      <span className="text-xs text-slate-500 truncate">{p.dept}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm truncate">{p.title}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(p)}
                      className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer shadow-sm"
                    >
                      قراءة الوثيقة
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPresentation(p)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer shadow-sm"
                      title="عرض تقديمي"
                    >
                      📽️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Featured bundles */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-900 text-base">🧪 حزم الوقاية من العدوى (Clinical Bundles)</h4>
            <button
              type="button"
              onClick={() => onNavigateTab('bundles')}
              className="text-xs font-bold text-red-700 hover:underline cursor-pointer"
            >
              عرض الحزم ←
            </button>
          </div>
          <div className="space-y-3">
            {featuredBundles.map((b) => {
              const checkedCount = (b.items || []).filter((i) => i.checked).length;
              const total = (b.items || []).length;
              const pct = total ? Math.round((checkedCount / total) * 100) : 100;
              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-red-400 transition flex items-center justify-between gap-3 bg-slate-50/60"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                        {b.code}
                      </span>
                      <span className="text-xs text-slate-500">{total} عناصر إلزامية</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm truncate">{b.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('bundles')}
                    className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition cursor-pointer"
                  >
                    الالتزام {pct}%
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
