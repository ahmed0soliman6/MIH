import React, { useState, useMemo } from 'react';
import { Policy, CategoryKey } from '../types';
import { CATEGORY_META, isManualPolicy } from '../data/initialData';

interface DepartmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  policies: Policy[];
  onSelectPolicy: (policy: Policy) => void;
  onLaunchPresentation?: (policy: Policy) => void;
  onSelectCategory?: (category: string) => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  isOpen,
  onClose,
  policies,
  onSelectPolicy,
  onLaunchPresentation,
  onSelectCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Group policies by category
  const groupedPolicies = useMemo(() => {
    const groups: Record<CategoryKey, Policy[]> = {
      IPC: [],
      NSR: [],
      FMS: [],
      ER: [],
      MMS: [],
      QPI: [],
      ICD: [],
      PCC: [],
      IMT: [],
      ACT: [],
      SAS: [],
    };

    const cleanSearch = searchTerm.trim().toLowerCase();

    policies.forEach((p) => {
      const cat = p.category in groups ? p.category : 'QPI';
      if (!cleanSearch) {
        groups[cat].push(p);
      } else {
        const matchTitle = (p.title || '').toLowerCase().includes(cleanSearch);
        const matchCode = (p.code || '').toLowerCase().includes(cleanSearch);
        const matchDept = (p.dept || '').toLowerCase().includes(cleanSearch);
        const matchPurpose = (p.purpose || '').toLowerCase().includes(cleanSearch);
        if (matchTitle || matchCode || matchDept || matchPurpose) {
          groups[cat].push(p);
        }
      }
    });

    return groups;
  }, [policies, searchTerm]);

  const categoriesOrder: CategoryKey[] = ['IPC', 'NSR', 'SAS', 'ER', 'ICD', 'ACT', 'MMS', 'PCC', 'IMT', 'FMS', 'QPI'];

  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 transform ease-in-out"
      dir="rtl"
      aria-label="قائمة أقسام وسياسات المستشفى"
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            📂
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              أقسام وسياسات المستشفى
            </h3>
            <p className="text-[11px] text-teal-700 dark:text-teal-400 font-bold">
              {policies.length} سياسة معتمدة في الدليل
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center font-bold text-lg transition cursor-pointer"
          title="إغلاق القائمة"
        >
          ✕
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث فوري في الأقسام والسياسات..."
            className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Categories & Policies List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {categoriesOrder.map((catKey) => {
          const meta = CATEGORY_META[catKey] || CATEGORY_META.QPI;
          const catPolicies = groupedPolicies[catKey] || [];
          const isExpanded = expandedCategories[catKey] ?? true;

          if (searchTerm && catPolicies.length === 0) {
            return null;
          }

          return (
            <div
              key={catKey}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs hover:border-teal-400 dark:hover:border-teal-600 transition"
            >
              {/* Category Header Card - Clicking anywhere on card navigates directly to the department page */}
              <div
                onClick={() => {
                  if (onSelectCategory) {
                    onSelectCategory(catKey);
                  }
                  onClose();
                }}
                className="w-full p-3.5 flex items-center justify-between gap-3 hover:bg-teal-50/70 dark:hover:bg-teal-950/40 transition cursor-pointer text-right group"
                title={`فتح صفحة ${meta.name} واستعراض كافة سياساتها (${catPolicies.length})`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition shadow-2xs">
                    {meta.icon}
                  </div>
                  <div className="truncate">
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white block truncate group-hover:text-teal-700 dark:group-hover:text-teal-300 leading-tight">
                      {meta.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block mt-0.5">
                      {catPolicies.length} {catKey} سياسة
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 group-hover:text-teal-800 dark:group-hover:text-teal-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition">
                    <span>{catPolicies.length}</span>
                    <span className="text-[10px] text-slate-400">◀</span>
                  </span>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategory(catKey);
                    }}
                    className="w-6 h-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs text-slate-400 transition"
                    title="عرض / إخفاء القائمة الفرعية"
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Policies in this category if expanded or during search */}
              {(isExpanded || (searchTerm && catPolicies.length > 0)) && (
                <div className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/50">
                  {catPolicies.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic">
                      لا توجد سياسات مطابقة في هذا القسم
                    </div>
                  ) : (
                    catPolicies.map((p) => {
                      const isManual = isManualPolicy(p);
                      const slidesCount = p.slides?.length || 0;

                      return (
                        <div
                          key={p.id}
                          className="p-2.5 hover:bg-teal-50/60 dark:hover:bg-teal-950/30 transition group flex items-start justify-between gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPolicy(p);
                              // Auto-close on mobile
                              if (window.innerWidth < 768) onClose();
                            }}
                            className="flex-1 text-right space-y-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {p.code}
                              </span>
                              {isManual && (
                                <span
                                  className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                  title="من مجلد السياسات المعتمد"
                                >
                                  📖 المجلد
                                </span>
                              )}
                              {slidesCount > 0 && (
                                <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400">
                                  📊 {slidesCount} شريحة
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 leading-snug line-clamp-2">
                              {p.title}
                            </h4>

                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              القسم: {p.dept}
                            </p>
                          </button>

                          {/* Quick presentation button */}
                          {onLaunchPresentation && (
                            <button
                              type="button"
                              onClick={() => {
                                onLaunchPresentation(p);
                                if (window.innerWidth < 768) onClose();
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-700 transition cursor-pointer flex-shrink-0"
                              title="تشغيل عرض الشرائح"
                            >
                              📽️
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
        <p className="text-[11px] text-slate-500 font-semibold">
          مستشفى المنصورة الدولي • إدارة الجودة ومكافحة العدوى
        </p>
      </div>
    </aside>
  );
};
