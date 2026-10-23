/**
 * Vercel Serverless Function — نشر الموقع تلقائياً عبر Deploy Hook بعد تعديل السياسات.
 *
 * يشترط:
 * 1. استدعاء عبر POST.
 * 2. توكن مصادقة صالح لمستخدم مسجل في مجموعة admins (editor | admin | superadmin).
 * 3. رابط VERCEL_DEPLOY_HOOK_URL صالح في متغيرات البيئة.
 * 4. حماية من الإغراق والطلبات المتتالية (Throttle: 20 ثانية لكل مستخدم).
 */

const MIN_INTERVAL_MS = 20_000;
const lastRequests = new Map<string, number>();

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  const fbKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

  if (!hook || !fbKey || !projectId) {
    return res.status(500).json({
      error: 'الخادم غير مهيأ: تحقق من وجود VERCEL_DEPLOY_HOOK_URL ومفاتيح Firebase في متغيرات البيئة.'
    });
  }

  if (!hook.startsWith('https://api.vercel.com/v1/integrations/deploy/')) {
    return res.status(500).json({ error: 'رابط Deploy Hook غير صالح أو غير معتمد من Vercel.' });
  }

  // 1) التحقق من رمز هوية Firebase
  const authHeader = String(req.headers.authorization || '');
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return res.status(401).json({ error: 'تسجيل الدخول مطلوب لإجراء النشر.' });
  }

  let email = '';
  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );

    if (!lookupRes.ok) {
      return res.status(401).json({ error: 'رمز الدخول غير صالح أو منتهي الصلاحية.' });
    }

    const userData: any = await lookupRes.json();
    const user = userData?.users?.[0];
    if (!user?.email || user.emailVerified !== true) {
      return res.status(403).json({ error: 'البريد الإلكتروني غير موثّق أو غير مسموح له.' });
    }
    email = String(user.email).toLowerCase();
  } catch (err: any) {
    return res.status(502).json({ error: 'تعذر التحقق من هوية المستخدم لدى خوادم المصادقة.' });
  }

  // 2) التحقق من دور المستخدم في admins عبر Firestore REST API
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/admins/${encodeURIComponent(email)}`;

    const adminDocRes = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    if (adminDocRes.status !== 200) {
      return res.status(403).json({ error: 'هذه العملية مصرحة لمديري الجودة فقط.' });
    }

    const docJson: any = await adminDocRes.json();
    const role = docJson?.fields?.role?.stringValue;
    if (!['editor', 'admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'رتبة حسابك لا تملك صلاحية طلب النشر.' });
    }
  } catch (err: any) {
    return res.status(502).json({ error: 'تعذر التحقق من صلاحيات الإدارة.' });
  }

  // 3) منع الطلبات المتتالية لكل مستخدم (Throttle)
  const now = Date.now();
  const prevTime = lastRequests.get(email) || 0;
  if (now - prevTime < MIN_INTERVAL_MS) {
    const retryAfterSec = Math.ceil((MIN_INTERVAL_MS - (now - prevTime)) / 1000);
    return res.status(429).json({
      error: 'تم إرسال طلب نشر مؤخراً. يرجى الانتظار قليلاً قبل إعادة المحاولة.',
      retryAfterSec
    });
  }
  lastRequests.set(email, now);

  // 4) استدعاء Vercel Deploy Hook
  try {
    const deployRes = await fetch(hook, { method: 'POST' });
    if (!deployRes.ok) {
      const errText = await deployRes.text();
      console.error('Vercel Deploy Hook error:', deployRes.status, errText);
      return res.status(502).json({ error: 'تعذر إطلاق عملية البناء عبر Vercel Deploy Hook.' });
    }

    return res.status(202).json({
      ok: true,
      requestedAt: now,
      message: 'تم استلام طلب إعادة بناء ونشر الموقع بنجاح.'
    });
  } catch (err: any) {
    console.error('Fetch Deploy Hook error:', err);
    return res.status(502).json({ error: 'فشل الاتصال بـ Vercel Deploy Hook.' });
  }
}
