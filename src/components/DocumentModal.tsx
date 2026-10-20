import React from 'react';
import { Policy } from '../types';
import { CATEGORY_META } from '../data/initialData';

interface DocumentModalProps {
  policy: Policy | null;
  isOpen: boolean;
  isAuthorizedAdmin: boolean;
  onClose: () => void;
  onLaunchPresentation: (policy: Policy) => void;
  onEditPolicy: (policy: Policy) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  policy,
  isOpen,
  isAuthorizedAdmin,
  onClose,
  onLaunchPresentation,
  onEditPolicy,
}) => {
  if (!isOpen || !policy) return null;

  const meta = CATEGORY_META[policy.category] || CATEGORY_META.QPI;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Toolbar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <span className="font-extrabold text-sm sm:text-base">
              وضع الوثيقة الرسمية (Document Mode)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLaunchPresentation(policy);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>📽️</span>
              <span>تشغيل العرض التقديمي</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="طباعة السياسة بتنسيق A4"
            >
              <span>🖨️</span>
              <span>طباعة</span>
            </button>

            {isAuthorizedAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPolicy(policy);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>✏️</span>
                <span>تعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="p-6 sm:p-10 overflow-y-auto custom-scroll space-y-6 print-document-mode">
          {/* Hospital Header Seal */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-slate-900 print-header-seal">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo.jpg"
                alt="شعار المستشفى"
                className="w-14 h-14 object-contain rounded"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
                }}
              />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">مستشفى المنصورة الدولي</h2>
                <p className="text-xs text-slate-600 font-bold">
                  أمانة المراكز الطبية المتخصصة (SMC) • إدارة الجودة وسلامة المرضى
                </p>
              </div>
            </div>
            <div className="text-left font-mono text-xs text-slate-600 space-y-1">
              <div>
                <strong className="text-slate-900">كود الوثيقة:</strong> {policy.code}
              </div>
              <div>
                <strong className="text-slate-900">تاريخ الاعتماد:</strong> {policy.date}
              </div>
              <div>
                <strong className="text-slate-900">رقم الإصدار:</strong> {policy.version}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border inline-block ${meta.badge}`}>
              {policy.code} • {meta.name}
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-snug">{policy.title}</h1>
            <p className="text-xs text-slate-500 font-bold">
              الأقسام المعنية بالتطبيق: <span className="text-slate-800 font-semibold">{policy.dept}</span>
            </p>
          </div>

          {/* Purpose Box */}
          <div className="p-4 rounded-xl bg-teal-50/80 border-r-4 border-teal-700 text-teal-950 space-y-1">
            <h4 className="text-xs font-black text-teal-900 uppercase">الهدف الإجرائي من السياسة:</h4>
            <p className="text-sm font-semibold leading-relaxed">{policy.purpose}</p>
          </div>

          {/* Full Rich HTML Content */}
          <div
            className="policy-content-html border-t border-slate-100 pt-4"
            dangerouslySetInnerHTML={{ __html: policy.content_html }}
          ></div>
        </div>
      </div>
    </div>
  );
};
