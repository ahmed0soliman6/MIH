/**
 * Vercel Serverless Function — وكيل آمن لـ Gemini.
 *
 * يبقي مفتاح Gemini على الخادم فقط (متغير بيئة GEMINI_API_KEY بدون بادئة VITE_).
 * يشترط:  Authorization: Bearer <Firebase ID token>  لمستخدم موجود في admins (أي دور).
 *
 * متغيرات البيئة (Vercel → Settings → Environment Variables):
 *   GEMINI_API_KEY        مفتاح Gemini (سرّي)
 *   FIREBASE_API_KEY      (أو يُستخدم VITE_FIREBASE_API_KEY) لتحقق الهوية
 *   FIREBASE_PROJECT_ID   (أو VITE_FIREBASE_PROJECT_ID)
 */

const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-flash-latest']);
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

// تحديد معدل بسيط داخل الذاكرة (يعمل لكل instance؛ حماية جزئية فقط).
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  return false;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const fbKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!geminiKey || !fbKey || !projectId) {
    return res.status(500).json({ error: 'الخادم غير مهيأ: تحقق من GEMINI_API_KEY و FIREBASE_API_KEY و FIREBASE_PROJECT_ID.' });
  }

  // 1) التحقق من رمز Firebase
  const auth = String(req.headers.authorization || '');
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!idToken) return res.status(401).json({ error: 'تسجيل الدخول مطلوب.' });

  let email = '';
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!r.ok) return res.status(401).json({ error: 'رمز الدخول غير صالح أو منتهي.' });
    const j: any = await r.json();
    const u = j?.users?.[0];
    if (!u?.email || u.emailVerified !== true) return res.status(403).json({ error: 'البريد غير موثّق.' });
    email = String(u.email).toLowerCase();
  } catch {
    return res.status(502).json({ error: 'تعذر التحقق من الهوية.' });
  }

  // 2) التحقق أنه مدير: قراءة مستنده الشخصي في admins بصلاحياته هو (تفرضها القواعد)
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/admins/${encodeURIComponent(email)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (r.status !== 200) return res.status(403).json({ error: 'هذه الخاصية للمديرين المعتمدين فقط.' });
  } catch {
    return res.status(502).json({ error: 'تعذر التحقق من الصلاحيات.' });
  }

  // 3) تحديد المعدل
  if (rateLimited(email)) {
    return res.status(429).json({ error: 'تجاوزت الحد المسموح مؤقتاً. حاول بعد قليل.' });
  }

  // 4) التحقق من الطلب
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const model = body?.model;
  const payload = body?.body;
  if (!ALLOWED_MODELS.has(model) || !payload || typeof payload !== 'object' || !Array.isArray(payload.contents)) {
    return res.status(400).json({ error: 'طلب غير صالح.' });
  }

  // 5) تمرير الطلب إلى Gemini
  try {
    const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({ contents: payload.contents, generationConfig: payload.generationConfig })
    });
    const text = await g.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(g.status).send(text);
  } catch {
    return res.status(502).json({ error: 'تعذر الاتصال بخدمة Gemini.' });
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
