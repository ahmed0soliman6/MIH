import React, { useState, useEffect, useMemo } from 'react';
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
import { PolicyStudio } from './studio/PolicyStudio';

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
  onImportPolicies?: (
    imported: Policy[],
    onProgress?: (progress: { current: number; total: number; percent: number }) => void
  ) => Promise<{ addedCount?: number; updatedCount?: number } | void>;
  adminRole?: AdminRole | null;
  adminList?: AdminEntry[];
  currentUserEmail?: string;
  onAddAdmin?: (email: string, role: AdminRole) => Promise<void>;
  onRemoveAdmin?: (email: string) => Promise<void>;
  onUpdateAdminRole?: (email: string, role: AdminRole) => Promise<void>;
  publishStatus?: any;
  onTriggerPublishNow?: (keepalive?: boolean) => Promise<boolean | void>;
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
  publishStatus,
  onTriggerPublishNow,
}) => {
  const [editorTab, setEditorTab] = useState<'edit-fields' | 'preview-doc' | 'preview-slides'>('edit-fields');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [activeTopCard, setActiveTopCard] = useState<'converter' | 'editor' | 'admins'>('converter');

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

  // إدارة المديرين (superadmin فقط؛ تُفرض فعلياً بقواعد Firestore)
  const [localAdmins, setLocalAdmins] = useState<AdminEntry[]>(adminList);
  useEffect(() => {
    setLocalAdmins(adminList);
  }, [adminList]);

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
    if (localAdmins.some((a) => a.email.toLowerCase() === clean)) {
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

  const handleRoleChange = async (email: string, newRole: AdminRole) => {
    if (!onUpdateAdminRole) return;
    if (email === currentUserEmail.trim().toLowerCase() && newRole !== 'superadmin') {
      if (!confirm('تحذير: أنت على وشك خفض صلاحيات حسابك الحالي. هل تريد المتابعة؟')) return;
    }
    // تحديث تفاؤلي فوري في الواجهة
    setLocalAdmins((prev) =>
      prev.map((a) => (a.email.toLowerCase() === email.toLowerCase() ? { ...a, role: newRole } : a))
    );
    onShowLoading(true, `جاري تعديل دور (${email}) إلى (${newRole})...`);
    try {
      await onUpdateAdminRole(email, newRole);
      onShowLoading(false);
      onShowToast(`تم بنجاح تعديل دور ${email} إلى ${newRole}`);
    } catch (err: any) {
      setLocalAdmins(adminList);
      onShowLoading(false);
      alert(`حدث خطأ أثناء تعديل الدور: ${err.message || err}`);
    }
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
      setActiveTopCard('editor');
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
      setActiveTopCard('editor');
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
      setActiveTopCard('editor');
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
      setPdfEndPage(Math.min(2, totalPages));

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

    onShowLoading(true, `جاري استخراج النصوص محلياً من الصفحات (${pdfStartPage}) إلى (${pdfEndPage}) في المتصفح وتصحيح الحروف...`);
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
      onShowToast(`🎉 تم بنجاح استخراج محتوى الصفحات (${parsed.slides.length} شريحة) محلياً بدون إنترنت أو مفتاح API مع تصحيح الحروف!`);
      setEditorTab('preview-doc');
      setActiveTopCard('editor');
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
      setActiveTopCard('editor');
    } catch (err: any) {
      console.error(err);
      const errMsg = String(err.message || err);
      const isTimeoutOr504 = errMsg.includes('504') || errMsg.includes('Gateway Timeout') || errMsg.includes('انتهت مهلة') || errMsg.includes('FUNCTION_INVOCATION_TIMEOUT');

      if (isTimeoutOr504 && rawPdfFile) {
        onShowLoading(true, '⚠️ انتهت مهلة معالجة الذكاء الاصطناعي (504). جاري التحويل التلقائي للاستخراج المحلي فائق السرعة مع تصحيح الحروف...');
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
          onShowToast('⚡ تم التحويل بنجاح للاستخراج المحلي وتصحيح الحروف المقطعة تلقائياً!');
          setEditorTab('preview-doc');
          setActiveTopCard('editor');
          return;
        } catch (fallbackErr) {
          console.error('Fallback error:', fallbackErr);
        }
      }

      onShowLoading(false);
      alert('حدث خطأ أثناء معالجة الذكاء الاصطناعي: ' + errMsg + '\n\n💡 نصيحة: اختر صفحة أو صفحتين فقط لتقليل وقت المعالجة وتجنب انتهاء المهلة، أو استخدم زر "⚡ استخراج محلي سريع".');
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

  const currentEditingPolicy: Policy | null = useMemo(() => {
    if (editingPolicy) return editingPolicy;
    if (selectedPolicyId && selectedPolicyId !== 'new') {
      const found = policies?.find((p) => p.id === selectedPolicyId);
      if (found) return found;
    }
    if (title || contentHtml || manualPlainText) {
      return {
        id: selectedPolicyId && selectedPolicyId !== 'new' ? selectedPolicyId : `pol-${Date.now()}`,
        title: title || '',
        code: code || '',
        category: (isCustomCategory ? customCategoryName : category) || 'QPI',
        dept: dept || 'جميع أقسام المستشفى',
        version: version || '1.0',
        date: date || '',
        purpose: purpose || '',
        content_html: contentHtml || '',
        plain_text: manualPlainText || '',
        slides: slides || [],
        images: images || [],
      };
    }
    return null;
  }, [
    editingPolicy,
    selectedPolicyId,
    policies,
    title,
    contentHtml,
    manualPlainText,
    code,
    category,
    isCustomCategory,
    customCategoryName,
    dept,
    version,
    date,
    purpose,
    slides,
    images,
  ]);

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
        </div>
      </div>

      {/* 3 Top Cards strictly in the same row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1 Tab: Smart AI Converter */}
        <div
          onClick={() => setActiveTopCard('converter')}
          className={`p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between select-none ${
            activeTopCard === 'converter'
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-600 shadow-md ring-2 ring-teal-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-300">🚀</span>
              <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2.5 py-0.5 rounded-full ${
                activeTopCard === 'converter'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {activeTopCard === 'converter' ? 'النشط' : 'فتح'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                محرك الرفع والتحويل الذكي
              </h3>
              <p className="text-[9px] sm:text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold truncate">
                Smart AI Converter
              </p>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                رفع واستخراج فوري لملفات Word و PDF و PPTX والصور تلقائياً
              </p>
            </div>
          </div>
          <div className="hidden sm:flex mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 items-center justify-between text-xs font-bold text-teal-800 dark:text-teal-300">
            <span>تحويل فوري + بناء الشرائح</span>
            <span>←</span>
          </div>
        </div>

        {/* Card 2 Tab: Policy Editor & Preview */}
        <div
          onClick={() => setActiveTopCard('editor')}
          className={`p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between select-none ${
            activeTopCard === 'editor'
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-600 shadow-md ring-2 ring-teal-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">📝</span>
              <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2.5 py-0.5 rounded-full ${
                activeTopCard === 'editor'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {policies?.length || 0} سياسة
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                محرر ومعاينة السياسة
              </h3>
              <p className="text-[9px] sm:text-[11px] font-mono text-indigo-700 dark:text-indigo-400 font-bold truncate">
                Policy Editor & Preview
              </p>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                تحرير الحقول والشرائح ومعاينة الوثيقة الرسمية ومحاكي العرض
              </p>
            </div>
          </div>
          <div className="hidden sm:flex mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300">
            <span>المعاينة والحفظ السحابي</span>
            <span>←</span>
          </div>
        </div>

        {/* Card 3 Tab: Quality Managers & Roles */}
        <div
          onClick={() => setActiveTopCard('admins')}
          className={`p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between select-none ${
            activeTopCard === 'admins'
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-600 shadow-md ring-2 ring-teal-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">👥</span>
              <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2.5 py-0.5 rounded-full ${
                activeTopCard === 'admins'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {localAdmins.length} مديرين
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                إدارة مديري الجودة والأدوار
              </h3>
              <p className="text-[9px] sm:text-[11px] font-mono text-amber-700 dark:text-amber-400 font-bold truncate">
                Quality Managers & Roles
              </p>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                إضافة واعتماد وتعديل صلاحيات المديرين (محرر / مدير / مدير عام)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
            <span>تعديل الصلاحيات والأدوار</span>
            <span>←</span>
          </div>
        </div>
      </div>

      {/* 1. Section: محرك الرفع والتحويل الذكي (Smart AI Converter) */}
      {activeTopCard === 'converter' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🚀</span>
              <span>محرك الرفع والتحويل الذكي (Smart AI Converter)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              اختر ملف Word أو PDF أو عرض PowerPoint أو صورة لاستخراج محتواها وتحويلها لسياسة وشرائح تلقائياً
            </p>
          </div>

          {/* Universal Fast Converter Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white border border-teal-500/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl p-2 rounded-2xl bg-teal-500/20 border border-teal-500/30 shrink-0">🎯</span>
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-black text-white">
                  المحول الشامل التلقائي (Word / PDF / PowerPoint / صور)
                </h4>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  اختر أي ملف بصيغة Word (.docx) أو PDF أو PowerPoint (.pptx) أو صورة (.png/.jpg) وسيقوم النظام فوراً باستخراج محتواه وبناء الشرائح ونقله لمحرر السياسة
                </p>
              </div>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-black text-xs sm:text-sm transition shadow-md whitespace-nowrap active:scale-95 shrink-0">
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

          {/* Clean 2-column quick actions (Images & JSON Import) — Word, PPTX, PDF boxes removed per user request */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Image Upload & Parser */}
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 shrink-0">🖼️</span>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-purple-950 dark:text-purple-200 text-xs sm:text-sm">
                    صور ومخططات تدفق (.png/.jpg)
                  </h4>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300 font-semibold truncate">
                    تحويل الصورة فوراً لوثيقة سياسة وإدراجها كمخطط معتمد
                  </p>
                </div>
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs transition shadow-sm shrink-0 whitespace-nowrap">
                  <span>اختيار صورة</span>
                  <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* 2. Direct JSON Batch Importer */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 shrink-0">📥</span>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
                    استيراد كود JSON ودفعات
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold truncate">
                    لصق كود JSON أو رفع ملف دفعات لحفظه فوراً في السحابة
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>فتح مستورد JSON</span>
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
                    استخراج محلي فوري متاح
                  </span>
                  <span className="text-[11px] bg-teal-900/60 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-700">
                    تحليل Gemini Flash AI
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
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="استخراج فوري للنصوص والشرائح محلياً داخل المتصفح بدون الحاجة لمفتاح API أو إنترنت"
                  >
                    <span>⚡</span>
                    <span>استخراج محلي سريع (بدون API)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProcessPdfWithGemini}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
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

      {/* 3. Section: إدارة مديري الجودة والأدوار (Quality Managers & Roles) */}
      {activeTopCard === 'admins' && canSeeAdmins && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>👥</span>
                <span>إدارة مديري الجودة والأدوار (Quality Managers & Roles)</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                الأدوار: <b>editor (محرر)</b> يحرر السياسات — <b>admin (مدير)</b> يحذف ويرى القائمة — <b>superadmin (مدير عام)</b> يدير المديرين ويعدل الأدوار.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 self-start sm:self-auto">
              {localAdmins.length} مديرين معتمدين
            </span>
          </div>

          {isSuperAdmin ? (
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
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-600 outline-none"
              />
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
                className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="editor">محرر (editor)</option>
                <option value="admin">مدير (admin)</option>
                <option value="superadmin">مدير عام (superadmin)</option>
              </select>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0 active:scale-95"
              >
                <span>➕</span>
                <span>اعتماد مدير</span>
              </button>
            </form>
          ) : (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
              إدارة المديرين وإضافة أو تعديل الصلاحيات متاحة لحسابات المدير العام (superadmin) فقط.
            </p>
          )}

          {/* Table / Cards of Registered Admins with Role Changing Dropdown */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              قائمة المديرين المسجلين وتعديل الأدوار الفوري:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {localAdmins.map((a) => {
                const isCurrent = a.email.toLowerCase() === currentUserEmail.trim().toLowerCase();
                return (
                  <div
                    key={a.email}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">
                        {a.role === 'superadmin' ? '👑' : a.role === 'admin' ? '🛡️' : '✏️'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate" dir="ltr">
                            {a.email}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                              حسابك
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {a.role === 'superadmin'
                            ? 'مدير عام: كامل الصلاحيات وتعديل الأدوار'
                            : a.role === 'admin'
                            ? 'مدير: حذف السياسات ومراجعة القائمة'
                            : 'محرر: إضافة وتعديل السياسات والشرائح'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Role Selector Dropdown - Allows modifying from editor to admin or vice versa for ANY email! */}
                      {isSuperAdmin ? (
                        <select
                          value={a.role}
                          onChange={(e) => handleRoleChange(a.email, e.target.value as AdminRole)}
                          className="px-2.5 py-1 rounded-xl text-xs font-extrabold border border-teal-500/40 bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 outline-none cursor-pointer shadow-2xs hover:border-teal-500 transition"
                          title="تعديل دور هذا المستخدم"
                        >
                          <option value="editor">محرر (editor)</option>
                          <option value="admin">مدير (admin)</option>
                          <option value="superadmin">مدير عام (superadmin)</option>
                        </select>
                      ) : (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {a.role}
                        </span>
                      )}

                      {/* Remove Button */}
                      {isSuperAdmin && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdminEmail(a.email)}
                          className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300 flex items-center justify-center transition cursor-pointer text-xs font-bold active:scale-95"
                          title={`إزالة ${a.email}`}
                        >
                          ✕
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

      {/* 2. Section: استوديو السياسات المتطور (Policy Studio - Phase 3A) */}
      {activeTopCard === 'editor' && (
        <PolicyStudio
          policy={currentEditingPolicy}
          existingPolicies={policies || []}
          onSave={async (savedPolicy) => {
            await onSavePolicy(savedPolicy);
            setSelectedPolicyId(savedPolicy.id);
          }}
          onClose={() => {
            setActiveTopCard('converter');
            onResetEditor();
          }}
          onShowToast={onShowToast}
          onSelectPolicy={(id) => {
            handleSelectPolicy(id);
          }}
        />
      )}

      {/* JSON Batch Import Modal */}
      {isJsonModalOpen && onImportPolicies && (
        <JsonImportModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          onImportPolicies={onImportPolicies}
          onShowToast={onShowToast}
          existingPolicies={policies || []}
        />
      )}
    </section>
  );
};
