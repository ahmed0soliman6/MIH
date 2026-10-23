import { loadFirebase } from './firebaseLoader';

export interface PublishResult {
  ok: boolean;
  status: number;
  message?: string;
  retryAfterSec?: number;
}

/**
 * إرسال طلب نشر تلقائي إلى /api/publish عبر Vercel Deploy Hook
 */
export async function requestPublish(keepalive = false): Promise<PublishResult> {
  try {
    const fb = await loadFirebase();
    const token = await fb.getCurrentIdToken();

    if (!token) {
      return {
        ok: false,
        status: 401,
        message: 'يجب تسجيل الدخول كمدير معتمد لإطلاق عملية النشر.'
      };
    }

    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      keepalive
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 202) {
      return {
        ok: true,
        status: 202,
        message: 'تم إطلاق عملية النشر والتحديث بنجاح.'
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        retryAfterSec: data.retryAfterSec || 20,
        message: data.error || 'يرجى الانتظار قليلاً قبل طلب نشر جديد.'
      };
    }

    return {
      ok: false,
      status: res.status,
      message: data.error || `تعذر إتمام طلب النشر (رمز الحالة: ${res.status}).`
    };
  } catch (err: any) {
    console.error('requestPublish error:', err);
    return {
      ok: false,
      status: 500,
      message: err.message || 'حدث خطأ في الاتصال بخدمة النشر.'
    };
  }
}
