import * as mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import { Slide, CategoryKey } from '../types';

export function getArabicCurrentMonthYear(): string {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
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

  const headings = doc.querySelectorAll('h1, h2, h3, h4');
  let slideNum = 2;

  headings.forEach((h) => {
    const text = h.textContent?.trim();
    if (!text || text.length < 3) return;

    const bullets: string[] = [];
    let nextElem = h.nextElementSibling;
    while (nextElem && !['H1', 'H2', 'H3', 'H4'].includes(nextElem.tagName) && bullets.length < 4) {
      if (nextElem.tagName === 'P') {
        const pText = nextElem.textContent?.trim();
        if (pText) bullets.push(pText.length > 90 ? pText.substring(0, 90) + '...' : pText);
      } else if (nextElem.tagName === 'UL' || nextElem.tagName === 'OL') {
        nextElem.querySelectorAll('li').forEach((li) => {
          const liText = li.textContent?.trim();
          if (bullets.length < 4 && liText) {
            bullets.push(liText);
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
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const extractedHtml = result.value;

  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

  const parser = new DOMParser();
  const doc = parser.parseFromString(extractedHtml, 'text/html');
  const plainText = doc.body.textContent || '';

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
  "category": "رمز القسم من هذه القائمة فقط: (NSR, IPC, MMS, QPI, FMS, ER)",
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: فشل الاتصال بنموذج Gemini`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('لم يقم نموذج الذكاء الاصطناعي بإرجاع أي محتوى.');
  }

  let cleanJson = textOutput.trim();
  if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
  if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
  if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

  const parsed = JSON.parse(cleanJson.trim());

  // Validate category
  const validCategories: CategoryKey[] = ['NSR', 'IPC', 'MMS', 'QPI', 'FMS', 'ER'];
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
