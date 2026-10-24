import { Policy } from '../types';

export interface PolicySummary {
  id: string;
  code: string;
  title: string;
  category: string;
  dept?: string;
  version?: string;
  date?: string;
  purpose?: string;
  effectiveDate?: string;
  reviewDate?: string;
  responsibilities?: string | string[];
  notes?: string;
  source?: string;
  updated_at?: string;
  slidesCount?: number;
  file: string;
}

// كاش في الذاكرة لمنع تكرار جلب السياسات التي تم فتحها مسبقاً
const contentCache = new Map<string, Policy>();
// منع تكرار الطلبات المتزامنة لنفس السياسة (in-flight dedupe)
const inFlightRequests = new Map<string, Promise<Policy>>();

// كاش نصوص البحث الكامل
let searchCache: Record<string, string> | null = null;
let searchInFlight: Promise<Record<string, string>> | null = null;

/**
 * التحقق من سلامة استجابة الـ fetch لتجنب مشاكل إعادة توجيه الـ SPA لـ HTML
 */
async function validateJsonResponse(res: Response, urlDesc: string): Promise<any> {
  if (!res.ok) {
    throw new Error(`تعذر تحميل ${urlDesc} (رمز الحالة: ${res.status})`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json') && !contentType.toLowerCase().includes('json')) {
    throw new Error(`استجابة غير صالحة لـ ${urlDesc}: نوع المحتوى ليس JSON.`);
  }
  return res.json();
}

/**
 * جلب فهرس السياسات الخفيف من اللقطة الثابتة
 */
export async function loadPolicyIndex(): Promise<Policy[]> {
  try {
    const res = await fetch('/data/index.json', { cache: 'no-cache' });
    if (!res.ok) {
      const mod = await import('../data/defaultPolicies');
      return mod.DEFAULT_POLICIES;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('json')) {
      const mod = await import('../data/defaultPolicies');
      return mod.DEFAULT_POLICIES;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      const mod = await import('../data/defaultPolicies');
      return mod.DEFAULT_POLICIES;
    }

    return data.map((item: PolicySummary): Policy => ({
      id: item.id,
      code: item.code,
      title: item.title,
      category: item.category,
      dept: item.dept || '',
      version: item.version || 'الإصدار 1.0',
      date: item.date || '',
      purpose: item.purpose || '',
      effectiveDate: item.effectiveDate,
      reviewDate: item.reviewDate,
      responsibilities: item.responsibilities,
      notes: item.notes,
      source: item.source,
      updated_at: item.updated_at,
      content_html: '',
      plain_text: '',
      slides: [],
      images: [],
      _summary: true,
      _file: item.file
    }));
  } catch {
    const mod = await import('../data/defaultPolicies');
    return mod.DEFAULT_POLICIES;
  }
}

/**
 * جلب المحتوى الكامل لسياسة معينة عند فتحها فقط
 */
export async function loadPolicyContent(policy: Policy): Promise<Policy> {
  // إذا كانت السياسة محملة بالكامل وليست ملخصاً
  if (!policy._summary && policy.content_html) {
    return policy;
  }

  const fileUrl = policy._file;
  if (!fileUrl) {
    return policy;
  }

  // التحقق من الكاش في الذاكرة أولاً
  if (contentCache.has(policy.id)) {
    return contentCache.get(policy.id)!;
  }

  // منع تكرار الطلبات المتزامنة لنفس الملف
  if (inFlightRequests.has(policy.id)) {
    return inFlightRequests.get(policy.id)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(fileUrl);
      const fullData = await validateJsonResponse(res, `محتوى السياسة (${policy.code || policy.id})`);

      if (!fullData || typeof fullData !== 'object' || !fullData.id) {
        throw new Error(`محتوى السياسة (${policy.code}) غير صالح.`);
      }

      const merged: Policy = {
        ...policy,
        ...fullData,
        _summary: false,
        _file: fileUrl
      };

      contentCache.set(policy.id, merged);
      return merged;
    } catch (err: any) {
      console.error(`خطأ أثناء تحميل محتوى السياسة (${policy.code}):`, err);
      throw new Error(err.message || `تعذر تحميل محتوى السياسة (${policy.code}).`);
    } finally {
      inFlightRequests.delete(policy.id);
    }
  })();

  inFlightRequests.set(policy.id, fetchPromise);
  return fetchPromise;
}

/**
 * تحميل مسبق صامت لمحتوى السياسة عند تمرير الماوس أو اللمس (Prefetch)
 */
export function prefetchPolicy(policy: Policy): void {
  if (!policy || !policy._summary || !policy._file) return;
  if (contentCache.has(policy.id) || inFlightRequests.has(policy.id)) return;

  // استدعاء صامت وتجاهل أي أخطاء
  loadPolicyContent(policy).catch(() => {});
}

/**
 * جلب نصوص البحث الكامل (search.json) مرة واحدة فقط وتخزينها في الذاكرة
 */
export async function loadSearchTexts(): Promise<Record<string, string>> {
  if (searchCache) return searchCache;
  if (searchInFlight) return searchInFlight;

  searchInFlight = (async () => {
    try {
      const res = await fetch('/data/search.json');
      const data = await validateJsonResponse(res, 'فهرس البحث الكامل');
      if (!data || typeof data !== 'object') {
        throw new Error('فهرس البحث غير صالح.');
      }
      searchCache = data;
      return data;
    } catch (err: any) {
      console.warn('تعذر جلب فهرس البحث الكامل:', err.message);
      return {};
    } finally {
      searchInFlight = null;
    }
  })();

  return searchInFlight;
}

/**
 * جلب إصدار وتاريخ توليد اللقطة الحالية
 */
export async function loadDataVersion(): Promise<{ generatedAt: string; count: number } | null> {
  try {
    const res = await fetch('/data/version.json', { cache: 'no-cache' });
    const data = await validateJsonResponse(res, 'إصدار اللقطة');
    if (data && typeof data === 'object' && data.generatedAt) {
      return {
        generatedAt: String(data.generatedAt),
        count: Number(data.count) || 0
      };
    }
    return null;
  } catch {
    return null;
  }
}
