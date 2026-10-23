import DOMPurify from 'dompurify';

/**
 * تعقيم HTML قبل العرض أو الحفظ (حماية من XSS المخزَّن).
 * - يزيل السكربتات و on* handlers وروابط javascript:.
 * - يُبقي التنسيق المستخدم في السياسات (class / style / جداول / صور).
 */
let hookInstalled = false;

function ensureHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      if (node.getAttribute('target') && node.getAttribute('target') !== '_self') {
        node.setAttribute('target', '_blank');
      }
    }
  });
}

export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  ensureHook();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'formaction'],
    ADD_ATTR: ['target'],
  });
}

/** استخراج النص العادي من HTML بدون إنشاء عناصر قابلة للتنفيذ (DOMParser مستند خامل). */
export function htmlToText(html: string | undefined | null): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
