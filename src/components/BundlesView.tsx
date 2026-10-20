import React from 'react';
import { Bundle } from '../types';

interface BundlesViewProps {
  bundles: Bundle[];
  onToggleItem: (bundleId: string, itemIndex: number, checked: boolean) => void;
  onCheckAll: (bundleId: string) => void;
}

export const BundlesView: React.FC<BundlesViewProps> = ({
  bundles,
  onToggleItem,
  onCheckAll,
}) => {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          حزم الرعاية الإكلينيكية التفاعلية (Clinical Bundles)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          متابعة تطبيق قوائم التحقق لخفض عدوى المستشفيات وفق معايير الجودة ومكافحة العدوى
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bundles.map((b) => {
          const total = (b.items || []).length;
          const checkedCount = (b.items || []).filter((i) => i.checked).length;
          const pct = total ? Math.round((checkedCount / total) * 100) : 100;
          const isFull = pct === 100;

          return (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between space-y-5 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900">
                    {b.code}
                  </span>
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                      isFull
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    نسبة الالتزام بالحزمة: {pct}% ({checkedCount}/{total})
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-800 dark:text-slate-200">الأقسام المستهدفة:</strong> {b.dept} • <strong className="text-slate-800 dark:text-slate-200">الهدف:</strong> {b.goal}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`${isFull ? 'bg-emerald-600' : 'bg-teal-600'} h-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                {/* Checklist items */}
                <div className="space-y-2 pt-2">
                  {(b.items || []).map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        item.checked
                          ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-slate-900 dark:text-teal-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      } cursor-pointer hover:border-teal-500 transition`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => onToggleItem(b.id, idx, e.target.checked)}
                        className="mt-1 w-4 h-4 accent-teal-700 rounded cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onCheckAll(b.id)}
                  className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  ✔ تأشير استيفاء جميع عناصر الحزمة (100%)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
