import React, { useState } from 'react';
import { CategoryKey, Policy } from '../../types';
import { CATEGORY_META } from '../../data/meta';
import { formatVersion } from '../../doc/OfficialDocument';

interface StudioMetadataPanelProps {
  title: string;
  onChangeTitle: (val: string) => void;
  code: string;
  onChangeCode: (val: string) => void;
  category: string;
  onChangeCategory: (val: string) => void;
  dept: string;
  onChangeDept: (val: string) => void;
  version: string;
  onChangeVersion: (val: string) => void;
  effectiveDate: string;
  onChangeEffectiveDate: (val: string) => void;
  reviewDate: string;
  onChangeReviewDate: (val: string) => void;
  responsibilities: string;
  onChangeResponsibilities: (val: string) => void;
  purpose: string;
  onChangePurpose: (val: string) => void;
  existingPolicies?: Policy[];
  currentPolicyId?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const StudioMetadataPanel: React.FC<StudioMetadataPanelProps> = ({
  title,
  onChangeTitle,
  code,
  onChangeCode,
  category,
  onChangeCategory,
  dept,
  onChangeDept,
  version,
  onChangeVersion,
  effectiveDate,
  onChangeEffectiveDate,
  reviewDate,
  onChangeReviewDate,
  responsibilities,
  onChangeResponsibilities,
  purpose,
  onChangePurpose,
  existingPolicies = [],
  currentPolicyId,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [isCustomCategory, setIsCustomCategory] = useState(
    !Object.keys(CATEGORY_META).includes(category) && Boolean(category)
  );

  // Check code uniqueness
  const isDuplicateCode = Boolean(
    code.trim() &&
      existingPolicies.some(
        (p) =>
          p.code.trim().toLowerCase() === code.trim().toLowerCase() &&
          p.id !== currentPolicyId
      )
  );

  return (
    <aside
      className={`transition-all duration-300 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col ${
        isCollapsed ? 'w-12 items-center' : 'w-full md:w-80 p-4'
      }`}
      dir="rtl"
    >
      {/* Toggle button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 w-full">
        {!isCollapsed && (
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>📋</span>
            <span>بيانات الوثيقة والاعتماد</span>
          </h3>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition text-xs"
          title={isCollapsed ? 'توسيع لوحة البيانات' : 'طي لوحة البيانات'}
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-3.5 overflow-y-auto pr-0.5 text-xs flex-1">
          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              عنوان السياسة: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="مثال: سياسة مكافحة العدوى ونظافة الأيدي"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* Code */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              كود السياسة: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => onChangeCode(e.target.value)}
              placeholder="مثال: SMC/MIH/PO/1"
              className={`w-full p-2 rounded-lg border font-mono ${
                isDuplicateCode
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              } focus:ring-2 focus:ring-teal-500 focus:outline-none`}
              required
            />
            {isDuplicateCode && (
              <p className="text-[10px] text-rose-500 mt-1 font-semibold">
                ⚠️ هذا الكود مستخدم بالفعل في سياسة أخرى!
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              القسم / التصنيف المعياري:
            </label>
            {!isCustomCategory ? (
              <div className="space-y-1.5">
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomCategory(true);
                      onChangeCategory('');
                    } else {
                      onChangeCategory(e.target.value);
                    }
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {Object.entries(CATEGORY_META).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.badge} - {info.name}
                    </option>
                  ))}
                  <option value="CUSTOM">+ تصنيف مخصص...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => onChangeCategory(e.target.value)}
                  placeholder="اسم التصنيف المخصص"
                  className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(false);
                    onChangeCategory('QPI');
                  }}
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300"
                >
                  قائمة
                </button>
              </div>
            )}
          </div>

          {/* Target Department */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              الأقسام المستهدفة:
            </label>
            <input
              type="text"
              value={dept}
              onChange={(e) => onChangeDept(e.target.value)}
              placeholder="مثال: جميع أقسام المستشفى"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Version */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                رقم الإصدار:
              </label>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">
                {formatVersion(version)}
              </span>
            </div>
            <input
              type="text"
              value={version}
              onChange={(e) => onChangeVersion(e.target.value)}
              placeholder="مثال: 1.0 أو الإصدار 2"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ السريان:
              </label>
              <input
                type="text"
                value={effectiveDate}
                onChange={(e) => onChangeEffectiveDate(e.target.value)}
                placeholder="يوم/شهر/سنة"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                المراجعة القادمة:
              </label>
              <input
                type="text"
                value={reviewDate}
                onChange={(e) => onChangeReviewDate(e.target.value)}
                placeholder="يوم/شهر/سنة"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              المسؤوليات والإشراف:
            </label>
            <input
              type="text"
              value={responsibilities}
              onChange={(e) => onChangeResponsibilities(e.target.value)}
              placeholder="مثال: الفريق الطبي - رئيس القسم - إدارة الجودة"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              الهدف / الغرض من السياسة:
            </label>
            <textarea
              value={purpose}
              onChange={(e) => onChangePurpose(e.target.value)}
              placeholder="ملخص الغرض من السياسة..."
              rows={3}
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      )}
    </aside>
  );
};
