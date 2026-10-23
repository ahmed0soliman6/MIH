import React, { useState, useEffect } from 'react';
import { Policy, Slide, CategoryKey, SystemSettings, AdminRole, AdminEntry } from '../types';
import { sanitizeHtml, htmlToText } from '../utils/sanitize';
import { CATEGORY_META } from '../data/meta';
import {
  parseWordDocument,
  parsePptxDocument,
  inspectPdfDocument,
  extractPdfTextLocally,
  processPdfWithGemini,
  parseImageDocument,
  uploadToCloudinary,
  getArabicCurrentMonthYear,
  generateSlidesFromHtml,
  escapeHtml
} from '../services/aiAndParsers';
import { PDFDocument } from 'pdf-lib';
import { JsonImportModal } from './JsonImportModal';

// Converts plain formatted Arabic text into structured semantic HTML
export function convertPlainTextToHtml(text: string): string {
  if (!text || !text.trim()) return '';
  const lines = text.split('\n');
  let html = '<div class="policy-doc space-y-4">';
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    if (line.startsWith('#') || line.startsWith('عنوان:') || line.match(/^[0-9]+[.-]\s/)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const titleText = line.replace(/^[#0-9.-]+\s*/, '').replace(/^عنوان:\s*/, '');
      html += `<h3>${escapeHtml(titleText)}</h3>`;
    } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const bulletText = line.replace(/^[-*•]\s*/, '');
      html += `<li>${escapeHtml(bulletText)}</li>`;
    } else if (line.startsWith('تنبيه:') || line.startsWith('ملاحظة:') || line.startsWith('هام:')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<blockquote>${escapeHtml(line)}</blockquote>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  if (inList) {
    html += '</ul>';
  }
  html += '</div>';
  return html;
}

export function stripHtmlTags(html: string): string {
  return htmlToText(html);
}

interface AdminViewProps {
  policies?: Policy[];
  editingPolicy: Policy | null;
  settings: SystemSettings;
  onSavePolicy: (policy: Policy) => Promise<void>;
  onResetEditor: () => void;
  onExportJson: () => void;
  onResetDefaults: () => void;
  onShowLoading: (loading: boolean, message?: string) => void;
  onShowToast: (message: string) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onSeedFirestore?: () => Promise<void>;
  onImportPolicies?: (imported: Policy[]) => Promise<void>;
  adminRole?: AdminRole | null;
  adminList?: AdminEntry[];
  currentUserEmail?: string;
  onAddAdmin?: (email: string, role: AdminRole) => Promise<void>;
  onRemoveAdmin?: (email: string) => Promise<void>;
  onUpdateAdminRole?: (email: string, role: AdminRole) => Promise<void>;
  publishStatus?: 'idle' | 'pending' | 'publishing' | 'published' | 'error';
  onTriggerPublishNow?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  policies,
  editingPolicy,
  settings,
  onSavePolicy,
  onResetEditor,
  onExportJson,
  onResetDefaults,
  onShowLoading,
  onShowToast,
  onUpdateSettings,
  onSeedFirestore,
  onImportPolicies,
  adminRole = null,
  adminList = [],
  currentUserEmail = '',
  onAddAdmin,
  onRemoveAdmin,
  onUpdateAdminRole,
  publishStatus = 'idle',
  onTriggerPublishNow,
}) => {
  const [editorTab, setEditorTab] = useState<'edit-fields' | 'preview-doc' | 'preview-slides'>('edit-fields');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  // حالة طي وفتح البطاقات المنفصلة (Collapsible Accordion Cards)
  const [openCards, setOpenCards] = useState<{
    admins: boolean;
    converter: boolean;
    editor: boolean;
  }>({
    admins: true,      // مفتوحة لسهولة إدارة المستخدمين وتعديل الأدوار
    converter: false,  // مطوية لتنظيم المساحة وتفتح بضغطة زر
    editor: true,      // مفتوحة للتحرير والمعاينة
  });

  const toggleCard = (cardKey: 'admins' | 'converter' | 'editor') => {
    setOpenCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  useEffect(() => {
    if (editingPolicy) {
      setOpenCards((prev) => ({ ...prev, editor: true }));
    }
  }, [editingPolicy]);

  // Form state
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<CategoryKey>('QPI');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [dept, setDept] = useState('');
  const [version, setVersion] = useState('الإصدار 1.0');
  const [date, setDate] = useState(getArabicCurrentMonthYear());
  const [purpose, setPurpose] = useState('');
  
  // Content input mode: manual plain text vs raw HTML
  const [contentInputMode, setContentInputMode] = useState<'text' | 'html'>('text');
  const [manualPlainText, setManualPlainText] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [images, setImages] = useState<string[]>([]);

  // PDF Page Range Selector state
  const [rawPdfFile, setRawPdfFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<{
    name: string;
    totalPages: number;
    doc: PDFDocument;
  } | null>(null);
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [pdfEndPage, setPdfEndPage] = useState<number>(5);

  // إدارة المديرين (superadmin فقط)
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('editor');
  const isSuperAdmin = adminRole === 'superadmin';
  const canSeeAdmins = adminRole === 'admin' || adminRole === 'superadmin';

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminEmail.trim().toLowerCase();
    if (!clean) return;
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
      onShowToast('يرجى إدخال بريد إلكتروني كامل وصالح (مثال: name@gmail.com)');
      return;
    }
    if (adminList.some((a) => a.email === clean)) {
      onShowToast('هذا البريد مسجل بالفعل في قائمة المديرين');
      return;
    }
    if (!onAddAdmin) return;
    await onAddAdmin(clean, newAdminRole);
    setNewAdminEmail('');
  };

  const handleRemoveAdminEmail = async (emailToRemove: string) => {
    if (!onRemoveAdmin) return;
    if (emailToRemove === currentUserEmail.trim().toLowerCase()) {
      alert('لا يمكنك إزالة حسابك الحالي.');
      return;
    }
    if (!confirm(`هل أنت متأكد من رغبتك في إزالة (${emailToRemove}) من مديري الجودة؟`)) return;
    await onRemoveAdmin(emailToRemove);
  };

  const handleRoleChange = async (targetEmail: string, newRole: AdminRole) => {
    if (!onUpdateAdminRole) return;
    if (targetEmail.toLowerCase() === currentUserEmail.trim().toLowerCase() && newRole !== 'superadmin') {
      const confirmSelf = confirm(
        '⚠️ تحذير: أنت على وشك خفض صلاحيات حسابك الشخصي من مدير عام (superadmin). لن تتمكن بعدها من إضافة أو ترقية مدراء آخرين. هل أنت متأكد؟'
      );
      if (!confirmSelf) return;
    }
    await onUpdateAdminRole(targetEmail, newRole);
  };

  const loadPolicy = (p: Policy) => {
    setTitle(p.title || '');
    setCode(p.code || '');
    if (CATEGORY_META[p.category as CategoryKey]) {
      setCategory(p.category as CategoryKey);
      setIsCustomCategory(false);
      setCustomCategoryName('');
    } else {
      setCategory('QPI');
      setIsCustomCategory(true);
      setCustomCategoryName(p.category || '');
    }
    setDept(p.dept || '');
    setVersion(p.version || 'الإصدار 1.0');
    setDate(p.date || getArabicCurrentMonthYear());
    setPurpose(p.purpose || '');
    setContentHtml(p.content_html || '');
    setManualPlainText(p.plain_text || stripHtmlTags(p.content_html || ''));
    setSlides(p.slides ? JSON.parse(JSON.stringify(p.slides)) : []);
    setImages(p.images ? [...p.images] : []);
  };

  useEffect(() => {
    if (editingPolicy) {
      loadPolicy(editingPolicy);
      setSelectedPolicyId(editingPolicy.id);
      setEditorTab('edit-fields');
    } else if (policies && policies.length > 0 && !selectedPolicyId && !title) {
      loadPolicy(policies[0]);
      setSelectedPolicyId(policies[0].id);
    }
  }, [editingPolicy, policies]);

  const handleSelectPolicy = (id: string) => {
    if (id === 'new') {
      resetFields();
      setSelectedPolicyId('new');
      onResetEditor();
      setEditorTab('edit-fields');
      return;
    }
    const target = policies?.find((p) => p.id === id);
    if (target) {
      loadPolicy(target);
      setSelectedPolicyId(target.id);
      onShowToast(`تم تحميل السياسة: ${target.code} - ${target.title}`);
    }
  };

  const resetFields = () => {
    setTitle('');
    setCode('');
    setCategory('QPI');
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setDept('');
    setVersion('الإصدار 1.0');
    setDate(getArabicCurrentMonthYear());
    setPurpose('');
    setContentHtml('');
    setManualPlainText('');
    setContentInputMode('text');
    setSlides([]);
    setImages([]);
    setPdfFile(null);
    setRawPdfFile(null);
    setSelectedPolicyId('new');
  };

  // Image File Handler (.png, .jpg, .jpeg, .webp) -> Auto extract to policy with slides
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowLoading(true, 'جاري معالجة واستخراج الصورة وتحويلها لمخطط وسياسة وشرائح تفاعلية...');
    try {
      const parsed = await parseImageDocument(file, true);
      setTitle(parsed.title);
      setCode(parsed.code);
      setCategory(parsed.category);
      setDept(parsed.dept);
      setVersion(parsed.version);
      setDate(parsed.date);
      setPurpose(parsed.purpose);
      setContentHtml(parsed.content_html);
      setManualPlainText(parsed.plain_text || stripHtmlTags(parsed.content_html));
      setSlides(parsed.slides);
      setImages(parsed.images);

      onShowLoading(false);
      onShowToast(`🎉 تم بنجاح استخراج محتوى الصورة وإدراجها بالوثيقة وبناء شرائح العرض!`);
      setEditorTab('preview-doc');
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء معالجة الصورة: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // Universal Auto-detect File Uploader (Word, PDF, PPTX, or Image)
  const handleUniversalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      await handleWordUpload(e);
    } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      await handlePptxUpload(e);
    } else if (fileName.endsWith('.pdf')) {
      await handlePdfUpload(e);
    } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName)) {
      await handleImageUpload(e);
    } else {
      alert('صيغة الملف غير مدعومة. يرجى اختيار ملف Word (.docx) أو PDF أو PowerPoint (.pptx) أو صورة (.png/.jpg).');
    }
  };

  // Word File Handler (.docx / .doc)
  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowLoading(true, 'جاري قراءة واستخراج نصوص وجداول ملف Word محلياً في المتصفح...');
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
      onShowToast(`🎉 تم بنجاح استخراج محتوى ملف Word وبناء (${parsed.slides.length}) شريحة!`);
      setEditorTab('preview-doc');
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء قراءة ملف Word: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // PowerPoint File Handler (.pptx / .ppt)
  const handlePptxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowLoading(true, 'جاري قراءة واستخراج شرائح ملف PowerPoint (.pptx) محلياً في المتصفح...');
    try {
      const parsed = await parsePptxDocument(file);
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
      onShowToast(`🎉 تم بنجاح استخراج (${parsed.slides.length}) شريحة من ملف PowerPoint وبناء العرض التقديمي!`);
      setEditorTab('preview-slides');
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء قراءة ملف PowerPoint: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // PDF File Inspection
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowLoading(true, 'جاري فحص وتجهيز صفحات ملف الـ PDF...');
    try {
      setRawPdfFile(file);
      const { pdfDoc, totalPages } = await inspectPdfDocument(file);
      setPdfFile({
        name: file.name,
        totalPages,
        doc: pdfDoc
      });
      setPdfStartPage(1);
      setPdfEndPage(Math.min(5, totalPages));

      onShowLoading(false);
      onShowToast(`تم تحميل ملف PDF (${totalPages} صفحة). يمكنك الآن الاختيار بين الاستخراج المحلي الفوري أو التحليل بـ Gemini.`);
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء فحص ملف PDF: ' + (err.message || err));
    }
    e.target.value = '';
  };

  // Extract PDF text locally (No API key required!)
  const handleExtractPdfLocally = async () => {
    if (!rawPdfFile) return;

    onShowLoading(true, `جاري استخراج النصوص محلياً من الصفحات (${pdfStartPage}) إلى (${pdfEndPage}) في المتصفح...`);
    try {
      const parsed = await extractPdfTextLocally(rawPdfFile, pdfStartPage, pdfEndPage);
      setTitle(parsed.title);
      setCode(parsed.code);
      setCategory(parsed.category);
      setDept(parsed.dept);
      setVersion(parsed.version);
      setDate(parsed.date);
      setPurpose(parsed.purpose);
      setContentHtml(parsed.content_html);
      setSlides(parsed.slides);
      if (parsed.images && parsed.images.length > 0) {
        setImages(parsed.images);
      }
      setManualPlainText(parsed.plain_text || stripHtmlTags(parsed.content_html));

      onShowLoading(false);
      onShowToast(`🎉 تم بنجاح استخراج محتوى الصفحات (${parsed.slides.length} شريحة) محلياً بدون إنترنت أو مفتاح API!`);
      setEditorTab('preview-doc');
    } catch (err: any) {
      onShowLoading(false);
      console.error(err);
      alert('حدث خطأ أثناء الاستخراج المحلي: ' + (err.message || err));
    }
  };

  // Process PDF with Gemini AI
  const handleProcessPdfWithGemini = async () => {
    if (!pdfFile) return;

    onShowLoading(true, `جاري استخراج الصفحات من (${pdfStartPage}) إلى (${pdfEndPage}) وتحليلها بنموذج Gemini Flash AI فائق السرعة والدقة...`);
    try {
      const res = await processPdfWithGemini(pdfFile.doc, pdfStartPage, pdfEndPage);
      setTitle(res.title);
      setCode(res.code);
      setCategory(res.category);
      setDept(res.dept);
      setVersion(res.version);
      setDate(getArabicCurrentMonthYear());
      setPurpose(res.purpose);
      setContentHtml(res.content_html);
      setManualPlainText(stripHtmlTags(res.content_html));
      setSlides(res.slides && res.slides.length > 0 ? res.slides : generateSlidesFromHtml(res.content_html, res.title));

      onShowLoading(false);
      onShowToast('🎉 تم استخراج السياسة وبناء الشرائح بواسطة الذكاء الاصطناعي بنجاح!');
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

    let finalHtml = contentHtml.trim();
    if (contentInputMode === 'text') {
      if (!manualPlainText.trim()) {
        alert('يرجى كتابة محتوى السياسة في الصندوق.');
        return;
      }
      finalHtml = convertPlainTextToHtml(manualPlainText);
    }

    if (!title.trim() || !code.trim() || !purpose.trim() || !finalHtml) {
      alert('يرجى ملء كافة الحقول الإلزامية: العنوان، الكود، الهدف، ومحتوى الوثيقة.');
      return;
    }

    const finalCategory = (isCustomCategory && customCategoryName.trim() ? customCategoryName.trim() : category) as CategoryKey;

    finalHtml = sanitizeHtml(finalHtml);
    const plainText = `${title} ${code} ${dept} ${purpose} ${htmlToText(finalHtml)}`.replace(/\s+/g, ' ').trim();

    let finalSlides = slides;
    if (finalSlides.length === 0) {
      finalSlides = generateSlidesFromHtml(finalHtml, title);
    }

    const policyToSave: Policy = {
      id: editingPolicy?.id || (selectedPolicyId && selectedPolicyId !== 'new' ? selectedPolicyId : `pol-${Date.now()}`),
      title: title.trim(),
      code: code.trim(),
      category: finalCategory,
      dept: dept.trim() || 'جميع الأقسام المعنية',
      version: version.trim() || 'الإصدار 1.0',
      date: date.trim() || getArabicCurrentMonthYear(),
      purpose: purpose.trim(),
      content_html: finalHtml,
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

        <div className="flex flex-wrap items-center gap-2">
          {onSeedFirestore && (
            <button
              type="button"
              onClick={onSeedFirestore}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="رفع ومزامنة كافة السياسات المعتمدة إلى Firestore"
            >
              <span>🚀</span>
              <span>مزامنة كافة السياسات إلى Firestore</span>
            </button>
          )}
          {onImportPolicies && (
            <button
              type="button"
              onClick={() => setIsJsonModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="استيراد كود JSON أو ملف دفعات مباشرة إلى الموقع وقاعدة البيانات"
            >
              <span>📥</span>
              <span>استيراد كود JSON</span>
            </button>
          )}
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

          {/* Publish Status Indicator */}
          {publishStatus && (
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-xs transition ${
              publishStatus === 'pending'
                ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                : publishStatus === 'publishing'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 animate-pulse'
                : publishStatus === 'published'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                : publishStatus === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {publishStatus === 'pending' && <span>⏳ سيُنشر تلقائياً خلال لحظات...</span>}
              {publishStatus === 'publishing' && <span>🚀 جاري النشر وبناء النسخة الجديدة...</span>}
              {publishStatus === 'published' && <span>✅ منشور ومتاح للزوار</span>}
              {publishStatus === 'error' && <span>⚠️ تعذر النشر التلقائي</span>}
              {publishStatus === 'idle' && <span>☁️ النظام متزامن</span>}

              {onTriggerPublishNow && (
                <button
                  type="button"
                  onClick={onTriggerPublishNow}
                  disabled={publishStatus === 'publishing'}
                  className="px-2.5 py-0.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-black text-[11px] cursor-pointer shadow-xs disabled:opacity-50"
                  title="نشر التعديلات فوراً عبر Vercel Deploy Hook وتجاوز وقت الانتظار"
                >
                  نشر الآن
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card 0: Admin Whitelist & Roles Management (بطاقة مستقلة وقابلة للطي) */}
      {canSeeAdmins && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-teal-500/30 dark:border-teal-500/20 shadow-md overflow-hidden transition-all duration-300">
          {/* Card Header (Clickable Accordion) */}
          <div
            onClick={() => toggleCard('admins')}
            className="p-5 sm:p-6 bg-gradient-to-r from-teal-50/80 via-white to-slate-50/70 dark:from-teal-950/30 dark:via-slate-900 dark:to-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-teal-50/90 dark:hover:bg-slate-800/60 transition border-b border-slate-100 dark:border-slate-800/80"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
                👥
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    إدارة مديري الجودة وصلاحيات الحسابات
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700">
                    {adminList.length} أعضاء
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  التحكم في أدوار الفريق وترقية وتعيين المشرفين (Superadmin / Admin / Editor) مباشرة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-100/60 dark:bg-teal-900/40">
                <span>{openCards.admins ? 'طي البطاقة' : 'فتح وإدارة الصلاحيات'}</span>
                <span className="text-xs font-black transition-transform duration-200" style={{ transform: openCards.admins ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </span>
            </div>
          </div>

          {/* Card Body */}
          {openCards.admins && (
            <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
              {/* Role explanation */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">👑</span>
                  <span className="font-bold text-slate-900 dark:text-white">superadmin (مدير عام):</span>
                  <span>كافة الصلاحيات + إضافة وتعديل وترقية وإزالة المدراء.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🛡️</span>
                  <span className="font-bold text-slate-900 dark:text-white">admin (مدير):</span>
                  <span>إضافة وتعديل وحذف السياسات ومراجعة الوثائق.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">✏️</span>
                  <span className="font-bold text-slate-900 dark:text-white">editor (محرر):</span>
                  <span>إضافة وتعديل مسودات السياسات فقط بدون صلاحية الحذف.</span>
                </div>
              </div>

              {/* Add New Admin Form (Superadmin only) */}
              {isSuperAdmin ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 space-y-3">
                  <h4 className="text-xs sm:text-sm font-black text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                    <span>➕</span>
                    <span>اعتماد أو إضافة مستخدم جديد:</span>
                  </h4>
                  <form onSubmit={handleAddAdminEmail} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      dir="ltr"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
                    />
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none shadow-sm cursor-pointer"
                    >
                      <option value="editor">✏️ editor (محرر)</option>
                      <option value="admin">🛡️ admin (مدير)</option>
                      <option value="superadmin">👑 superadmin (مدير عام)</option>
                    </select>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
                    >
                      <span>➕</span>
                      <span>اعتماد المستخدم</span>
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  ℹ️ إضافة وتعديل صلاحيات المديرين متاحة لحساب المدير العام (superadmin) فقط.
                </p>
              )}

              {/* Admins Interactive List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                  قائمة الحسابات المعتمدة (يمكنك تغيير الدور مباشرة من القائمة):
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adminList.map((a) => {
                    const isSelf = a.email.toLowerCase() === currentUserEmail.trim().toLowerCase();
                    return (
                      <div
                        key={a.email}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isSelf
                            ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-300 dark:border-teal-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">
                            {a.role === 'superadmin' ? '👑' : a.role === 'admin' ? '🛡️' : '✏️'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate" dir="ltr">
                                {a.email}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-teal-600 text-white shrink-0">
                                  أنت
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">
                              {a.role === 'superadmin' ? 'مدير عام بصلاحيات كاملة' : a.role === 'admin' ? 'مدير سياسات معتمد' : 'محرر ومراجع سياسات'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Role Switcher for Superadmin */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isSuperAdmin ? (
                            <select
                              value={a.role}
                              onChange={(e) => handleRoleChange(a.email, e.target.value as AdminRole)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-teal-500 shadow-xs"
                              title="تغيير وترقية نوع الحساب مباشرة"
                            >
                              <option value="editor">✏️ محرر (editor)</option>
                              <option value="admin">🛡️ مدير (admin)</option>
                              <option value="superadmin">👑 مدير عام (superadmin)</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              {a.role}
                            </span>
                          )}

                          {isSuperAdmin && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminEmail(a.email)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded-lg transition cursor-pointer"
                              title="إلغاء اعتماد هذا المدير"
                            >
                              <span className="text-sm font-bold">✕</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card 1: Smart AI Upload Engine (بطاقة مستقلة وقابلة للطي) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 shadow-sm overflow-hidden transition-all duration-300">
        {/* Card Header (Clickable Accordion) */}
        <div
          onClick={() => toggleCard('converter')}
          className="p-5 sm:p-6 bg-gradient-to-r from-indigo-50/60 via-white to-slate-50/50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-indigo-50/80 dark:hover:bg-slate-800/60 transition border-b border-slate-100 dark:border-slate-800/80"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              🚀
            </div>
            <div className="space-y-0.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>محرك الرفع والتحويل الذكي (Smart AI Converter)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                استخراج المحتوى آلياً من ملفات Word أو PDF أو PowerPoint أو الصور وتحويلها لسياسات وشرائح
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100/60 dark:bg-indigo-900/40">
              <span>{openCards.converter ? 'طي البطاقة' : 'فتح أدوات التحويل والرفع'}</span>
              <span className="text-xs font-black transition-transform duration-200" style={{ transform: openCards.converter ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </span>
          </div>
        </div>

        {openCards.converter && (
          <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
            {/* Universal Fast Converter Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white border border-teal-500/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl p-2 rounded-2xl bg-teal-500/20 border border-teal-500/30 shrink-0">🎯</span>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-black text-white">
                المحول الشامل التلقائي (Word / PDF / PowerPoint / صور)
              </h4>
              <p className="text-xs text-slate-300 font-semibold mt-0.5">
                اختر أي ملف بصيغة Word (.docx) أو PDF أو PowerPoint (.pptx) أو صورة (.png/.jpg) وسيقوم النظام فوراً باستخراج محتواه وبناء الشرائح
              </p>
            </div>
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-black text-xs sm:text-sm transition shadow-md whitespace-nowrap active:scale-95 shrink-0">
              <span>⚡ اختر أي ملف للتحويل الفوري</span>
              <input
                type="file"
                accept=".docx,.doc,.pptx,.ppt,.pdf,image/*,.png,.jpg,.jpeg,.webp"
                onChange={handleUniversalUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Word Upload */}
          <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">📄</span>
              <h4 className="font-extrabold text-teal-950 dark:text-teal-200 text-sm">ملفات Word (.docx)</h4>
              <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed font-semibold">
                استخراج فوري في المتصفح للجداول والفقرات وبناء الشرائح تلقائياً.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm">
                <span>اختيار ملف Word</span>
                <input type="file" accept=".docx,.doc" onChange={handleWordUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 2. PowerPoint Upload */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">📽️</span>
              <h4 className="font-extrabold text-indigo-950 dark:text-indigo-200 text-sm">عروض PowerPoint (.pptx)</h4>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed font-semibold">
                قراءة واستخراج كافة الشرائح والنقاط والعناوين محلياً في ثوانٍ.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition shadow-sm">
                <span>اختيار ملف .pptx</span>
                <input type="file" accept=".pptx,.ppt" onChange={handlePptxUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 3. PDF Upload */}
          <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">📑</span>
              <h4 className="font-extrabold text-red-950 dark:text-red-200 text-sm">ملفات PDF (محلي + AI)</h4>
              <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed font-semibold">
                استخراج محلي فوري أو معالجة ذكية بـ Gemini مع تحديد نطاق الصفحات.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-xs transition shadow-sm">
                <span>اختيار ملف PDF</span>
                <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 4. Image Upload & Parser (No Cloudinary required) */}
          <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">🖼️</span>
              <h4 className="font-extrabold text-purple-950 dark:text-purple-200 text-sm">صور ومخططات (.png/.jpg)</h4>
              <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed font-semibold">
                تحويل الصورة فوراً لوثيقة سياسة وإدراجها كمخطط معتمد وبناء الشرائح.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs transition shadow-sm">
                <span>اختيار صورة / مخطط</span>
                <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 5. Direct JSON Batch Importer */}
          <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-3xl">📥</span>
              <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-sm">استيراد كود JSON ودفعات</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                الصق كود الـ JSON أو ارفع ملف دفعات ليظهر فوراً ويتحفظ بالسحابة.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setIsJsonModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              >
                <span>فتح مستورد JSON ⚡</span>
              </button>
            </div>
          </div>
        </div>

        {/* PDF Page Selector Box with Local and Gemini options */}
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-700">
                  استخراج محلي متاح
                </span>
                <span className="text-[11px] bg-teal-900/60 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-700">
                  Gemini Flash AI
                </span>
              </div>
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

              <div className="flex flex-wrap items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={handleExtractPdfLocally}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="استخراج فوري للنصوص والشرائح محلياً داخل المتصفح بدون الحاجة لمفتاح API أو إنترنت"
                >
                  <span>⚡</span>
                  <span>استخراج محلي سريع (بدون API)</span>
                </button>

                <button
                  type="button"
                  onClick={handleProcessPdfWithGemini}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="تحليل وصياغة متقدمة بواسطة نموذج Gemini Flash AI"
                >
                  <span>🤖</span>
                  <span>تحليل ذكي بـ Gemini AI</span>
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Card 2: Policy Editor & Preview (بطاقة مستقلة وقابلة للطي) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
        {/* Card Header (Clickable Accordion) */}
        <div
          onClick={() => toggleCard('editor')}
          className="p-5 sm:p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800/40 dark:via-slate-900 dark:to-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition border-b border-slate-100 dark:border-slate-800/80"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              ✍️
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  محرر ومراجع السياسات ومنشئ العروض التقديمية
                </h3>
                {editingPolicy && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-white">
                    تعديل سياسة: {editingPolicy.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                تحرير وتنسيق الوثائق، وتعديل الشرائح، والمعاينة الحية الفورية بمحاكي المستندات والعرض
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800">
              <span>{openCards.editor ? 'طي المحرر' : 'فتح المحرر والمعاينة'}</span>
              <span className="text-xs font-black transition-transform duration-200" style={{ transform: openCards.editor ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </span>
          </div>
        </div>

        {openCards.editor && (
          <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
            {/* Policy Quick Selector Banner */}
        {policies && policies.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📑</span>
              <div>
                <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                  اختيار سياسة للتعديل والمعاينة الفورية بالمحاكي ({policies.length} سياسة متوفرة):
                </span>
                <span className="text-[11px] text-teal-800 dark:text-teal-300">
                  حدد أي سياسة لعرض شرائحها ووثيقتها أو إنشاء سياسة جديدة
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
              <select
                value={selectedPolicyId}
                onChange={(e) => handleSelectPolicy(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
              >
                <option value="new">➕ إنشاء سياسة جديدة فارغة</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.title} ({p.slides?.length || 0} شريحة)
                  </option>
                ))}
              </select>

              {selectedPolicyId !== 'new' && (
                <button
                  type="button"
                  onClick={() => handleSelectPolicy('new')}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 transition cursor-pointer whitespace-nowrap"
                  title="تفريغ الحقول لإنشاء سياسة جديدة"
                >
                  ➕ جديدة
                </button>
              )}
            </div>
          </div>
        )}

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
                  value={isCustomCategory ? 'CUSTOM' : category}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CUSTOM') {
                      setIsCustomCategory(true);
                    } else {
                      setIsCustomCategory(false);
                      setCategory(val as CategoryKey);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-600 outline-none cursor-pointer"
                >
                  {(Object.keys(CATEGORY_META) as CategoryKey[]).map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_META[k].name}
                    </option>
                  ))}
                  <option value="CUSTOM">➕ إضافة قسم / تصنيف مخصص جديد...</option>
                </select>

                {isCustomCategory && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="text"
                      required
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="أدخل رمز أو اسم القسم الجديد (مثال: LAB - المختبرات الطبية)..."
                      className="w-full px-3 py-2 rounded-xl border border-teal-500 bg-teal-50/70 dark:bg-slate-800 text-xs font-bold text-teal-900 dark:text-teal-200 focus:ring-2 focus:ring-teal-600 outline-none placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                      سيتم حفظ هذا القسم الجديد وربطه بالسياسة مباشرة.
                    </p>
                  </div>
                )}
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

            {/* Policy Content with Mode Switcher (Manual Plain Text vs HTML) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-white">
                    محتوى السياسة الكامل *
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {contentInputMode === 'text'
                      ? 'اكتب المحتوى كنص عادي وسيقوم النظام بتنسيقه تلقائياً كفقرات ونقاط وقوائم معتمدة'
                      : 'محرر HTML المتقدم (يدعم العناوين h3، الفقرات p، والجداول table)'}
                  </span>
                </div>

                {/* Mode Switch Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      if (contentInputMode !== 'text') {
                        if (!manualPlainText && contentHtml) {
                          setManualPlainText(stripHtmlTags(contentHtml));
                        }
                        setContentInputMode('text');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      contentInputMode === 'text'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>📝</span>
                    <span>إدخال يدوي (نص عادي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (contentInputMode !== 'html') {
                        if (manualPlainText && !contentHtml) {
                          setContentHtml(convertPlainTextToHtml(manualPlainText));
                        }
                        setContentInputMode('html');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      contentInputMode === 'html'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>💻</span>
                    <span>محرر HTML</span>
                  </button>
                </div>
              </div>

              {contentInputMode === 'text' ? (
                <div className="space-y-2">
                  {/* Quick Insert Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] ml-1">إضافة سريعة:</span>
                    <button
                      type="button"
                      onClick={() => setManualPlainText((prev) => (prev ? prev + '\n\n### عنوان الإجراء الفرعي:\n' : '### عنوان الإجراء الفرعي:\n'))}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      ➕ عنوان رئيسي
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPlainText((prev) => (prev ? prev + '\n- خطوة إجرائية:\n' : '- خطوة إجرائية:\n'))}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      ➕ نقطة في قائمة
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPlainText((prev) => (prev ? prev + '\n- المسؤوليات: الأطباء والتمريض وفريق الجودة المعني.\n' : '- المسؤوليات: الأطباء والتمريض وفريق الجودة المعني.\n'))}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      ➕ المسؤوليات
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPlainText((prev) => (prev ? prev + '\nتنبيه: يجب مراعاة سلامة المريض والتوثيق الفوري بالسجلات الطبية.\n' : 'تنبيه: يجب مراعاة سلامة المريض والتوثيق الفوري بالسجلات الطبية.\n'))}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-amber-800 dark:text-amber-300 font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      ⚠️ تنبيه هام
                    </button>
                  </div>

                  <textarea
                    rows={9}
                    required
                    value={manualPlainText}
                    onChange={(e) => {
                      setManualPlainText(e.target.value);
                      setContentHtml(convertPlainTextToHtml(e.target.value));
                    }}
                    placeholder={`اكتب محتوى السياسة وإجراءاتها هنا بسهولة بدون كود HTML...\nمثال:\n### 1. الإجراءات المتبعة\n- فحص العلامات الحيوية للمريض فور الدخول\n- تطبيق العزل الوقائي عند الاشتباه\n\n### 2. المسؤوليات\n- التمريض: تنفيذ خطة الرعاية والتوثيق\n- الطبيب المعالج: مراجعة خطة العلاج`}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 outline-none leading-relaxed custom-scroll"
                  ></textarea>
                </div>
              ) : (
                <textarea
                  rows={8}
                  required
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  placeholder="اكتب أو الصق نص السياسة المنسق بـ HTML هنا (أو استخدم الرفع التلقائي لملفات Word/PDF)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-600 outline-none custom-scroll"
                ></textarea>
              )}
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
                __html: sanitizeHtml(contentHtml) || '<p class="text-slate-400 italic">لا يوجد محتوى HTML مكتوب حتى الآن...</p>'
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
        )}
      </div>

      {/* JSON Batch Import Modal */}
      {isJsonModalOpen && onImportPolicies && (
        <JsonImportModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          onImportPolicies={onImportPolicies}
          onShowToast={onShowToast}
        />
      )}
    </section>
  );
};
