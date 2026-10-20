import React, { useState, useEffect } from 'react';
import { Policy, Slide, CategoryKey, SystemSettings } from '../types';
import { CATEGORY_META } from '../data/initialData';
import {
  parseWordDocument,
  inspectPdfDocument,
  processPdfWithGemini,
  uploadToCloudinary,
  getArabicCurrentMonthYear,
  generateSlidesFromHtml
} from '../services/aiAndParsers';
import { PDFDocument } from 'pdf-lib';

interface AdminViewProps {
  editingPolicy: Policy | null;
  settings: SystemSettings;
  onSavePolicy: (policy: Policy) => Promise<void>;
  onResetEditor: () => void;
  onExportJson: () => void;
  onResetDefaults: () => void;
  onShowLoading: (loading: boolean, message?: string) => void;
  onShowToast: (message: string) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  editingPolicy,
  settings,
  onSavePolicy,
  onResetEditor,
  onExportJson,
  onResetDefaults,
  onShowLoading,
  onShowToast,
  onUpdateSettings,
}) => {
  const [editorTab, setEditorTab] = useState<'edit-fields' | 'preview-doc' | 'preview-slides'>('edit-fields');

  // Form state
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<CategoryKey>('QPI');
  const [dept, setDept] = useState('');
  const [version, setVersion] = useState('الإصدار 1.0');
  const [date, setDate] = useState(getArabicCurrentMonthYear());
  const [purpose, setPurpose] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [images, setImages] = useState<string[]>([]);

  // PDF Page Range Selector state
  const [pdfFile, setPdfFile] = useState<{
    name: string;
    totalPages: number;
    doc: PDFDocument;
  } | null>(null);
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [pdfEndPage, setPdfEndPage] = useState<number>(5);

  // Admin Whitelist management state
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const handleAddAdminEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminEmail.trim().toLowerCase();
    if (!clean) return;
    if (!clean.includes('@') || !clean.includes('.')) {
      onShowToast('يرجى إدخال بريد إلكتروني صالح');
      return;
    }
    const currentList = settings.adminEmails || [];
    if (currentList.some((em) => em.trim().toLowerCase() === clean)) {
      onShowToast('هذا البريد مسجل بالفعل في قائمة المديرين');
      return;
    }
    const updated = [...currentList, clean];
    onUpdateSettings({ ...settings, adminEmails: updated });
    setNewAdminEmail('');
    onShowToast(`تم اعتماد البريد (${clean})! يستطيع الآن الدخول فوراً عبر حساب Google كمدير معتمد 👑`);
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    const currentList = settings.adminEmails || [];
    if (currentList.length <= 1) {
      alert('يجب الإبقاء على بريد إداري واحد على الأقل في القائمة.');
      return;
    }
    if (!confirm(`هل أنت متأكد من رغبتك في إزالة البريد (${emailToRemove}) من قائمة مديري الجودة المعتمدين؟`)) {
      return;
    }
    const updated = currentList.filter((em) => em.trim().toLowerCase() !== emailToRemove.trim().toLowerCase());
    onUpdateSettings({ ...settings, adminEmails: updated });
    onShowToast(`تمت إزالة البريد (${emailToRemove}) من قائمة المديرين.`);
  };

  useEffect(() => {
    if (editingPolicy) {
      setTitle(editingPolicy.title || '');
      setCode(editingPolicy.code || '');
      setCategory(editingPolicy.category || 'QPI');
      setDept(editingPolicy.dept || '');
      setVersion(editingPolicy.version || 'الإصدار 1.0');
      setDate(editingPolicy.date || getArabicCurrentMonthYear());
      setPurpose(editingPolicy.purpose || '');
      setContentHtml(editingPolicy.content_html || '');
      setSlides(editingPolicy.slides ? JSON.parse(JSON.stringify(editingPolicy.slides)) : []);
      setImages(editingPolicy.images ? [...editingPolicy.images] : []);
      setEditorTab('edit-fields');
    } else {
      resetFields();
    }
  }, [editingPolicy]);

  const resetFields = () => {
    setTitle('');
    setCode('');
    setCategory('QPI');
    setDept('');
    setVersion('الإصدار 1.0');
    setDate(getArabicCurrentMonthYear());
    setPurpose('');
    setContentHtml('');
    setSlides([]);
    setImages([]);
    setPdfFile(null);
  };

  // Word File Handler
  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowLoading(true, 'جاري قراءة واستخراج نصوص وجداول ملف Word عبر mammoth...');
    try {
      const parsed = await parseWordDocument(file);
      setTitle(parsed.title);
      setCode(parsed.code);
      setCategory(parsed.category);
      setDept(parsed.dept);
      setVersion(parsed.version);
      setDate(parsed.date);
      setPurpose(parsed.purpose);
      setContentHtml(parsed.content_html);
      setSlides(parsed.slides);

      onShowLoading(false);
      onShowToast('تم استخراج محتوى ملف Word وبناء الشرائح بنجاح!');
      setEditorTab('preview-doc');
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء قراءة ملف Word: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // PDF File Inspection
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowLoading(true, 'جاري فحص وتجهيز صفحات ملف الـ PDF...');
    try {
      const { pdfDoc, totalPages } = await inspectPdfDocument(file);
      setPdfFile({
        name: file.name,
        totalPages,
        doc: pdfDoc
      });
      setPdfStartPage(1);
      setPdfEndPage(Math.min(5, totalPages));

      onShowLoading(false);
      onShowToast(`تم تحميل ملف PDF (${totalPages} صفحة). حدد نطاق الصفحات للاستخراج.`);
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء فحص ملف PDF: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // Process PDF with Gemini
  const handleProcessPdfWithGemini = async () => {
    if (!pdfFile) return;

    let apiKey = settings.geminiKey;
    if (!apiKey) {
      const enteredKey = prompt('أدخل مفتاح Gemini API الخاص بك للمتابعة:\n(يمكنك الحصول عليه مجاناً من Google AI Studio)', '');
      if (!enteredKey) return;
      apiKey = enteredKey.trim();
      onUpdateSettings({ ...settings, geminiKey: apiKey });
    }

    onShowLoading(true, `جاري استخراج الصفحات من (${pdfStartPage}) إلى (${pdfEndPage}) وتحليلها بأحدث نموذج ذكاء اصطناعي (Gemini 3.8 Flash) فائق السرعة والدقة...`);
    try {
      const res = await processPdfWithGemini(pdfFile.doc, pdfStartPage, pdfEndPage, apiKey);
      setTitle(res.title);
      setCode(res.code);
      setCategory(res.category);
      setDept(res.dept);
      setVersion(res.version);
      setDate(getArabicCurrentMonthYear());
      setPurpose(res.purpose);
      setContentHtml(res.content_html);
      setSlides(res.slides && res.slides.length > 0 ? res.slides : generateSlidesFromHtml(res.content_html, res.title));

      onShowLoading(false);
      onShowToast('تم استخراج السياسة وبناء الشرائح بواسطة الذكاء الاصطناعي بنجاح!');
      setEditorTab('preview-doc');
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء معالجة الذكاء الاصطناعي: ' + (err.message || err));
    }
  };

  // Cloudinary Upload
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let cloudName = settings.cloudinaryName;
    let preset = settings.cloudinaryPreset;

    if (!cloudName || !preset) {
      const enteredName = prompt('أدخل اسم حسابك في Cloudinary (Cloud Name):', cloudName || '');
      const enteredPreset = prompt('أدخل اسم الـ Upload Preset (Unsigned):', preset || '');
      if (!enteredName || !enteredPreset) {
        alert('إعدادات Cloudinary مطلوبة لرفع الصور والمخططات.');
        return;
      }
      cloudName = enteredName.trim();
      preset = enteredPreset.trim();
      onUpdateSettings({ ...settings, cloudinaryName: cloudName, cloudinaryPreset: preset });
    }

    onShowLoading(true, 'جاري رفع وتحسين الصورة عبر Cloudinary API...');
    try {
      const secureUrl = await uploadToCloudinary(file, cloudName, preset);
      setImages((prev) => [...prev, secureUrl]);
      onShowLoading(false);
      onShowToast('تم رفع الصورة بنجاح إلى Cloudinary!');

      const insertInDoc = confirm(
        'تم رفع الصورة بنجاح!\n\nهل ترغب في إدراج الصورة الآن داخل نص الوثيقة (HTML) كمخطط توضيحي؟\n(اختر إلغاء إذا كنت تريد ربطها بشريحة عرض)'
      );

      if (insertInDoc) {
        const figHtml = `\n<figure class="my-5 text-center">\n  <img src="${secureUrl}" alt="مخطط توضيحي للسياسة" class="rounded-xl shadow-md mx-auto max-h-96 border border-slate-200" />\n  <figcaption class="text-xs text-slate-500 font-bold mt-2">شكل توضيحي: مسار التطبيق والتدفق الإجرائي</figcaption>\n</figure>\n`;
        setContentHtml((prev) => prev + figHtml);
      } else if (slides.length > 0) {
        const slideNumStr = prompt(`أدخل رقم الشريحة التي تريد إرفاق الصورة بها (من 1 إلى ${slides.length}):`, '1');
        const sNum = parseInt(slideNumStr || '1', 10);
        if (sNum >= 1 && sNum <= slides.length) {
          setSlides((prev) => {
            const next = [...prev];
            next[sNum - 1] = { ...next[sNum - 1], image_url: secureUrl };
            return next;
          });
          onShowToast(`تم إرفاق الصورة بالشريحة رقم ${sNum}`);
        }
      }
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء رفع الصورة: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // Slide management
  const handleAddSlide = () => {
    const newSlide: Slide = {
      slide_number: slides.length + 1,
      slide_title: `نقطة هامة ${slides.length + 1}`,
      bullet_points: ['أدخل تفاصيل الإجراء هنا...', 'نقطة إضافية للتدريب والمتابعة.']
    };
    setSlides([...slides, newSlide]);
  };

  const handleUpdateSlideTitle = (idx: number, newTitle: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], slide_title: newTitle };
      return next;
    });
  };

  const handleUpdateSlideBullets = (idx: number, bulletsText: string) => {
    const bulletList = bulletsText.split('\n').map((s) => s.trim()).filter(Boolean);
    setSlides((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], bullet_points: bulletList };
      return next;
    });
  };

  const handleRemoveSlide = (idx: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slide_number: i + 1 })));
  };

  const handleRemoveSlideImage = (idx: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const copy = { ...next[idx] };
      delete copy.image_url;
      next[idx] = copy;
      return next;
    });
  };

  // Submit Policy Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim() || !purpose.trim() || !contentHtml.trim()) {
      alert('يرجى ملء كافة الحقول الإلزامية: العنوان، الكود، الهدف، ومحتوى الوثيقة.');
      return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHtml;
    const plainText = `${title} ${code} ${dept} ${purpose} ${tempDiv.textContent || ''}`.replace(/\s+/g, ' ').trim();

    let finalSlides = slides;
    if (finalSlides.length === 0) {
      finalSlides = generateSlidesFromHtml(contentHtml, title);
    }

    const policyToSave: Policy = {
      id: editingPolicy?.id || `pol-${Date.now()}`,
      title: title.trim(),
      code: code.trim(),
      category,
      dept: dept.trim() || 'جميع الأقسام المعنية',
      version: version.trim() || 'الإصدار 1.0',
      date: date.trim() || getArabicCurrentMonthYear(),
      purpose: purpose.trim(),
      content_html: contentHtml.trim(),
      plain_text: plainText,
      slides: finalSlides,
      images,
      updated_at: new Date().toISOString()
    };

    onShowLoading(true, 'جاري حفظ ونشر السياسة...');
    try {
      await onSavePolicy(policyToSave);
      onShowLoading(false);
      resetFields();
      onResetEditor();
    } catch (err: any) {
      onShowLoading(false);
      alert('حدث خطأ أثناء الحفظ: ' + (err.message || err));
    }
  };

  const meta = CATEGORY_META[category] || CATEGORY_META.QPI;

  return (
    <section className="space-y-6">
      {/* Admin header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              لوحة إدارة الجودة والتحويل الذكي
            </h2>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900">
              صلاحية المدير
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            رفع واستخراج السياسات الذكية وتوليد الشرائح وحفظها في Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportJson}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <span>📥</span>
            <span>تصدير نسخة JSON</span>
          </button>
          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-700 dark:text-red-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <span>🔄</span>
            <span>استعادة الافتراضي</span>
          </button>
        </div>
      </div>

      {/* Card 0: Admin Whitelist Management (User Requested Feature) */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>👥</span>
              <span>إدارة قائمة مديري الجودة المعتمدين (Google Login Whitelist)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
              أي بريد إلكتروني يُضاف هنا، يستطيع صاحبه الضغط على زر <em>«دخول الإدارة (Google)»</em> والدخول فوراً كمدير معتمد بصلاحيات كاملة
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 self-start sm:self-auto">
            {settings.adminEmails?.length || 0} مديرين معتمدين
          </span>
        </div>

        {/* Add Email Form */}
        <form onSubmit={handleAddAdminEmail} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="أدخل البريد الإلكتروني الجديد للمدير (مثال: doctor@gmail.com)..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <span>➕</span>
            <span>اعتماد مدير جديد</span>
          </button>
        </form>

        {/* Whitelist Chips Grid */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            الإيميلات المعتمدة حالياً لدخول الإدارة:
          </p>
          <div className="flex flex-wrap gap-2">
            {(settings.adminEmails || []).map((email) => (
              <div
                key={email}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <span>👑</span>
                <span className="font-mono">{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAdminEmail(email)}
                  className="text-slate-400 hover:text-red-500 font-bold p-0.5 rounded transition cursor-pointer"
                  title="إزالة هذا البريد من الإدارة"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 1: Smart AI Upload Engine */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span>🚀</span>
            <span>محرك الرفع والتحويل الذكي (Smart AI Converter)</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold">
            اختر ملف Word أو PDF أو صورة لاستخراج محتواها وتحويلها لسياسة وشرائح تلقائياً
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Word Upload */}
          <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">📄</span>
              <h4 className="font-extrabold text-teal-950 text-sm">ملفات Word (.docx)</h4>
              <p className="text-xs text-teal-800 leading-relaxed font-semibold">
                استخراج فوري في المتصفح عبر <code>mammoth.js</code> للجداول والفقرات وبناء الشرائح تلقائياً.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm">
                <span>اختيار ملف .docx</span>
                <input type="file" accept=".docx" onChange={handleWordUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 2. PDF Upload */}
          <div className="p-5 rounded-2xl bg-red-50/50 border border-red-200 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">📑</span>
              <h4 className="font-extrabold text-red-950 text-sm">ملفات PDF و PPTX (Gemini AI)</h4>
              <p className="text-xs text-red-800 leading-relaxed font-semibold">
                معالجة ذكية دقيقة باللغة العربية عبر نموذج <code>gemini-2.5-flash</code> مع ميزة تحديد نطاق الصفحات.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-xs transition shadow-sm">
                <span>اختيار ملف PDF</span>
                <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 3. Cloudinary Upload */}
          <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">🖼️</span>
              <h4 className="font-extrabold text-purple-950 text-sm">صور ومخططات (Cloudinary)</h4>
              <p className="text-xs text-purple-800 leading-relaxed font-semibold">
                رفع فوري بدون خادم مع ضغط Canvas WebP وإدراج الرابط مباشرة في نصوص وشرائح السياسة.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs transition shadow-sm">
                <span>إرفاق صورة / مخطط</span>
                <input type="file" accept="image/*" onChange={handleCloudinaryUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* PDF Page Selector Box */}
        {pdfFile && (
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <h4 className="text-sm font-bold text-white">
                    الملف المحدد: <span className="text-teal-400">{pdfFile.name}</span>
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  إجمالي صفحات الملف: <strong className="text-white">{pdfFile.totalPages}</strong> صفحة
                </p>
              </div>
              <span className="text-xs bg-teal-900/60 text-teal-300 px-3 py-1 rounded-full border border-teal-700">
                Gemini 3.8 Flash (Latest AI Engine)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span>من صفحة:</span>
                <input
                  type="number"
                  min={1}
                  max={pdfFile.totalPages}
                  value={pdfStartPage}
                  onChange={(e) => setPdfStartPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center font-bold outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span>إلى صفحة:</span>
                <input
                  type="number"
                  min={1}
                  max={pdfFile.totalPages}
                  value={pdfEndPage}
                  onChange={(e) => setPdfEndPage(Math.min(pdfFile.totalPages, parseInt(e.target.value, 10) || 1))}
                  className="w-20 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center font-bold outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <button
                type="button"
                onClick={handleProcessPdfWithGemini}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition shadow-md flex items-center gap-2 mr-auto cursor-pointer"
              >
                <span>⚡</span>
                <span>بدء التحليل والاستخراج الذكي بـ Gemini</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Policy Editor & Preview */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              محرر ومعاينة السياسة (Policy Editor & Preview)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              راجع وعدّل الحقول والشرائح، وتأكد من المعاينة قبل الحفظ في السحابة
            </p>
          </div>

          {/* Editor Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setEditorTab('edit-fields')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                editorTab === 'edit-fields'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              ✏️ تحرير الحقول والشرائح
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('preview-doc')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                editorTab === 'preview-doc'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              📖 معاينة الوثيقة الرسمية
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('preview-slides')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                editorTab === 'preview-slides'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              📽️ محاكي عارض الشرائح
            </button>
          </div>
        </div>

        {/* Tab 1: Edit Fields & Slides */}
        {editorTab === 'edit-fields' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان السياسة الرسمي *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: سياسة الوقاية من الجلطات الوريدية العميقة..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  كود السياسة (Policy Code) *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثال: MIH-NSR-005"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  القسم / التصنيف *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryKey)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-600 outline-none cursor-pointer"
                >
                  {(Object.keys(CATEGORY_META) as CategoryKey[]).map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_META[k].name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الأقسام المستهدفة بالمستشفى *
                </label>
                <input
                  type="text"
                  required
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="مثال: الأقسام الداخلية، العنايات المركزة، والعمليات..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم الإصدار
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="الإصدار 1.0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تاريخ الاعتماد
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="أكتوبر 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الهدف العام من السياسة (Policy Purpose) *
              </label>
              <textarea
                rows={2}
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="اكتب الهدف الإكلينيكي أو الإداري المباشر من تطبيق السياسة..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none custom-scroll"
              ></textarea>
            </div>

            {/* Rich HTML Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  محتوى السياسة الكامل (HTML Rich Content) *
                </label>
                <span className="text-[11px] text-slate-400">
                  يدعم العناوين h3، الفقرات p، الجداول table، والقوائم ul/ol
                </span>
              </div>
              <textarea
                rows={8}
                required
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="اكتب أو الصق نص السياسة المنسق بـ HTML هنا (أو استخدم الرفع التلقائي لملفات Word/PDF)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-600 outline-none custom-scroll"
              ></textarea>
            </div>

            {/* Slides Builder */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">
                    محرر شرائح العرض التقديمي (Interactive Slides Deck)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    تُستخدم هذه الشرائح في وضع العرض التقديمي وشاشات التدريب
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSlide}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>➕</span>
                  <span>إضافة شريحة جديدة</span>
                </button>
              </div>

              {slides.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                  لا توجد شرائح حالياً. اضغط على "+ إضافة شريحة جديدة" أو قم برفع ملف لتوليدها تلقائياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {slides.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm hover:border-teal-500 transition"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                          شريحة {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlide(idx)}
                          className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
                          title="حذف الشريحة"
                        >
                          🗑️ حذف
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          عنوان الشريحة
                        </label>
                        <input
                          type="text"
                          value={s.slide_title}
                          onChange={(e) => handleUpdateSlideTitle(idx, e.target.value)}
                          placeholder="عنوان الشريحة..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          نقاط الشريحة (نقطة في كل سطر)
                        </label>
                        <textarea
                          rows={3}
                          value={(s.bullet_points || []).join('\n')}
                          onChange={(e) => handleUpdateSlideBullets(idx, e.target.value)}
                          placeholder="أدخل كل نقطة في سطر منفصل..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-600 outline-none custom-scroll"
                        ></textarea>
                      </div>

                      {s.image_url && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <img src={s.image_url} alt="attached" className="w-10 h-10 object-cover rounded" />
                          <span className="truncate flex-1 font-mono text-[11px]">{s.image_url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlideImage(idx)}
                            className="text-red-600 font-bold hover:underline cursor-pointer"
                          >
                            إزالة
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  resetFields();
                  onResetEditor();
                }}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                مسح وإلغاء
              </button>

              <button
                type="submit"
                className="px-8 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-sm transition shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>💾</span>
                <span>حفظ ونشر السياسة في قاعدة البيانات (Firestore)</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Official Document Live Preview */}
        {editorTab === 'preview-doc' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
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
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">مستشفى المنصورة الدولي</h2>
                  <p className="text-xs text-slate-600 font-semibold">
                    أمانة المراكز الطبية المتخصصة (SMC) • إدارة الجودة وسلامة المرضى
                  </p>
                </div>
              </div>
              <div className="text-left font-mono text-xs text-slate-600 space-y-1">
                <div>
                  <strong className="text-slate-900">كود الوثيقة:</strong> {code || 'MIH-CODE-001'}
                </div>
                <div>
                  <strong className="text-slate-900">تاريخ الاعتماد:</strong> {date || getArabicCurrentMonthYear()}
                </div>
                <div>
                  <strong className="text-slate-900">رقم الإصدار:</strong> {version || 'الإصدار 1.0'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${meta.badge}`}>
                  {code || 'MIH-CODE-001'} • {meta.name}
                </span>
                <span className="text-xs text-slate-500 font-bold">القسم المستهدف: {dept || 'القسم المعني'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{title || 'عنوان السياسة الرسمي'}</h1>
            </div>

            <div className="p-4 rounded-xl bg-teal-50/70 border-r-4 border-teal-700 text-teal-950 space-y-1">
              <h4 className="text-xs font-extrabold text-teal-900 uppercase">الهدف العام من السياسة (Policy Purpose):</h4>
              <p className="text-sm font-semibold leading-relaxed">
                {purpose || 'اكتب الهدف الإجرائي من السياسة لمشاهدة المعاينة...'}
              </p>
            </div>

            <div
              className="policy-content-html border-t border-slate-100 pt-4"
              dangerouslySetInnerHTML={{
                __html: contentHtml || '<p class="text-slate-400 italic">لا يوجد محتوى HTML مكتوب حتى الآن...</p>'
              }}
            ></div>
          </div>
        )}

        {/* Tab 3: Slides Simulator */}
        {editorTab === 'preview-slides' && (
          <div>
            {slides.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-slate-900 rounded-2xl">
                لا توجد شرائح للعرض. قم بإضافة شرائح لمشاهدة المحاكاة.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slides.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-lg"
                  >
                    <div className="flex items-center justify-between text-xs text-teal-400 font-bold border-b border-slate-800 pb-2">
                      <span>شريحة {idx + 1} من {slides.length}</span>
                      <span className="text-slate-400">{code || 'MIH-SLIDE'}</span>
                    </div>
                    <h3 className="text-lg font-extrabold text-white">{s.slide_title}</h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
                      {(s.bullet_points || []).map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-teal-400 mt-0.5">●</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    {s.image_url && (
                      <img
                        src={s.image_url}
                        alt="slide"
                        className="rounded-lg max-h-48 w-full object-cover border border-slate-700 mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
