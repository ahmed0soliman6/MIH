import React, { useState } from 'react';
import { Policy, CategoryKey } from '../types';
import { generateSlidesFromHtml } from '../services/aiAndParsers';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPolicies: (policies: Policy[]) => Promise<void>;
  onShowToast: (message: string) => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  onImportPolicies,
  onShowToast,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [parsedPolicies, setParsedPolicies] = useState<Policy[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Helper to map category names or keys to CategoryKey
  const normalizeCategory = (cat: string): CategoryKey => {
    const c = (cat || '').toLowerCase();
    if (c.includes('wfm') || c.includes('عاملة') || c.includes('تدريب')) return 'WFM';
    if (c.includes('sas') || c.includes('جراحة') || c.includes('تخدير')) return 'SAS';
    if (c.includes('act') || c.includes('وصول') || c.includes('استمرارية') || c.includes('إحالة')) return 'ACT';
    if (c.includes('pcc') || c.includes('متمركزة') || c.includes('مريض')) return 'PCC';
    if (c.includes('imt') || c.includes('تكنولوجيا') || c.includes('معلومات') || c.includes('ملف')) return 'IMT';
    if (c.includes('icd') || c.includes('متكاملة') || c.includes('تقييم')) return 'ICD';
    if (c.includes('fms') || c.includes('منشأة') || c.includes('بيئة')) return 'FMS';
    if (c.includes('er') || c.includes('طوارئ') || c.includes('حرجة') || c.includes('icu') || c.includes('عناية')) return 'ER';
    if (c.includes('mms') || c.includes('دواء') || c.includes('صيدلة')) return 'MMS';
    if (c.includes('nsr') || c.includes('سلامة')) return 'NSR';
    if (c.includes('qpi') || c.includes('جودة')) return 'QPI';
    return 'IPC';
  };

  const parseAndValidate = (rawText: string) => {
    setErrorMsg('');
    setParsedPolicies([]);

    if (!rawText.trim()) return;

    try {
      let data = JSON.parse(rawText.trim());
      if (!Array.isArray(data)) {
        data = [data];
      }

      if (data.length === 0) {
        setErrorMsg('المصفوفة المدخلة فارغة.');
        return;
      }

      const normalized: Policy[] = data.map((item: any, idx: number) => {
        const title = item.title || item.policy_title || `سياسة مستوردة ${idx + 1}`;
        const code = item.code || item.policy_code || `MIH-IMP-${Date.now()}-${idx + 1}`;
        const category = normalizeCategory(item.category || item.category_key || 'IPC');
        const dept = item.target_departments || item.dept || item.department || 'جميع أقسام المستشفى';
        const version = item.version ? (item.version.includes('الإصدار') ? item.version : `الإصدار ${item.version}`) : 'الإصدار 1.0';
        const date = item.effective_date || item.issue_date || item.date || 'أكتوبر 2026';
        
        let purpose = item.purpose || '';
        if (!purpose) {
          if (item.slides && item.slides[0]?.bullet_points?.[0]) {
            purpose = item.slides[0].bullet_points[0];
          } else {
            purpose = `تطبيق معايير وإجراءات ${title} بكفاءة وأمان داخل المستشفى.`;
          }
        }

        const contentHtml = item.content_html || item.html || `<div class="policy-doc"><h3>الغرض من السياسة:</h3><p>${purpose}</p></div>`;
        const plainText = item.plain_text || `${title} ${code} ${dept} ${purpose}`.replace(/\s+/g, ' ').trim();
        
        let slides = Array.isArray(item.slides) && item.slides.length > 0
          ? item.slides
          : generateSlidesFromHtml(contentHtml, title);

        return {
          id: item.id || `pol-${Date.now()}-${idx}`,
          code,
          title,
          category,
          dept,
          version,
          date,
          effectiveDate: item.effective_date || '',
          reviewDate: item.review_date || '',
          purpose,
          responsibilities: item.responsible_persons || item.responsibilities || '',
          content_html: contentHtml,
          plain_text: plainText,
          slides,
          images: Array.isArray(item.images) ? item.images : [],
          source: 'MANUAL',
          updated_at: new Date().toISOString()
        };
      });

      setParsedPolicies(normalized);
    } catch (err: any) {
      setErrorMsg(`خطأ في صياغة JSON: ${err.message || 'تأكد من صحة الأقواس والفواصل'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      parseAndValidate(content);
    };
    reader.onerror = () => {
      setErrorMsg('فشل قراءة الملف.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    parseAndValidate(text);
  };

  const handleExecuteImport = async () => {
    if (parsedPolicies.length === 0) return;

    setIsProcessing(true);
    try {
      await onImportPolicies(parsedPolicies);
      onShowToast(`🎉 تم بنجاح استيراد (${parsedPolicies.length}) سياسات وحفظها فوراً في قاعدة البيانات السحابية!`);
      setIsProcessing(false);
      onClose();
      setJsonText('');
      setParsedPolicies([]);
    } catch (err: any) {
      setIsProcessing(false);
      alert(`حدث خطأ أثناء الحفظ في قاعدة البيانات: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-teal-50/50 dark:bg-teal-950/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">📥</span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                مستورد دفعات الـ JSON الذكي (Direct JSON Importer & Cloud Sync)
              </h3>
              <p className="text-xs text-teal-800 dark:text-teal-300 font-semibold">
                الصق كود الـ JSON من Gemini أو ارفع ملف دفعات ليظهر فوراً ويُحفظ في السحابة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold text-xl transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* File Picker & Paste instructions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              اختر ملف من جهازك أو الصق الكود مباشرة بالأسفل:
            </span>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm">
              <span>📁 رفع ملف JSON من جهازك</span>
              <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Textarea */}
          <div>
            <textarea
              value={jsonText}
              onChange={handleTextChange}
              rows={8}
              placeholder="الصق كود الـ JSON هنا مباشرة (مثال: [{ id: 'IC-21', code: 'SMC/MIH/PO/21', title: '...', ... }])"
              className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
            />
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview of Parsed Policies */}
          {parsedPolicies.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">✓</span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    تم التعرف على ({parsedPolicies.length}) سياسة بنجاح وجاهزة للاستيراد:
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  {parsedPolicies.reduce((acc, p) => acc + (p.slides?.length || 0), 0)} شريحة عرض
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-emerald-100 dark:divide-emerald-900/50">
                {parsedPolicies.map((p, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[11px] text-teal-800 dark:text-teal-300 shrink-0">
                        {p.code}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {p.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {p.dept} • {p.slides?.length || 0} شريحة
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {parsedPolicies.length > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                ⚡ سيتم إدراجها في الواجهة فوراً وحفظها داخل قاعدة بيانات فايرستور
              </span>
            ) : (
              <span>الصق الكود أو اختر ملفاً للبدء</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={parsedPolicies.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white shadow-md transition cursor-pointer flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>جاري الاستيراد والحفظ في السحابة...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>استيراد ({parsedPolicies.length}) وحفظ بالسحابة الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
