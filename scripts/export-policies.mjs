import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import { writeSnapshot } from './lib/write-snapshot.mjs';

// قراءة متغيرات البيئة من process.env أو من ملف .env المحلي
function loadEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!env[key]) {
            env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('تعذر قراءة ملف .env المحلي:', e.message);
    }
  }
  return env;
}

async function fetchPoliciesWithRetry(db, maxRetries = 3) {
  const delays = [1000, 3000, 7000];
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 جاري جلب السياسات من Firestore (محاولة ${attempt} من ${maxRetries})...`);

      // مهلة 60 ثانية للطلب
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال بفايرستور (60 ثانية)')), 60000)
      );

      const fetchPromise = (async () => {
        const colRef = collection(db, 'policies');
        const snap = await getDocs(colRef);
        return snap;
      })();

      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      const list = [];

      snap.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;
        list.push({
          ...data,
          id,
          updated_at:
            data.updated_at && typeof data.updated_at.toDate === 'function'
              ? data.updated_at.toDate().toISOString()
              : data.updated_at || new Date().toISOString()
        });
      });

      return list;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ فشلت المحاولة ${attempt}: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = delays[attempt - 1] || 3000;
        console.log(`⏳ انتظار ${delay / 1000} ثوانٍ قبل المحاولة التالية...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;

  if (!apiKey || !projectId) {
    console.error('❌ خطأ فادح: متغيرات بيئة Firebase غير مهيأة.');
    console.error('   يرجى التأكد من وجود VITE_FIREBASE_API_KEY و VITE_FIREBASE_PROJECT_ID في البيئة أو في ملف .env.');
    process.exit(1);
  }

  let app = null;
  try {
    app = initializeApp({
      apiKey,
      projectId,
      authDomain
    }, 'export-policies-worker');

    const db = getFirestore(app);
    const policies = await fetchPoliciesWithRetry(db, 3);

    // التحقق من السلامة والأمان
    if (!policies || policies.length === 0) {
      console.error('❌ خطأ أمني: Firestore أعاد 0 سياسة! تم إلغاء التصدير لحماية الموقع من إفراغ البيانات.');
      process.exit(1);
    }

    // التحقق من الحقول الإلزامية لكل سياسة
    for (const p of policies) {
      if (!p.id || !p.title || !p.category || !p.code) {
        console.error(`❌ خطأ في سلامة البيانات: مستند السياسة (${p.id || 'مجهول'}) يفتقر لحقول أساسية (id, title, category, code).`);
        process.exit(1);
      }
    }

    const backup = process.argv.includes('--backup');
    await writeSnapshot(policies, { backup });
    console.log('🎉 اكتمل تصدير لقطة السياسات الثابتة بنجاح.');
  } catch (err) {
    console.error('❌ فشل تصدير السياسات من Firestore:', err.message || err);
    process.exit(1);
  } finally {
    if (app) {
      try {
        await deleteApp(app);
      } catch (_) {}
    }
  }
}

main();
