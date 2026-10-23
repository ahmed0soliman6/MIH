import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Slide, CategoryKey } from '../types';
import { callGemini, describeGeminiHttpError } from './geminiClient';
import { getCurrentIdToken } from './firebase';

// Safely configure PDF.js worker in browser context without crashing
if (typeof window !== 'undefined' && (pdfjsLib as any).GlobalWorkerOptions) {
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${(pdfjsLib as any).version || '6.4.299'}/build/pdf.worker.min.mjs`;
  }
}

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

export function cleanAndRepairArabicText(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Remove hyphens/dashes between Arabic letters (e.g. ف - ري - ق -> فريق, ال - ج - ودة -> الجودة)
  for (let i = 0; i < 5; i++) {
    const prev = text;
    text = text.replace(/([\u0600-\u06FF])\s*[-–—_]\s*([\u0600-\u06FF])/g, '$1$2');
    if (text === prev) break;
  }

  // 2. Fix spaced-out Arabic letters (e.g. "ف ر ي ق" or "ا ل س ي ا س ة")
  text = text.replace(/(?:^|\s)([\u0600-\u06FF]\s+){2,}[\u0600-\u06FF](?:\s|$)/g, (match) => {
    const trimmed = match.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.every(p => p.length === 1 && /[\u0600-\u06FF]/.test(p))) {
      return ' ' + parts.join('') + ' ';
    }
    return match;
  });

  // 3. Normalize duplicate spaces and clean orphan dashes
  text = text.replace(/\s*[-–—]\s*/g, ' - ');
  text = text.replace(/^\s*-\s+/gm, '• ');
  text = text.replace(/\s{2,}/g, ' ');

  return text.trim();
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
  images?: string[];
}> {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const arrayBuffer = await file.arrayBuffer();

  const slides: Slide[] = [];
  const extractedImages: string[] = [];
  let fullPlainText = '';
  let fullHtml = '<div class="policy-doc space-y-4">';
  let slideNum = 1;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${(pdfjsLib as any).version || '6.4.299'}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${(pdfjsLib as any).version || '6.4.299'}/standard_fonts/`,
      useSystemFonts: true
    });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const validStart = Math.max(1, Math.min(startPage, numPages));
    const validEnd = Math.max(validStart, Math.min(endPage, numPages));

    for (let p = validStart; p <= validEnd; p++) {
      const page = await pdfDoc.getPage(p);
      const content = await page.getTextContent();

      // Collect and sort text items by position for proper reading flow
      interface TextPosItem {
        str: string;
        x: number;
        y: number;
      }
      const rawItems: TextPosItem[] = [];

      content.items.forEach((item: any) => {
        const s = (item.str || '').trim();
        if (!s) return;
        const x = Array.isArray(item.transform) ? item.transform[4] : 0;
        const y = Array.isArray(item.transform) ? item.transform[5] : 0;
        rawItems.push({ str: s, x, y });
      });

      // Sort items top-to-bottom (y descending in PDF coordinate system)
      rawItems.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff;
        // Same line: check if line is Arabic RTL or English LTR
        const isRtl = /[\u0600-\u06FF]/.test(a.str) || /[\u0600-\u06FF]/.test(b.str);
        return isRtl ? b.x - a.x : a.x - b.x;
      });

      // Group into lines
      const lines: string[] = [];
      let curY: number | null = null;
      let curLineWords: string[] = [];

      rawItems.forEach((it) => {
        if (curY === null || Math.abs(it.y - curY) > 5) {
          if (curLineWords.length > 0) {
            lines.push(curLineWords.join(' '));
          }
          curY = it.y;
          curLineWords = [it.str];
        } else {
          curLineWords.push(it.str);
        }
      });
      if (curLineWords.length > 0) {
        lines.push(curLineWords.join(' '));
      }

      // Filter out strange unprintable characters or control glyphs and repair disconnected Arabic characters
      const cleanLines = lines
        .map((l) => cleanAndRepairArabicText(l.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')).trim())
        .filter((l) => l.length > 0);

      const pageText = cleanAndRepairArabicText(cleanLines.join('\n'));

      // Check if page has readable text or is a scanned image
      const readableTextLength = pageText.replace(/[^a-zA-Z\u0600-\u06FF0-9]/g, '').length;
      const isScannedOrEmpty = readableTextLength < 8;

      let renderedImageDataUrl = '';
      if (isScannedOrEmpty) {
        // Render scanned page to high-res canvas so user sees the actual document
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await (page.render as any)({ canvasContext: ctx, canvas, viewport }).promise;
            renderedImageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            extractedImages.push(renderedImageDataUrl);
          }
        } catch (rErr) {
          console.warn(`Could not render canvas for page ${p}:`, rErr);
        }
      }

      if (!isScannedOrEmpty) {
        fullPlainText += `\n[صفحة ${p}]:\n${pageText}\n`;
        fullHtml += `<h3>محتوى السياسة (صفحة ${p})</h3>`;
        cleanLines.forEach((cl) => {
          fullHtml += `<p>${escapeHtml(cl)}</p>`;
        });

        const sentences = pageText
          .split(/[.،؛\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 10 && !s.startsWith('['));

        slides.push({
          slide_number: slideNum++,
          slide_title: sentences[0] && sentences[0].length < 60 ? sentences[0] : `محددات الجودة (صفحة ${p})`,
          bullet_points: sentences.slice(1, 4).length > 0
            ? sentences.slice(1, 4).map((s) => (s.length > 90 ? s.substring(0, 90) + '...' : s))
            : ['تطبيق الإجراءات الواردة في الوثيقة الطبية المعتمدة']
        });
      } else if (renderedImageDataUrl) {
        fullPlainText += `\n[صفحة ${p}]: صفحة ممسوحة ضوئياً (مستند معتمد)\n`;
        fullHtml += `
          <div class="my-4 text-center">
            <h3>صفحة مستند معتمد (${p})</h3>
            <img src="${renderedImageDataUrl}" alt="صفحة ${p}" class="rounded-xl shadow border border-slate-200 mx-auto max-h-96 my-2" />
          </div>`;
        slides.push({
          slide_number: slideNum++,
          slide_title: `صفحة مستند معتمد (${p})`,
          bullet_points: [
            'مستند ممسوح ضوئياً تم استخراجه بنجاح كشريحة مصورة',
            'يمكنك استخراج نصوصه تلقائياً بالنقر على "تحليل ذكي بـ Gemini AI"'
          ],
          image_url: renderedImageDataUrl
        });
      }
    }
  } catch (pdfErr) {
    console.warn('PDF.js parsing exception:', pdfErr);
  }

  fullHtml += '</div>';

  if (!fullPlainText.trim()) {
    fullPlainText = `محتوى سياسة الجودة لملف: ${cleanTitle}`;
    fullHtml = `
      <div class="policy-doc space-y-4">
        <h3>محتوى السياسة المستخرج من ملف PDF (${escapeHtml(cleanTitle)})</h3>
        <p>تم استيراد صفحات الملف بنجاح. إذا كانت صفحات الملف ممسوحة ضوئياً كصور، يمكنك أيضاً استخدام زر "تحليل ذكي بـ Gemini AI" لاستخراج كافة النصوص بدقة ذكاء اصطناعي فائقة.</p>
        <p>تلتزم كافة الأقسام الطبية والتمريضية بمستشفى المنصورة الدولي ببنود وإجراءات هذه السياسة.</p>
      </div>`;
    slides.push({
      slide_number: 1,
      slide_title: cleanTitle,
      bullet_points: [
        'سياسة معتمدة بمستشفى المنصورة الدولي',
        'تطبيق المعايير الإكلينيكية وسلامة المرضى',
        'متابعة مؤشرات الأداء الخاصة بالقسم'
      ]
    });
  }

  return {
    title: cleanTitle,
    code: 'MIH-PDF-001',
    category: 'IPC',
    dept: 'جميع الأقسام المعنية بالمستشفى',
    version: 'الإصدار 1.0',
    date: getArabicCurrentMonthYear(),
    purpose: fullPlainText.substring(0, 250).trim() + (fullPlainText.length > 250 ? '...' : ''),
    content_html: fullHtml,
    plain_text: fullPlainText,
    slides: slides.length > 0 ? slides : [
      {
        slide_number: 1,
        slide_title: cleanTitle,
        bullet_points: ['سياسة معتمدة بمستشفى المنصورة الدولي']
      }
    ],
    images: extractedImages
  };
}

// -------------------------------------------------------------
// Image Parser (.png / .jpg / .jpeg / .webp)
// -------------------------------------------------------------
export async function parseImageDocument(
  file: File,
  useAi: boolean = false
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
  images: string[];
}> {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

  const base64DataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // إذا كان الذكاء الاصطناعي مفعّلاً (مدير مسجّل الدخول) نحاول التفريغ الذكي عبر الوكيل الآمن /api/gemini
  if (useAi) {
    try {
      const pureBase64 = base64DataUrl.split(',')[1] || '';
      const promptText = `
أنت خبير جودة واعتماد مستشفيات (GAHAR / JCI).
قم بفحص هذه الصورة واستخرج محتوى السياسة أو المخطط التوضيحي باللغة العربية الفصحى السليمة.
أرجع JSON حصراً بدون markdown بالشكل التالي:
{
  "title": "عنوان السياسة المكتشف من الصورة",
  "code": "MIH-QPI-001",
  "category": "QPI",
  "dept": "جميع الأقسام المعنية",
  "purpose": "الهدف الإكلينيكي من السياسة",
  "content_html": "<p>محتوى السياسة مع الخطوات والمسؤوليات</p>",
  "bullet_points": ["نقطة 1", "نقطة 2", "نقطة 3"]
}
`;
      const response = await callGemini('gemini-2.5-flash', {
        contents: [{
          parts: [
            { inlineData: { mimeType: file.type || 'image/jpeg', data: pureBase64 } },
            { text: promptText }
          ]
        }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          let cleanJson = text.trim();
          if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
          if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
          if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
          const parsed = JSON.parse(cleanJson.trim());
          const html = `
<div class="policy-doc space-y-4">
  <figure class="my-4 text-center">
    <img src="${base64DataUrl}" alt="${escapeHtml(parsed.title || cleanTitle)}" class="rounded-xl shadow-md mx-auto max-h-96 border border-slate-200" />
    <figcaption class="text-xs text-slate-500 font-bold mt-2">مخطط السياسة المعتمد</figcaption>
  </figure>
  ${parsed.content_html || ''}
</div>`;
          return {
            title: parsed.title || cleanTitle,
            code: parsed.code || 'MIH-QPI-001',
            category: (parsed.category as CategoryKey) || 'QPI',
            dept: parsed.dept || 'جميع الأقسام المعنية بالمستشفى',
            version: 'الإصدار 1.0',
            date: getArabicCurrentMonthYear(),
            purpose: parsed.purpose || 'سياسة إكلينيكية وإجرائية معتمدة بمستشفى المنصورة الدولي',
            content_html: html,
            plain_text: `${parsed.title || cleanTitle} ${parsed.purpose || ''}`,
            slides: [
              {
                slide_number: 1,
                slide_title: parsed.title || cleanTitle,
                bullet_points: parsed.bullet_points || [
                  'سياسة وإجراءات الجودة المعتمدة',
                  'الالتزام بالمسار التوضيحي المعتمد بالصورة والمخطط',
                  'تطبيق المعايير الإكلينيكية وسلامة المرضى'
                ],
                image_url: base64DataUrl
              }
            ],
            images: [base64DataUrl]
          };
        }
      }
    } catch (e) {
      console.warn('Gemini image transcription fallback to local structured template:', e);
    }
  }

  // Local structured template (works 100% offline without API key)
  const htmlContent = `
<div class="policy-doc space-y-4">
  <figure class="my-4 text-center">
    <img src="${base64DataUrl}" alt="${escapeHtml(cleanTitle)}" class="rounded-2xl shadow-md mx-auto max-h-96 border border-slate-200" />
    <figcaption class="text-xs text-slate-500 font-bold mt-2">الشكل التوضيحي: مسار ومخطط تطبيق السياسة المعتمد</figcaption>
  </figure>
  <h3>1. الهدف من السياسة (Policy Purpose)</h3>
  <p>تهدف هذه السياسة إلى توحيد وتطبيق معايير السلامة والجودة والمسار الإجرائي الموضح في المخطط المرفق أعلاه بمستشفى المنصورة الدولي.</p>
  <h3>2. نطاق التطبيق (Scope of Service)</h3>
  <p>تنطبق هذه الإجراءات على جميع الكوادر الطبية والتمريضية والفنية المعنية في كافة الأقسام الداخلية وأقسام الطوارئ والعناية المركزة.</p>
  <h3>3. الإجراءات والمسؤوليات (Procedures & Responsibilities)</h3>
  <ul>
    <li>الالتزام بالخطوات والمراحل التوضيحية المبينة في المخطط التدفقي.</li>
    <li>توثيق كل مرحلة إجرائية في السجلات والملف الطبي المعتمد للمريض.</li>
    <li>إبلاغ مشرف الجودة عند وجود أي معوقات أو انحراف عن المسار المعياري.</li>
  </ul>
</div>`;

  return {
    title: cleanTitle,
    code: 'MIH-QPI-001',
    category: 'QPI',
    dept: 'جميع الأقسام المعنية بالمستشفى',
    version: 'الإصدار 1.0',
    date: getArabicCurrentMonthYear(),
    purpose: `سياسة وإجراءات معتمدة بمستشفى المنصورة الدولي وفقاً للمخطط التوضيحي المرفق (${cleanTitle}).`,
    content_html: htmlContent,
    plain_text: `${cleanTitle} سياسة ومخطط توضيحي معتمد`,
    slides: [
      {
        slide_number: 1,
        slide_title: cleanTitle,
        bullet_points: [
          'سياسة وإجراءات معتمدة بمستشفى المنصورة الدولي',
          'الالتزام التام بالخطوات الموضحة في المخطط التدفقي',
          'ضمان استيفاء معايير الجودة وسلامة المرضى'
        ],
        image_url: base64DataUrl
      }
    ],
    images: [base64DataUrl]
  };
}

// Process PDF with Gemini AI (with model cascade & robust fallback)
export async function processPdfWithGemini(
  pdfDoc: PDFDocument,
  startPage: number,
  endPage: number
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
  if (!(await getCurrentIdToken())) {
    throw new Error('سجّل الدخول بحساب مدير معتمد لاستخدام التحويل الذكي (Gemini).');
  }

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
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  const pdfBase64 = window.btoa(binary);

  const promptText = `
أنت خبير معتمد في إدارة الجودة وسلامة المرضى بالمستشفيات واعتماد المنشآت الصحية (GAHAR / CBAHI / JCI).
قم بفحص هذه الصفحات واستخرج محتوى السياسة بدقة 100% باللغة العربية الفصحى السليمة بدون أي أخطاء في انعكاس الحروف أو اتجاه الكلمات.
يجب إرجاع النتيجة بتنسيق JSON حصراً بدون أي كتل نصية إضافية أو علامات markdown (no backticks) بالهيكل التالي:
{
  "title": "عنوان السياسة الواضح والرسمي",
  "code": "كود السياسة مثل MIH-IPC-001 أو IPC-001",
  "category": "رمز القسم من هذه القائمة فقط: (NSR, IPC, MMS, QPI, FMS, ER, ICD, PCC, IMT, ACT, SAS, WFM)",
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
            inlineData: {
              mimeType: 'application/pdf',
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
      responseMimeType: 'application/json'
    }
  };

  // Supported models per @google/genai specification (avoid deprecated 1.5/2.0-flash)
  const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest'];
  let fatal = false;
  let lastError = '';

  for (const modelName of candidateModels) {
    try {
      const response = await callGemini(modelName, requestBody);

      if (response.ok) {
        const data = await response.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          let cleanJson = textOutput.trim();
          if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
          if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
          if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

          const parsed = JSON.parse(cleanJson.trim());
          const validCategories: CategoryKey[] = ['NSR', 'IPC', 'MMS', 'QPI', 'FMS', 'ER', 'ICD', 'PCC', 'IMT', 'ACT', 'SAS', 'WFM'];
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
        lastError =
          (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          describeGeminiHttpError(response.status);
        if ([401, 403, 413, 429].includes(response.status)) {
          fatal = true;
          break;
        }
      }
    } catch (e: any) {
      lastError = e.message || String(e);
    }
  }

  if (fatal) {
    throw new Error(lastError);
  }

  // Fallback: If PDF inline bytes rejected, render pages to JPEG vision parts and retry
  try {
    const renderedImages: string[] = [];
    const task = pdfjsLib.getDocument({
      data: new Uint8Array(subPdfBytes),
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${(pdfjsLib as any).version || '6.4.299'}/cmaps/`,
      cMapPacked: true,
      useSystemFonts: true
    });
    const renderedDoc = await task.promise;
    for (let p = 1; p <= renderedDoc.numPages; p++) {
      const page = await renderedDoc.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await (page.render as any)({ canvasContext: ctx, canvas, viewport }).promise;
        const dUrl = canvas.toDataURL('image/jpeg', 0.85);
        renderedImages.push(dUrl.split(',')[1] || '');
      }
    }

    if (renderedImages.length > 0) {
      const imageParts = renderedImages.map((b64) => ({
        inlineData: { mimeType: 'image/jpeg', data: b64 }
      }));
      const visionBody = {
        contents: [
          {
            parts: [...imageParts, { text: promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      for (const modelName of candidateModels) {
        const res = await callGemini(modelName, visionBody);
        if (res.ok) {
          const vData = await res.json();
          const tOut = vData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (tOut) {
            let clean = tOut.trim();
            if (clean.startsWith('```json')) clean = clean.slice(7);
            if (clean.startsWith('```')) clean = clean.slice(3);
            if (clean.endsWith('```')) clean = clean.slice(0, -3);
            const pObj = JSON.parse(clean.trim());
            const validCategories: CategoryKey[] = ['NSR', 'IPC', 'MMS', 'QPI', 'FMS', 'ER', 'ICD', 'PCC', 'IMT', 'ACT', 'SAS', 'WFM'];
            return {
              title: pObj.title || 'سياسة مستخرجة بالذكاء الاصطناعي',
              code: pObj.code || 'MIH-QPI-001',
              category: validCategories.includes(pObj.category) ? pObj.category : 'QPI',
              dept: pObj.dept || 'جميع الأقسام المعنية بالمستشفى',
              version: pObj.version || 'الإصدار 1.0',
              purpose: pObj.purpose || '',
              content_html: pObj.content_html || '',
              slides: Array.isArray(pObj.slides) ? pObj.slides : []
            };
          }
        }
      }
    }
  } catch (visionErr) {
    console.warn('Vision fallback notice:', visionErr);
  }

  throw new Error(`فشل التحويل الذكي عبر Gemini:\n${lastError}`);
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
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const MAX_BYTES = 10 * 1024 * 1024;
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('يُسمح فقط برفع صور PNG / JPG / WebP / GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('حجم الصورة أكبر من 10MB. قلّل الحجم ثم أعد المحاولة.');
  }

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
