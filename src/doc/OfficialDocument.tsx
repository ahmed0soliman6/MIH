import React, { useMemo } from 'react';
import { Policy } from '../types';
import { ORG_HEADER } from '../config/orgHeader';
import { DocumentApproval, DEFAULT_APPROVAL } from './model';
import { sanitizeHtml } from '../utils/sanitize';
import { highlightHtmlText } from '../utils/arabic';
import './official-doc.css';

export interface OfficialDocumentProps {
  policy: Pick<
    Policy,
    | 'title'
    | 'code'
    | 'category'
    | 'dept'
    | 'version'
    | 'date'
    | 'effectiveDate'
    | 'reviewDate'
    | 'purpose'
    | 'content_html'
    | 'responsibilities'
  >;
  mode?: 'page' | 'reading';
  watermark?: boolean;
  approval?: DocumentApproval;
  searchQuery?: string;
  zoomScale?: number;
}

export const OfficialDocument: React.FC<OfficialDocumentProps> = ({
  policy,
  mode = 'page',
  watermark = false,
  approval = DEFAULT_APPROVAL,
  searchQuery = '',
  zoomScale = 1,
}) => {
  // Sanitize and highlight content HTML
  const renderedContent = useMemo(() => {
    const raw = policy.content_html || '';
    const clean = sanitizeHtml(raw);
    if (!searchQuery || !searchQuery.trim()) {
      return clean;
    }
    return highlightHtmlText(clean, searchQuery.trim()).html;
  }, [policy.content_html, searchQuery]);

  const responsibilitiesText = useMemo(() => {
    if (!policy.responsibilities) return '';
    return Array.isArray(policy.responsibilities)
      ? policy.responsibilities.join(' • ')
      : policy.responsibilities;
  }, [policy.responsibilities]);

  // Clean dates: replace any missing or fake dates with '—'
  const effectiveDate = policy.effectiveDate || policy.date || '—';
  const reviewDate = policy.reviewDate || '—';
  const version = policy.version || '1.0';

  return (
    <div
      className={`mih-doc-wrapper flex justify-center w-full ${mode === 'page' ? 'py-4 overflow-x-auto' : ''}`}
    >
      <article
        className={`mih-doc mode-${mode}`}
        style={
          mode === 'page' && zoomScale !== 1
            ? {
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                marginBottom: `${(zoomScale - 1) * 297}mm`,
              }
            : undefined
        }
      >
        {/* Optional Watermark */}
        {watermark && <div className="mih-watermark">نسخة غير مضبوطة عند الطباعة</div>}

        {/* 1. Official Three-Column Organization Header */}
        <header className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Arabic Right Details */}
            <div className="text-right text-[11px] sm:text-xs font-bold leading-tight text-slate-800 shrink-0">
              <p className="font-extrabold text-slate-950">{ORG_HEADER.ar.ministry}</p>
              <p>{ORG_HEADER.ar.organization}</p>
              <p className="font-black text-teal-800">{ORG_HEADER.ar.hospital}</p>
              <p className="text-[10px] text-slate-600">{ORG_HEADER.ar.department}</p>
            </div>

            {/* Official Center Hospital Logo */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <img
                src={ORG_HEADER.logoUrl}
                alt="شعار مستشفى المنصورة الدولي"
                className="h-14 sm:h-16 w-auto object-contain max-w-[90px]"
                loading="eager"
              />
            </div>

            {/* English Left Details (LTR) */}
            <div
              dir="ltr"
              className="text-left text-[10px] sm:text-[11px] font-semibold leading-tight text-slate-800 shrink-0 font-mono"
            >
              <p className="font-extrabold text-slate-950">{ORG_HEADER.en.ministry}</p>
              <p>{ORG_HEADER.en.organization}</p>
              <p className="font-black text-teal-800">{ORG_HEADER.en.hospital}</p>
              <p className="text-[9px] text-slate-600">{ORG_HEADER.en.department}</p>
            </div>
          </div>
        </header>

        {/* 2. Document Title Banner */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-center mb-4">
          <h1 className="text-base sm:text-xl font-black text-slate-950 leading-snug">
            {policy.title}
          </h1>
          <p className="text-xs font-bold text-teal-800 font-mono mt-0.5">
            {policy.code} • {policy.category || 'سياسة تشغيلية معتمدة'}
          </p>
        </div>

        {/* 3. Official Metadata Table (Clean, no fake dates) */}
        <div className="mih-table-wrap mb-5">
          <table className="mih-table text-xs">
            <tbody>
              <tr>
                <th className="w-1/4">كود السياسة:</th>
                <td className="w-1/4 font-mono font-bold">{policy.code}</td>
                <th className="w-1/4">رقم الإصدار:</th>
                <td className="w-1/4 font-mono">{version}</td>
              </tr>
              <tr>
                <th>تاريخ التفعيل / السريان:</th>
                <td className="font-mono">{effectiveDate}</td>
                <th>تاريخ المراجعة القادمة:</th>
                <td className="font-mono">{reviewDate}</td>
              </tr>
              <tr>
                <th>القسم المسؤول / المعتمد:</th>
                <td>{policy.dept || 'إدارة المستشفى'}</td>
                <th>الفئات والأقسام المعنية:</th>
                <td>{policy.dept || 'جميع الأقسام ذات الصلة'}</td>
              </tr>
              {responsibilitiesText && (
                <tr>
                  <th>المسؤوليات والإشراف:</th>
                  <td colSpan={3} className="leading-relaxed">
                    {responsibilitiesText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Purpose Section */}
        {policy.purpose && (
          <section className="mih-sec mb-5" data-style="bar">
            <h2 className="mih-h2">الغرض من السياسة (Purpose)</h2>
            <p className="mih-p">{policy.purpose}</p>
          </section>
        )}

        {/* 5. Document Content Body */}
        <main
          className="mih-doc-body"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* 6. Official Approval Block (أعد / راجع / اعتمد) */}
        <section className="mt-8 pt-4 border-t-2 border-slate-300 break-inside-avoid">
          <h3 className="text-xs font-black text-slate-700 mb-2">اعتماد وتوثيق الوثيقة:</h3>
          <table className="mih-table text-xs text-center">
            <thead>
              <tr>
                <th className="text-center w-1/3">إعداد (Prepared By)</th>
                <th className="text-center w-1/3">مراجعة (Reviewed By)</th>
                <th className="text-center w-1/3">اعتماد (Approved By)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2.5">
                  <p className="font-bold text-slate-900">{approval.preparedBy.name}</p>
                  <p className="text-[11px] text-slate-600">{approval.preparedBy.title}</p>
                  <p className="text-[10px] text-teal-700 font-mono mt-1">
                    {approval.preparedBy.signature || 'معتمد'}
                  </p>
                </td>
                <td className="py-2.5">
                  <p className="font-bold text-slate-900">{approval.reviewedBy.name}</p>
                  <p className="text-[11px] text-slate-600">{approval.reviewedBy.title}</p>
                  <p className="text-[10px] text-teal-700 font-mono mt-1">
                    {approval.reviewedBy.signature || 'معتمد'}
                  </p>
                </td>
                <td className="py-2.5">
                  <p className="font-bold text-slate-900">{approval.approvedBy.name}</p>
                  <p className="text-[11px] text-slate-600">{approval.approvedBy.title}</p>
                  <p className="text-[10px] text-teal-700 font-mono mt-1">
                    {approval.approvedBy.signature || 'معتمد رسمياً'}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 7. Document Footer */}
        <footer className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>{policy.code}</span>
          <span>مستشفى المنصورة الدولي • إدارة الجودة</span>
          <span>نسخة معتمدة v{version}</span>
        </footer>
      </article>
    </div>
  );
};
