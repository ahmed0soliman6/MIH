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
      {/* Hero Banner with Mansoura International Hospital Building Background */}
      <div className="rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden bg-slate-950 border border-slate-800">
        {/* Hospital Building Photo - Prominently Displayed */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-65 transition-opacity"
          style={{ backgroundImage: `url('/assets/hospital-bg.jpg')` }}
          aria-hidden="true"
        ></div>

        {/* Gradient overlay for crystal-clear readability while keeping building visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/40 pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-bold backdrop-blur-sm">
            <span>🏥</span>
            <span>مستشفى المنصورة الدولي • الدليل الشامل لسياسات الجودة</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black leading-tight text-white drop-shadow-sm">
            الدليل الشامل لسياسات الجودة وسلامة المرضى
          </h2>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-semibold max-w-2xl">
            نظام رقمي تفاعلي يتيح لك تصفح، قراءة، وتشغيل عروض تدريبية لجميع سياسات المستشفى المعتمدة وفقاً لمعايير الهيئة العامة للاعتماد والرقابة الصحية (GAHAR).
          </p>

          {/* Quick Search in Hero */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث فوراً برقم السياسة، الكود، اسم الإجراء، أو الكلمات المفتاحية..."
                className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white/95 text-slate-900 placeholder-slate-500 font-bold text-sm shadow-md focus:bg-white focus:ring-4 focus:ring-teal-400 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">🔍</span>
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

      {/* Quick Statistics (Crisp Dark Mode Contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي السياسات المعتمدة</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{policies.length}</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center text-2xl font-bold">
            📚
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">حزم الرعاية الإكلينيكية (Bundles)</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{bundles.length}</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 flex items-center justify-center text-2xl font-bold">
            📋
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">متوسط الالتزام بالحزم</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{compliancePct}%</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-2xl font-bold">
            ✔
          </span>
        </div>
      </div>

      {/* Quality Categories Cards (High Contrast in Light and Dark Mode) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            أقسام ومعايير الجودة
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            اضغط على أي قسم لعرض وتصفية سياساته مباشرة
          </p>
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
                className="text-right p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-600 dark:hover:border-teal-400 hover:shadow-md transition bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-3xl">{meta.icon}</span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${meta.badge}`}>
                    {count} سياسات
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition text-sm sm:text-base">
                    {meta.name}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed font-semibold">
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
        {/* Featured Policies */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🌟</span>
              <span>أحدث السياسات المعتمدة</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('policies')}
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
            >
              عرض الكل ({policies.length})
            </button>
          </div>

          <div className="space-y-3">
            {featuredPolicies.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-teal-500 dark:hover:border-teal-500 transition space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                    {p.code}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{p.version}</span>
                </div>

                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {p.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                  {p.purpose}
                </p>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDocument(p)}
                    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>📖 قراءة الوثيقة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPresentation(p)}
                    className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>📽️ تشغيل العرض</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Bundles */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span>
              <span>حزم مكافحة العدوى والوقاية</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('bundles')}
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
            >
              عرض الحزم ({bundles.length})
            </button>
          </div>

          <div className="space-y-3">
            {featuredBundles.map((b) => {
              const total = (b.items || []).length;
              const checkedCount = (b.items || []).filter((i) => i.checked).length;
              const pct = total ? Math.round((checkedCount / total) * 100) : 100;
              return (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-teal-500 dark:hover:border-teal-500 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800">
                      {b.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {pct}% مستوفى
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1">
                    {b.title}
                  </h4>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 dark:bg-teal-500 h-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('bundles')}
                      className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      متابعة التدقيق وقائمة التحقق ←
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
