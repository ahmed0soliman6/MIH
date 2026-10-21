import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { Slide, CategoryKey } from '../types';

export function getArabicCurrentMonthYear(): string {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateSlidesFromHtml(html: string, title: string): Slide[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const slides: Slide[] = [];

  // Title slide
  slides.push({
    slide_number: 1,
    slide_title: title || 'سياسة الجودة المعتمدة',
    bullet_points: [
      'سياسة رسمية معتمدة بمستشفى المنصورة الدولي',
      'تطبيق المعايير القياسية لسلامة المرضى والجودة الصحية',
      'إلزامية لجميع الكوادر الطبية والتمريضية والإدارية'
    ]
  });

  // 1. Try finding headings first
  const headings = doc.querySelectorAll('h1, h2, h3, h4, strong');
  let slideNum = 2;

  if (headings.length > 0) {
    headings.forEach((h) => {
      const text = h.textContent?.trim();
      if (!text || text.length < 3 || text.length > 80) return;

      const bullets: string[] = [];
      let nextElem = h.nextElementSibling;
      while (nextElem && !['H1', 'H2', 'H3', 'H4'].includes(nextElem.tagName) && bullets.length < 4) {
        if (nextElem.tagName === 'P') {
          const pText = nextElem.textContent?.trim();
          if (pText) bullets.push(pText.length > 100 ? pText.substring(0, 100) + '...' : pText);
        } else if (nextElem.tagName === 'UL' || nextElem.tagName === 'OL') {
          nextElem.querySelectorAll('li').forEach((li) => {
            const liText = li.textContent?.trim();
            if (bullets.length < 4 && liText) {
              bullets.push(liText.length > 100 ? liText.substring(0, 100) + '...' : liText);
            }
          });
        }
        nextElem = nextElem.nextElementSibling;
      }

      if (bullets.length === 0) {
        bullets.push('الالتزام التام بمتطلبات هذا البند الإجرائي.');
        bullets.push('توثيق الخطوات في السجلات الطبية المعتمدة.');
      }

      slides.push({
        slide_number: slideNum++,
        slide_title: text,
        bullet_points: bullets
      });
    });
  }

  // 2. If still few slides, chunk paragraphs
  if (slides.length <= 1) {
    const paragraphs = Array.from(doc.querySelectorAll('p, li'))
      .map(p => p.textContent?.trim())
      .filter((t): t is string => Boolean(t && t.length > 10));

    for (let i = 0; i < paragraphs.length && slides.length < 7; i += 3) {
      const chunk = paragraphs.slice(i, i + 3);
      slides.push({
        slide_number: slideNum++,
        slide_title: `البند الإجرائي ${slides.length}`,
        bullet_points: chunk.map(c => c.length > 90 ? c.substring(0, 90) + '...' : c)
      });
    }
  }

  return slides.length > 1 ? slides : [
    ...slides,
    {
      slide_number: 2,
      slide_title: 'بنود وإجراءات التطبيق',
      bullet_points: [
        'تطبيق الإجراءات الواردة في الدليل التشغيلي المعتمد',
        'متابعة مؤشرات الأداء الخاصة بالقسم بانتظام',
        'الإبلاغ عن أي صعوبات تواجه التطبيق لإدارة الجودة'
      ]
    }
  ];
}

// -------------------------------------------------------------
// Word Parser (.docx / .doc) with Mammoth + JSZip XML Fallback
// -------------------------------------------------------------
export async function parseWordDocument(file: File): Promise<{
  title: string;
  code: string;
  category: CategoryKey;
  dept: string;
  version: string;
  date: string;
  purpose: string;
  content_html: string;
  plain_text: string;
  slides: Slide[];
}> {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  let extractedHtml = '';
  let plainText = '';

  const arrayBuffer = await file.arrayBuffer();

  // Attempt 1: Mammoth
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    extractedHtml = result.value || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(extractedHtml, 'text/html');
    plainText = doc.body.textContent || '';
  } catch (mErr) {
    console.warn('Mammoth parsing failed, attempting raw DOCX XML fallback via JSZip:', mErr);
  }

  // Attempt 2: JSZip fallback for word/document.xml if mammoth failed
  if (!extractedHtml || extractedHtml.trim().length < 10) {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        const xmlStr = await docXmlFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
        const paragraphs = xmlDoc.querySelectorAll('w\\:p, p');
        let htmlBuild = '<div class="policy-doc">';
        let textBuild = '';

        paragraphs.forEach((p) => {
          let line = '';
          const texts = p.querySelectorAll('w\\:t, t');
          texts.forEach(t => line += t.textContent || '');
          const trimmed = line.trim();
          if (trimmed) {
            htmlBuild += `<p>${escapeHtml(trimmed)}</p>`;
            textBuild += trimmed + '\n';
          }
        });
        htmlBuild += '</div>';

        extractedHtml = htmlBuild;
        plainText = textBuild;
      }
    } catch (zipErr) {
      console.warn('JSZip DOCX fallback failed:', zipErr);
    }
  }

  if (!extractedHtml || extractedHtml.trim().length === 0) {
    throw new Error('لم نتمكن من قراءة ملف Word المحدد. تأكد أنه ملف .docx سليم وغير تالف.');
  }

  const slides = generateSlidesFromHtml(extractedHtml, cleanTitle);
  const codeSuffix = cleanTitle.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'QPI';

  return {
    title: cleanTitle,
    code: `MIH-${codeSuffix}-001`,
    category: 'QPI',
    dept: 'جميع الأقسام المعنية بالمستشفى',
    version: 'الإصدار 1.0',
    date: getArabicCurrentMonthYear(),
    purpose: plainText.substring(0, 250).trim() + (plainText.length > 250 ? '...' : ''),
    content_html: extractedHtml,
    plain_text: plainText,
    slides
  };
}

// -------------------------------------------------------------
// PowerPoint Parser (.pptx) with JSZip
// -------------------------------------------------------------
export async function parsePptxDocument(file: File): Promise<{
  title: string;
  code: string;
  category: CategoryKey;
  dept: string;
  version: string;
  date: string;
  purpose: string;
  content_html: string;
  plain_text: string;
  slides: Slide[];
}> {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const arrayBuffer = await file.arrayBuffer();
  
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error('فشل فتح ملف العرض التقديمي. تأكد أنه ملف PowerPoint بصيغة .pptx سليمة: ' + (err.message || err));
  }

  // Find all slide XML files
  const slidePaths = Object.keys(zip.files).filter(path => 
    path.startsWith('ppt/slides/slide') && path.endsWith('.xml')
  );

  if (slidePaths.length === 0) {
    throw new Error('لم يتم العثور على أي شرائح داخل ملف الـ PowerPoint (.pptx) المرفوع.');
  }

  // Natural numeric sort
  slidePaths.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, '') || '0', 10);
    const numB = parseInt(b.replace(/[^0-9]/g, '') || '0', 10);
    return numA - numB;
  });

  const slides: Slide[] = [];
  let fullPlainText = '';
  let fullHtml = '<div class="policy-presentation-doc space-y-4">';

  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const xmlContent = await zip.files[path].async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

    const paragraphs = xmlDoc.querySelectorAll('p, a\\:p');
    const textLines: string[] = [];

    paragraphs.forEach((p) => {
      let line = '';
      const textNodes = p.querySelectorAll('t, a\\:t');
      textNodes.forEach(t => line += t.textContent || '');
      const trimmed = line.trim();
      if (trimmed) {
        textLines.push(trimmed);
      }
    });

    if (textLines.length > 0) {
      const slideTitle = textLines[0];
      const bullets = textLines.slice(1);

      slides.push({
        slide_number: i + 1,
        slide_title: slideTitle,
        bullet_points: bullets.length > 0 ? bullets : ['شريحة تدريبية معتمدة بمستشفى المنصورة الدولي']
      });

      fullPlainText += `${slideTitle}\n${bullets.join('\n')}\n\n`;
      fullHtml += `<h3>${escapeHtml(slideTitle)}</h3>`;
      if (bullets.length > 0) {
        fullHtml += `<ul>${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
      }
    }
  }

  fullHtml += '</div>';

  const docTitle = slides.length > 0 ? slides[0].slide_title : cleanTitle;

  return {
    title: docTitle || cleanTitle,
    code: 'MIH-PPT-001',
    category: 'QPI',
    dept: 'جميع الأقسام المعنية بالمستشفى',
    version: 'الإصدار 1.0',
    date: getArabicCurrentMonthYear(),
    purpose: fullPlainText.substring(0, 250).trim() || 'عرض تقديمي تدريبي معتمد بمستشفى المنصورة الدولي',
    content_html: fullHtml,
    plain_text: fullPlainText,
    slides: slides.length > 0 ? slides : [
      {
        slide_number: 1,
        slide_title: cleanTitle,
        bullet_points: ['عرض تقديمي تدريبي معتمد بمستشفى المنصورة الدولي']
      }
    ]
  };
}

// -------------------------------------------------------------
// PDF Inspection & Local / Gemini AI Extraction
// -------------------------------------------------------------
export async function inspectPdfDocument(file: File): Promise<{
  pdfDoc: PDFDocument;
  totalPages: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  return {
    pdfDoc,
    totalPages: pdfDoc.getPageCount()
  };
}

// Extract PDF text locally in the browser (0 API required!)
export async function extractPdfTextLocally(
  file: File,
  startPage: number,
  endPage: number
): Promise<{
  title: string;
  code: string;
  category: CategoryKey;
  dept: string;
  version: string;
  date: string;
  purpose: string;
  content_html: string;
  plain_text: string;
  slides: Slide[];
}> {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const validStart = Math.max(1, Math.min(startPage, numPages));
  const validEnd = Math.max(validStart, Math.min(endPage, numPages));

  const slides: Slide[] = [];
  let fullPlainText = '';
  let fullHtml = '<div class="policy-doc space-y-4">';
  let slideNum = 1;

  for (let p = validStart; p <= validEnd; p++) {
    const page = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    const rawLines: string[] = [];

    content.items.forEach((item: any) => {
      const s = (item.str || '').trim();
      if (s) rawLines.push(s);
    });

    const pageText = rawLines.join(' ').replace(/\s+/g, ' ').trim();
    if (pageText) {
      fullPlainText += `\n[صفحة ${p}]: ${pageText}\n`;
      fullHtml += `<h3>محتوى السياسة (صفحة ${p})</h3><p>${escapeHtml(pageText)}</p>`;

      const sentences = pageText.split(/[.،؛\n]+/).map(s => s.trim()).filter(s => s.length > 10);
      slides.push({
        slide_number: slideNum++,
        slide_title: sentences[0] && sentences[0].length < 60 ? sentences[0] : `محددات الجودة (صفحة ${p})`,
        bullet_points: sentences.slice(1, 4).length > 0 
          ? sentences.slice(1, 4).map(s => s.length > 90 ? s.substring(0, 90) + '...' : s)
          : ['تطبيق الإجراءات الواردة في الوثيقة الطبية المعتمدة']
      });
    }
  }

  fullHtml += '</div>';

  if (!fullPlainText.trim()) {
    throw new Error('لم نتمكن من استخراج نصوص مقروءة من هذه الصفحات. قد تكون الصفحات عبارة عن صور ممسوحة ضوئياً (Scanned Images). في هذه الحالة، يرجى استخدام زر التحليل بـ Gemini AI.');
  }

  return {
    title: cleanTitle,
    code: 'MIH-PDF-001',
    category: 'IPC',
    dept: 'جميع الأقسام المعنية بالمستشفى',
    version: 'الإصدار 1.0',
    date: getArabicCurrentMonthYear(),
    purpose: fullPlainText.substring(0, 250).trim() + '...',
    content_html: fullHtml,
    plain_text: fullPlainText,
    slides: slides.length > 0 ? slides : [
      {
        slide_number: 1,
        slide_title: cleanTitle,
        bullet_points: ['سياسة معتمدة بمستشفى المنصورة الدولي']
      }
    ]
  };
}

// Process PDF with Gemini AI (with model cascade & robust fallback)
export async function processPdfWithGemini(
  pdfDoc: PDFDocument,
  startPage: number,
  endPage: number,
  apiKey: string
): Promise<{
  title: string;
  code: string;
  category: CategoryKey;
  dept: string;
  version: string;
  purpose: string;
  content_html: string;
  slides: Slide[];
}> {
  const totalPages = pdfDoc.getPageCount();
  if (startPage < 1 || endPage < startPage || endPage > totalPages) {
    throw new Error(`يرجى تحديد نطاق صفحات صحيح بين 1 و ${totalPages}`);
  }

  // Create sub-document with requested pages
  const subDoc = await PDFDocument.create();
  const pageIndices: number[] = [];
  for (let i = startPage - 1; i < endPage; i++) {
    pageIndices.push(i);
  }
  const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
  copiedPages.forEach((p) => subDoc.addPage(p));

  const subPdfBytes = await subDoc.save();
  let binary = '';
  const bytes = new Uint8Array(subPdfBytes);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const pdfBase64 = window.btoa(binary);

  const promptText = `
أنت خبير معتمد في إدارة الجودة وسلامة المرضى بالمستشفيات واعتماد المنشآت الصحية (GAHAR / CBAHI / JCI).
قم بفحص هذه الصفحات واستخرج محتوى السياسة بدقة 100% باللغة العربية الفصحى السليمة بدون أي أخطاء في انعكاس الحروف أو اتجاه الكلمات.
يجب إرجاع النتيجة بتنسيق JSON حصراً بدون أي كتل نصية إضافية أو علامات markdown (no backticks) بالهيكل التالي:
{
  "title": "عنوان السياسة الواضح والرسمي",
  "code": "كود السياسة مثل MIH-IPC-001 أو IPC-001",
  "category": "رمز القسم من هذه القائمة فقط: (NSR, IPC, MMS, QPI, FMS, ER, ICD)",
  "dept": "الأقسام المعنية بالمستشفى",
  "version": "رقم الإصدار وتاريخه",
  "purpose": "الهدف الرئيسي من السياسة في فقرة موجزة",
  "content_html": "النص الكامل للسياسة منسقاً بـ HTML احترافي يتضمن العناوين <h3>، الفقرات <p>، القوائم المنقطة والمرقمة <ul>/<ol><li>، والجداول <table> مع المسؤوليات والإجراءات",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "عنوان الشريحة",
      "bullet_points": ["نقطة ملخصة 1", "نقطة ملخصة 2", "نقطة ملخصة 3"]
    }
  ]
}
`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: pdfBase64
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  };

  // Try official Google Gemini models in order of capability & availability
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = '';

  for (const modelName of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          let cleanJson = textOutput.trim();
          if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
          if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
          if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

          const parsed = JSON.parse(cleanJson.trim());
          const validCategories: CategoryKey[] = ['NSR', 'IPC', 'MMS', 'QPI', 'FMS', 'ER', 'ICD'];
          const category: CategoryKey = validCategories.includes(parsed.category) ? parsed.category : 'QPI';

          return {
            title: parsed.title || 'سياسة مستخرجة بالذكاء الاصطناعي',
            code: parsed.code || 'MIH-QPI-001',
            category,
            dept: parsed.dept || 'جميع الأقسام المعنية بالمستشفى',
            version: parsed.version || 'الإصدار 1.0',
            purpose: parsed.purpose || '',
            content_html: parsed.content_html || '',
            slides: Array.isArray(parsed.slides) ? parsed.slides : []
          };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = errorData.error?.message || `HTTP ${response.status}`;
      }
    } catch (e: any) {
      lastError = e.message || String(e);
    }
  }

  throw new Error(`فشل الاتصال بـ Gemini API عبر النماذج المعتمدة. تأكد من صحة مفتاح الـ API وتفعيله:\n${lastError}`);
}

export function compressImageToWebP(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', { type: 'image/webp' }));
          } else {
            resolve(file);
          }
        }, 'image/webp', 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(
  file: File,
  cloudName: string,
  uploadPreset: string
): Promise<string> {
  let fileToUpload = file;
  if (file.size < 50 * 1024 && file.type.startsWith('image/')) {
    fileToUpload = await compressImageToWebP(file);
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('upload_preset', uploadPreset);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errRes = await res.json().catch(() => ({}));
    throw new Error(errRes.error?.message || `HTTP ${res.status}: فشل الرفع إلى Cloudinary`);
  }

  const data = await res.json();
  return data.secure_url;
}
