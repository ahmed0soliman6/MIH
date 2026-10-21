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

  const handleExportPdf = () => {
    const element = document.getElementById('printable-policy-document');
    if (!element) return;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${policy.code || 'MIH'}_${policy.title.replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const html2pdf = (window as any).html2pdf;
    if (typeof html2pdf === 'function') {
      html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Top Toolbar */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">📖</span>
            <div className="min-w-0">
              <span className="font-extrabold text-xs sm:text-sm block truncate">
                {policy.title}
              </span>
              <span className="text-[10px] text-teal-400 font-mono">
                {policy.code} • وثيقة السياسة الرسمية المعتمدة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLaunchPresentation(policy);
              }}
              className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>📽️</span>
              <span className="hidden sm:inline">عرض الشرائح</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="تنزيل السياسة كملف PDF منسق بضغطة زر"
            >
              <span>📥</span>
              <span className="hidden sm:inline">تحميل PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="طباعة السياسة الرسمية المعتمدة بتنسيق A4"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">طباعة معتمدة</span>
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
                <span className="hidden sm:inline">تعديل</span>
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

        {/* Document Content for Screen & Print */}
        <div id="printable-policy-document" className="p-6 sm:p-10 overflow-y-auto custom-scroll space-y-6 print-document-mode text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 print:bg-white print:text-black print:p-0">
          
          {/* Official Hospital Letterhead Seal */}
          <div className="pb-5 border-b-2 border-slate-900 dark:border-slate-600 print:border-black flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo.jpg"
                alt="شعار المستشفى"
                className="w-14 h-14 object-contain rounded p-0.5 bg-white border border-slate-200 print:border-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
                }}
              />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-black">
                  جمهورية مصر العربية • وزارة الصحة والسكان
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300 print:text-black font-extrabold">
                  أمانة المراكز الطبية المتخصصة (SMC) • مستشفى المنصورة الدولي
                </p>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 print:text-black font-bold">
                  الإدارة العامة للجودة وتطوير الأداء وسلامة المرضى
                </p>
              </div>
            </div>

            <div className="text-left font-mono text-xs text-slate-700 dark:text-slate-300 print:text-black space-y-1">
              <div>
                <strong className="text-slate-900 dark:text-white print:text-black">كود السياسة:</strong> {policy.code}
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white print:text-black">رقم الإصدار:</strong> {policy.version}
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white print:text-black">تاريخ الاعتماد:</strong> {policy.date || 'فبراير 2025'}
              </div>
            </div>
          </div>

          {/* Policy Title & Accreditation Category Meta */}
          <div className="space-y-2">
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border inline-block ${meta.badge} print:border-slate-800 print:bg-slate-100 print:text-black`}>
              {policy.code} • {meta.name}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print:text-black leading-snug">
              {policy.title}
            </h1>
          </div>

          {/* Formal Metadata Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-black">
                <tr className="bg-slate-50 dark:bg-slate-950/40 print:bg-slate-100">
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 print:text-black w-1/4">الأقسام المعنية بالتطبيق:</td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100 print:text-black">{policy.dept}</td>
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 print:text-black w-1/5">المسؤوليات:</td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100 print:text-black">
                    {Array.isArray(policy.responsibilities) ? policy.responsibilities.join(' • ') : (policy.responsibilities || 'الأطباء والتمريض وفريق الجودة')}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 print:text-black">تاريخ بدء السريان:</td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100 print:text-black">{policy.effectiveDate || '1/3/2025'}</td>
                  <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 print:text-black">تاريخ المراجعة القادمة:</td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100 print:text-black">{policy.reviewDate || '1/3/2028'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Purpose Box */}
          <div className="p-4 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border-r-4 border-teal-700 text-teal-950 dark:text-teal-200 print:bg-slate-50 print:text-black space-y-1">
            <h4 className="text-xs font-black text-teal-900 dark:text-teal-300 print:text-black uppercase">
              الهدف الإجرائي من السياسة:
            </h4>
            <p className="text-sm font-semibold leading-relaxed">{policy.purpose}</p>
          </div>

          {/* Full Rich HTML Content */}
          <div
            className="policy-content-html border-t border-slate-100 dark:border-slate-800 print:border-black pt-4 text-slate-800 dark:text-slate-200 print:text-black"
            dangerouslySetInnerHTML={{ __html: policy.content_html }}
          ></div>

          {/* Official Signatures Block - Appears in print & document mode */}
          <div className="pt-8 mt-10 border-t-2 border-slate-300 dark:border-slate-700 print:border-black grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs print:grid-cols-3 print:pt-6">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 print:border-black bg-slate-50 dark:bg-slate-950/60 print:bg-white space-y-3">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 print:text-black block">إعداد وتنسيق (Prepared by)</span>
              <div className="h-10 border-b border-dashed border-slate-400 print:border-black"></div>
              <span className="text-[11px] text-slate-500 print:text-black font-bold block">منسق جودة القسم المعني</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 print:border-black bg-slate-50 dark:bg-slate-950/60 print:bg-white space-y-3">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 print:text-black block">مراجعة وتدقيق (Reviewed by)</span>
              <div className="h-10 border-b border-dashed border-slate-400 print:border-black"></div>
              <span className="text-[11px] text-slate-500 print:text-black font-bold block">مدير إدارة الجودة وسلامة المرضى</span>
            </div>

            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900 print:border-black bg-teal-50/50 dark:bg-teal-950/40 print:bg-white space-y-3 relative">
              <span className="font-black text-teal-900 dark:text-teal-200 print:text-black block">اعتماد نهائي (Approved by)</span>
              <div className="h-10 border-b border-dashed border-teal-400 print:border-black"></div>
              <span className="text-[11px] text-teal-800 dark:text-teal-300 print:text-black font-extrabold block">مدير عام مستشفى المنصورة الدولي</span>
              <div className="absolute top-2 left-2 w-12 h-12 rounded-full border-2 border-teal-600/30 print:border-black flex items-center justify-center text-[8px] font-black text-teal-700/50 print:text-black transform -rotate-12 pointer-events-none">
                معتمد رسمي
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
