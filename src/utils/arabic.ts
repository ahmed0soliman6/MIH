/**
 * أدوات البحث والتطبيع المتقدم للنصوص العربية
 * Normalized Arabic Search & Highlighting Engine
 * مستشفى المنصورة الدولي (MIH) - إدارة الجودة وسلامة المرضى
 */

// علامات التشكيل والتطويل في اليونيكود
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * تطبيع النص العربي للبحث:
 * يوحّد الألف والهمزات، والتاء المربوطة/الهاء، والياء/الألف المقصورة
 * ويحذف التشكيل والتطويل، ويوحد الأرقام الهندية واللاتينية، ثم يُحوّل إلى lower-case.
 */
export function normalizeArabic(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(TASHKEEL_REGEX, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .trim();
}

/**
 * بناء تعبير نمطي (RegExp) لمطابقة الكلمات العربية بأي صورة كتبت بها في النص الأصلي:
 * - يتعرف على التشكيل حتى لو كتب في النص الأصلي ولم يكتب في البحث.
 * - يطابق (أ، إ، آ، ا)، و(ة، ه)، و(ى، ي، ئ)، و(ؤ، و).
 */
export function buildArabicRegex(query: string): RegExp | null {
  const clean = normalizeArabic(query);
  if (!clean) return null;

  // فصل الكلمات لتطابق أي كلمة أو العبارة الكاملة
  const escapeChar = (ch: string) => {
    // اختياري بين الحروف: تشكيل وتطويل
    const diacritics = '[\\u064B-\\u065F\\u0670\\u0640]*';

    switch (ch) {
      case 'ا':
        return `[اأإآٱ]${diacritics}`;
      case 'ه':
        return `[ةه]${diacritics}`;
      case 'ي':
        return `[يىئ]${diacritics}`;
      case 'و':
        return `[وؤ]${diacritics}`;
      case ' ':
        return '\\s+';
      default:
        // تنظيف المحارف الخاصة بالريجيكس
        if (/[.*+?^${}()|[\]\\]/.test(ch)) {
          return `\\${ch}${diacritics}`;
        }
        return `${ch}${diacritics}`;
    }
  };

  const pattern = clean.split('').map(escapeChar).join('');
  try {
    return new RegExp(`(${pattern})`, 'gi');
  } catch (e) {
    return null;
  }
}

/**
 * تظليل الكلمات المبحوث عنها داخل كود الـ HTML بأمان تام
 * دون العبث بوسوم HTML أو خصائصها، مع عد مرات المطابقة.
 */
export function highlightHtmlText(
  html: string,
  query: string
): { html: string; matchCount: number } {
  if (!html || !query || !query.trim()) {
    return { html, matchCount: 0 };
  }

  const regex = buildArabicRegex(query.trim());
  if (!regex) return { html, matchCount: 0 };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let matchCount = 0;

    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && regex.test(node.nodeValue)) {
        textNodes.push(node as Text);
      }
    }

    for (const textNode of textNodes) {
      const parent = textNode.parentNode;
      if (!parent) continue;

      if (
        parent.nodeName === 'SCRIPT' ||
        parent.nodeName === 'STYLE' ||
        (parent as HTMLElement).classList?.contains('search-highlight')
      ) {
        continue;
      }

      const val = textNode.nodeValue || '';
      regex.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(val)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(document.createTextNode(val.slice(lastIdx, m.index)));
        }
        const mark = document.createElement('mark');
        mark.className = 'search-highlight bg-amber-300 dark:bg-amber-600 text-slate-950 dark:text-amber-50 font-black px-1 py-0.5 rounded shadow-2xs';
        mark.textContent = m[0];
        frag.appendChild(mark);
        matchCount++;
        lastIdx = m.index + m[0].length;
        if (regex.lastIndex === m.index) {
          regex.lastIndex++;
        }
      }

      if (lastIdx < val.length) {
        frag.appendChild(document.createTextNode(val.slice(lastIdx)));
      }

      parent.replaceChild(frag, textNode);
    }

    return { html: doc.body.innerHTML, matchCount };
  } catch (err) {
    console.warn('Highlight HTML parsing fallback:', err);
    return { html, matchCount: 0 };
  }
}
