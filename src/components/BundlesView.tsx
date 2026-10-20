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
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
          حزم الرعاية الإكلينيكية التفاعلية (Clinical Bundles)
        </h2>
        <p className="text-xs text-slate-500 font-semibold">
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
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                    {b.code}
                  </span>
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                      isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    نسبة الالتزام بالحزمة: {pct}% ({checkedCount}/{total})
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{b.title}</h3>
                <p className="text-xs text-slate-500">
                  <strong>الأقسام المستهدفة:</strong> {b.dept} • <strong>الهدف:</strong> {b.goal}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
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
                          ? 'bg-teal-50/60 border-teal-200'
                          : 'bg-slate-50 border-slate-200'
                      } cursor-pointer hover:border-teal-500 transition`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => onToggleItem(b.id, idx, e.target.checked)}
                        className="mt-1 w-4 h-4 accent-teal-700 rounded cursor-pointer"
                      />
                      <span
                        className={`text-xs sm:text-sm font-semibold ${
                          item.checked ? 'text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onCheckAll(b.id)}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
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
