import React, { useState } from 'react';
import { Policy, CategoryKey } from '../types';
import { generateSlidesFromHtml } from '../services/aiAndParsers';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPolicies: (
    policies: Policy[],
    onProgress?: (progress: { current: number; total: number; percent: number }) => void
  ) => Promise<{ addedCount?: number; updatedCount?: number } | void>;
  onShowToast: (message: string) => void;
  existingPolicies?: Policy[];
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  onImportPolicies,
  onShowToast,
  existingPolicies = [],
}) => {
  const [jsonText, setJsonText] = useState('');
  const [parsedPolicies, setParsedPolicies] = useState<Policy[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);

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

  const normalizeList = (list: any[]): Policy[] => {
    return list.map((item: any, idx: number) => {
      const title = item.title || item.policy_title || `سياسة مستوردة ${idx + 1}`;
      // نعتمد على id الخاص بكل سياسة (مثل IC-01 أو CSS-01 أو الكود) لضمان دمجها بدقة
      const rawId = item.id || item.policy_id || item.code || `pol-${Date.now()}-${idx}`;
      const id = String(rawId).trim().replace(/\s+/g, '-');
      const code = item.code || item.policy_code || `MIH-IMP-${idx + 1}`;
      const category = normalizeCategory(item.category || item.category_key || 'IPC');
      const dept = item.target_departments || item.dept || item.department || 'جميع أقسام المستشفى';
      const version = item.version
        ? item.version.includes('الإصدار')
          ? item.version
          : `الإصدار ${item.version}`
        : 'الإصدار 1.0';
      const date = item.effective_date || item.issue_date || item.date || 'أكتوبر 2026';

      let purpose = item.purpose || '';
      if (!purpose) {
        if (item.slides && item.slides[0]?.bullet_points?.[0]) {
          purpose = item.slides[0].bullet_points[0];
        } else {
          purpose = `تطبيق معايير وإجراءات ${title} بكفاءة وأمان داخل المستشفى.`;
        }
      }

      const contentHtml =
        item.content_html ||
        item.html ||
        `<div class="policy-doc"><h3>الغرض من السياسة:</h3><p>${purpose}</p></div>`;
      const plainText =
        item.plain_text || `${title} ${code} ${dept} ${purpose}`.replace(/\s+/g, ' ').trim();

      const slides =
        Array.isArray(item.slides) && item.slides.length > 0
          ? item.slides
          : generateSlidesFromHtml(contentHtml, title);

      return {
        id,
        code,
        title,
        category,
        dept,
        version,
        date,
        purpose,
        effectiveDate: item.effective_date || '',
        reviewDate: item.review_date || '',
        responsibilities: item.responsible_persons || item.responsibilities || '',
        content_html: contentHtml,
        plain_text: plainText,
        slides,
        images: Array.isArray(item.images) ? item.images : [],
        source: 'MANUAL',
        updated_at: new Date().toISOString(),
      };
    });
  };

  const parseAndValidate = (rawText: string) => {
    setErrorMsg('');
    setParsedPolicies([]);

    const cleanInput = (rawText || '').replace(/^\uFEFF/, '').trim();
    if (!cleanInput) return;

    try {
      const parsed = JSON.parse(cleanInput);
      let list: any[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.policies)) {
          list = parsed.policies;
        } else if (Array.isArray(parsed.data)) {
          list = parsed.data;
        } else if (Array.isArray(parsed.items)) {
          list = parsed.items;
        } else {
          list = [parsed];
        }
      }

      if (list.length === 0) {
        setErrorMsg('لم يتم العثور على أي سياسات صالحة في النص المدخل.');
        return;
      }

      const normalized = normalizeList(list);
      setParsedPolicies(normalized);
    } catch (err: any) {
      setErrorMsg(`خطأ في صياغة JSON: ${err.message || 'تأكد من صحة الأقواس والفواصل'}`);
    }
  };

  // Support multi-file upload (one or multiple .json files)
  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');
    setUploadedFilesCount(files.length);

    try {
      const allItems: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const clean = text.replace(/^\uFEFF/, '').trim();
        if (!clean) continue;
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          allItems.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.policies)) allItems.push(...parsed.policies);
          else if (Array.isArray(parsed.data)) allItems.push(...parsed.data);
          else if (Array.isArray(parsed.items)) allItems.push(...parsed.items);
          else allItems.push(parsed);
        }
      }

      if (allItems.length === 0) {
        setErrorMsg('لم يتم العثور على سياسات داخل الملفات المختارة.');
        return;
      }

      const normalized = normalizeList(allItems);
      setParsedPolicies(normalized);
      setJsonText(JSON.stringify(normalized, null, 2));
      onShowToast(`تمت قراءة (${normalized.length}) سياسة من (${files.length}) ملف بنجاح!`);
    } catch (err: any) {
      setErrorMsg(`فشلت قراءة أحد ملفات JSON: ${err.message || err}`);
    }
    e.target.value = '';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    parseAndValidate(text);
  };

  // Sample JSON Template Insertion
  const handleInsertTemplate = () => {
    const template = [
      {
        id: "IC-01",
        code: "SMC/MIH/IPC/01",
        title: "سياسة نظافة وتطهير الأيدي (Hand Hygiene Policy)",
        category: "IPC",
        dept: "جميع الأقسام الطبية والتمريضية",
        version: "الإصدار 3.0",
        purpose: "الحد من انتقال العدوى المكتسبة داخل المستشفى وتطبيق لحظات نظافة اليدين الخمس لمنظمة الصحة العالمية.",
        content_html: "<div class=\"policy-doc\"><h3>المعايير والإجراءات:</h3><p>الالتزام بغسل اليدين بالماء والصابون أو الدلك بالكحول الطبي في اللحظات الخمس المعتمدة.</p></div>",
        slides: [
          {
            slide_number: 1,
            slide_title: "اللحظات الخمس لنظافة اليدين",
            bullet_points: [
              "قبل لمس المريض وقبل الإجراء النظيف",
              "بعد التعرض لسوائل الجسم وبعد لمس المريض ومحيطه"
            ]
          }
        ]
      }
    ];
    const str = JSON.stringify(template, null, 2);
    setJsonText(str);
    parseAndValidate(str);
  };

  // Existing vs New comparison
  const existingIdsSet = new Set(existingPolicies.map((p) => p.id));
  const newPoliciesCount = parsedPolicies.filter((p) => !existingIdsSet.has(p.id)).length;
  const updatePoliciesCount = parsedPolicies.length - newPoliciesCount;

  const handleExecuteImport = async () => {
    if (parsedPolicies.length === 0) return;

    setIsProcessing(true);
    setImportProgress({ current: 0, total: parsedPolicies.length, percent: 0 });

    try {
      const res = await onImportPolicies(parsedPolicies, (progress) => {
        setImportProgress(progress);
      });

      const added = res && typeof res === 'object' && 'addedCount' in res ? res.addedCount : newPoliciesCount;
      const updated = res && typeof res === 'object' && 'updatedCount' in res ? res.updatedCount : updatePoliciesCount;

      onShowToast(`🎉 اكتمل الرفع: تمت إضافة (${added}) جديدة وتحديث/دمج (${updated}) سياسة في Firestore!`);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-teal-50/70 dark:bg-teal-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-teal-600/10 text-teal-700 dark:text-teal-300">
              📥
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                نظام استيراد ودمج دفعات الـ JSON المتقدم (Bulk JSON Upsert Engine)
              </h3>
              <p className="text-xs text-teal-800 dark:text-teal-300 font-semibold">
                رفع ملفات متعددة أو لصق مصفوفة JSON مع دمج البيانات وحفظ السجلات السحابية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold text-xl transition cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Dual Action Controls: Multi File Upload + Template Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm active:scale-95">
                <span>📁 رفع ملف أو عدة ملفات (.json)</span>
                <input
                  type="file"
                  multiple
                  accept=".json,application/json"
                  onChange={handleMultipleFilesUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
              {uploadedFilesCount > 0 && (
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  تم تحديد {uploadedFilesCount} ملف
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleInsertTemplate}
              disabled={isProcessing}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              📋 لصق نموذج JSON تجريبي
            </button>
          </div>

          {/* Direct Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>أو الصق مصفوفة JSON هنا مباشرة:</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                يدعم كود السياسات الفردية أو مصفوفات الدفعات الكبيرة
              </span>
            </label>
            <textarea
              value={jsonText}
              onChange={handleTextChange}
              disabled={isProcessing}
              rows={7}
              placeholder="الصق كود الـ JSON هنا... مثال: [ { id: 'IC-01', code: 'SMC/MIH/IPC/01', title: '...', content_html: '...', slides: [...] } ]"
              className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
            />
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 font-bold flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Progress Bar during active batch processing */}
          {isProcessing && (
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-teal-900 dark:text-teal-200">
                <span>جاري حفظ ودمج الدفعات في Cloud Firestore...</span>
                <span>
                  {importProgress.current} من {importProgress.total} ({importProgress.percent}%)
                </span>
              </div>
              <div className="w-full h-3 bg-teal-200 dark:bg-teal-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-teal-500 to-emerald-500 transition-all duration-200 ease-out"
                  style={{ width: `${importProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview of Parsed Policies with Upsert Metrics */}
          {parsedPolicies.length > 0 && !isProcessing && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-lg">✓</span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    تم التعرف على ({parsedPolicies.length}) سياسة وجاهزة للدمج والرفع:
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200">
                    ➕ {newPoliciesCount} جديدة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200">
                    🔄 {updatePoliciesCount} تحديث ودمج
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                    📽️ {parsedPolicies.reduce((acc, p) => acc + (p.slides?.length || 0), 0)} شريحة
                  </span>
                </div>
              </div>

              {/* Scrollable List Preview */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-emerald-100 dark:divide-emerald-900/40">
                {parsedPolicies.map((p, idx) => {
                  const isExisting = existingIdsSet.has(p.id);
                  return (
                    <div
                      key={idx}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-[11px] text-teal-800 dark:text-teal-300 shrink-0">
                          {p.code}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {p.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isExisting
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                          }`}
                        >
                          {isExisting ? 'تحديث' : 'جديدة'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {p.dept}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {parsedPolicies.length > 0 ? (
              <span className="text-teal-700 dark:text-teal-400 font-bold">
                ⚡ سيتم استخدام setDoc مع {'{ merge: true }'} للحفاظ التام على البيانات
              </span>
            ) : (
              <span>اختر ملفات JSON أو الصق الكود لبدء التحقق</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={parsedPolicies.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>جاري رفع ودمج الدفعة ({importProgress.percent}%)...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>رفع ودمج الدفعة (Upsert Batch) ({parsedPolicies.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
