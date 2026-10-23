/**
 * تطبيع النص العربي للبحث: يوحّد الألف والهمزات والياء/الألف المقصورة والتاء المربوطة
 * ويحذف التشكيل والتطويل والأرقام الهندية → لاتينية، ثم lower-case.
 */
export function normalizeArabic(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase();
}
