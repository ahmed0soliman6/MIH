import { loadFirebase } from './firebaseLoader';

/**
 * استدعاء Gemini عبر الوكيل الآمن /api/gemini (المفتاح على الخادم فقط).
 * يعيد Response بنفس واجهة fetch حتى تبقى منطقيات المعالجة كما هي.
 */
export async function callGemini(model: string, body: unknown): Promise<Response> {
  const fb = await loadFirebase();
  const token = await fb.getCurrentIdToken();
  if (!token) {
    throw new Error('سجّل الدخول بحساب مدير معتمد لاستخدام التحويل الذكي (Gemini).');
  }
  return fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ model, body })
  });
}

export function describeGeminiHttpError(status: number): string {
  if (status === 401 || status === 403) return 'غير مصرح: سجّل الدخول بحساب مدير معتمد.';
  if (status === 413) return 'حجم الطلب كبير (حد Vercel ≈ 4.5MB). قلّل نطاق الصفحات أو استخدم الاستخراج المحلي.';
  if (status === 429) return 'تم تجاوز الحد المسموح مؤقتاً، حاول بعد دقائق.';
  if (status === 404) return 'خدمة /api/gemini غير متاحة (في التطوير المحلي استخدم: vercel dev).';
  return `HTTP ${status}`;
}
