import React, { useMemo } from 'react';
import { Policy } from '../types';
import { ORG_HEADER } from '../config/orgHeader';
import { DocumentApproval } from './model';
import { sanitizeHtml } from '../utils/sanitize';
import { highlightHtmlText } from '../utils/arabic';
import './official-doc.css';

export interface OfficialDocumentProps {
  policy: Partial<Policy> & { title: string };
  mode?: 'page' | 'reading';
  watermark?: boolean | string;
  approval?: DocumentApproval;
  searchQuery?: string;
  zoomScale?: number;
}

export function formatVersion(versionStr?: string | null): string {
  if (!versionStr || !versionStr.trim()) return '—';
  const cleaned = versionStr.replace(/^(?:الإصدار|الاصدار|version|v)\s*[:：#]?\s*/i, '').trim();
  if (!cleaned) return '—';
  return `الإصدار ${cleaned}`;
}

export const OfficialDocument: React.FC<OfficialDocumentProps> = ({
  policy,
  mode = 'page',
  watermark = false,
  approval,
  searchQuery = '',
  zoomScale = 1,
}) => {
  // Sanitize and highlight content HTML (sanitize after highlighting)
  const renderedContent = useMemo(() => {
    const raw = policy.content_html || '';
    if (!searchQuery || !searchQuery.trim()) {
      return sanitizeHtml(raw);
    }
    const highlighted = highlightHtmlText(raw, searchQuery.trim()).html;
    return sanitizeHtml(highlighted);
  }, [policy.content_html, searchQuery]);

  const responsibilitiesText = useMemo(() => {
    if (!policy.responsibilities) return '';
    return Array.isArray(policy.responsibilities)
      ? policy.responsibilities.join(' • ')
      : policy.responsibilities;
  }, [policy.responsibilities]);

  // Clean values: no invented defaults; if missing, show '—'
  const code = policy.code || '—';
  const effectiveDate = policy.effectiveDate || policy.date || '—';
  const reviewDate = policy.reviewDate || '—';
  const formattedVersion = formatVersion(policy.version);
  const dept = policy.dept || '—';

  return (
    <div className={`mih-doc-wrapper flex justify-center w-full ${mode === 'page' ? 'py-4 overflow-x-auto' : ''}`}>
      <article
        className={`mih-doc mode-${mode}`}
        style={mode === 'page' && zoomScale !== 1 ? { zoom: zoomScale } : undefined}
      >
        {/* Optional Watermark */}
        {watermark && (
          <div className="mih-watermark">
            {typeof watermark === 'string' ? watermark : 'نسخة غير مضبوطة عند الطباعة'}
          </div>
        )}

        {/* Outer table structure for print header/footer repetition */}
        <table className="mih-print-frame">
          <thead className="mih-print-thead">
            <tr>
              <td>
                {/* 1. Official Three-Column Organization Header */}
                <header className="border-b-2 border-slate-900 dark:border-slate-600 pb-3 mb-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    {/* Arabic Right Details */}
                    <div className="text-right text-[11px] sm:text-xs font-bold leading-snug text-slate-800 dark:text-slate-200 shrink-0">
                      <p className="font-extrabold text-slate-950 dark:text-white">{ORG_HEADER.ar.ministry}</p>
                      <p>{ORG_HEADER.ar.organization}</p>
                      <p className="font-black text-teal-800 dark:text-teal-400">{ORG_HEADER.ar.hospital}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">{ORG_HEADER.ar.department}</p>
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
                      className="text-left text-[10px] sm:text-[11px] font-semibold leading-snug text-slate-800 dark:text-slate-200 shrink-0 font-mono"
                    >
                      <p className="font-extrabold text-slate-950 dark:text-white">{ORG_HEADER.en.ministry}</p>
                      <p>{ORG_HEADER.en.organization}</p>
                      <p className="font-black text-teal-800 dark:text-teal-400">{ORG_HEADER.en.hospital}</p>
                      <p className="text-[9px] text-slate-600 dark:text-slate-400">{ORG_HEADER.en.department}</p>
                    </div>
                  </div>
                </header>
              </td>
            </tr>
          </thead>

          <tfoot className="mih-print-tfoot">
            <tr>
              <td>
                {/* Document Footer repeated on every printed page */}
                <footer className="mt-6 pt-3 border-t border-slate-300 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>{code}</span>
                  <span>مستشفى المنصورة الدولي • إدارة الجودة</span>
                  <span>{formattedVersion}</span>
                </footer>
              </td>
            </tr>
          </tfoot>

          <tbody>
            <tr>
              <td>
                {/* 2. Document Title Banner */}
                <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center mb-4">
                  <h1 className="text-base sm:text-xl font-black text-slate-950 dark:text-white leading-snug">
                    {policy.title}
                  </h1>
                  <p className="text-xs font-bold text-teal-800 dark:text-teal-400 font-mono mt-0.5">
                    {code} • {policy.category || '—'}
                  </p>
                </div>

                {/* 3. Official Metadata Table (Clean, no fake dates, no duplicate dept) */}
                <div className="mih-table-wrap mb-5">
                  <table className="mih-table text-xs">
                    <tbody>
                      <tr>
                        <th className="w-1/4">كود السياسة:</th>
                        <td className="w-1/4 font-mono font-bold">{code}</td>
                        <th className="w-1/4">رقم الإصدار:</th>
                        <td className="w-1/4 font-mono">{formattedVersion}</td>
                      </tr>
                      <tr>
                        <th>تاريخ السريان:</th>
                        <td className="font-mono">{effectiveDate}</td>
                        <th>تاريخ المراجعة القادمة:</th>
                        <td className="font-mono">{reviewDate}</td>
                      </tr>
                      <tr>
                        <th>الأقسام المستهدفة:</th>
                        <td colSpan={3}>{dept}</td>
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

                {/* 6. Official Approval Block (خانات فارغة للاسم / الوظيفة / التوقيع / التاريخ) */}
                <section className="mt-8 pt-4 border-t-2 border-slate-300 dark:border-slate-700 break-inside-avoid">
                  <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2">اعتماد وتوثيق الوثيقة:</h3>
                  <table className="mih-table text-xs text-right">
                    <thead>
                      <tr>
                        <th className="w-1/3 text-center">إعداد</th>
                        <th className="w-1/3 text-center">مراجعة</th>
                        <th className="w-1/3 text-center">اعتماد</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-3 px-2">
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">الاسم: <span className="font-normal text-slate-900 dark:text-slate-100">{approval?.preparedBy?.name || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">الوظيفة: <span className="font-normal text-slate-900 dark:text-slate-100">{approval?.preparedBy?.title || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">التوقيع: <span className="font-normal font-mono text-slate-900 dark:text-slate-100">{approval?.preparedBy?.signature || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px]">التاريخ: <span className="font-normal font-mono text-slate-900 dark:text-slate-100">{approval?.preparedBy?.date || ''}</span></p>
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">الاسم: <span className="font-normal text-slate-900 dark:text-slate-100">{approval?.reviewedBy?.name || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">الوظيفة: <span className="font-normal text-slate-900 dark:text-slate-100">{approval?.reviewedBy?.title || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">التوقيع: <span className="font-normal font-mono text-slate-900 dark:text-slate-100">{approval?.reviewedBy?.signature || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px]">التاريخ: <span className="font-normal font-mono text-slate-900 dark:text-slate-100">{approval?.reviewedBy?.date || ''}</span></p>
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">الاسم: <span className="font-normal text-slate-900 dark:text-slate-100">{approval?.approvedBy?.name || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">الوظيفة: <span className="font-normal text-slate-900 dark:text-slate-100">{approval?.approvedBy?.title || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mb-1">التوقيع: <span className="font-normal font-mono text-slate-900 dark:text-slate-100">{approval?.approvedBy?.signature || ''}</span></p>
                          <p className="font-bold text-slate-800 dark:text-slate-300 text-[11px]">التاريخ: <span className="font-normal font-mono text-slate-900 dark:text-slate-100">{approval?.approvedBy?.date || ''}</span></p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
};
