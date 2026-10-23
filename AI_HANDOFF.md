# AI_HANDOFF.md — سجل التعديلات وخطة العمل (MIH Quality Portal)

> هذا الملف مرجع لأي نموذج/مطوّر يكمل العمل (Google AI Studio، Antigravity، Claude، …).
> **اقرأه كاملاً قبل أي تعديل.** آخر تحديث: 2026-10-23.

## 1) ما الذي تم تعديله (ملخص)

| المجال | قبل | بعد |
|---|---|---|
| مفتاح Gemini | `VITE_GEMINI_API_KEY` يُدمج في JS العام + حقل في الإعدادات | وكيل خادم `api/gemini.ts` (المفتاح `GEMINI_API_KEY` على الخادم فقط)؛ يتحقق من رمز Firebase ودور المدير + rate limit؛ العميل `src/services/geminiClient.ts` |
| XSS | `dangerouslySetInnerHTML` بلا تعقيم | `src/utils/sanitize.ts` (DOMPurify) عند العرض **وعند الحفظ**؛ `htmlToText` عبر DOMParser (خامل) |
| الصلاحيات | قائمة بيضاء في `settings/admin_whitelist` (قراءة عامة) + `localStorage` + إيميل ثابت في الكود | مجموعة `admins/{email}` بأدوار `editor/admin/superadmin`؛ الواجهة تقرأ دورها من Firestore فقط؛ **القواعد هي الإنفاذ الحقيقي** |
| قواعد Firestore | أي أدمن يفعل كل شيء، `settings` للقراءة العامة، لا حدود حقول | أدوار مفروضة، `email_verified`، `hasOnly` للحقول، `updated_at == request.time`، `updated_by == email`، حدود أحجام، منع حذف superadmin لنفسه، رفض افتراضي لأي مسار آخر |
| Auto-seed | يعيد كتابة/إحياء السياسات الافتراضية عند كل لقطة | **حُذف**. التهيئة يدوية (زر) وتضيف غير الموجود فقط (`seedFirestoreWithDefaults`) |
| الحفظ/الحذف | يعرض "تم الحفظ" وحتى لو فشل السحابي؛ الحذف محلياً رغم فشل Firestore | يفشل صراحةً مع رسالة ولا يضيع عمل المستخدم؛ الحذف يتطلب `admin+` |
| الأداء | حزمة واحدة 2.48MB (730KB gzip) | الأولي خفيف جداً؛ لا يتم تحميل حزمة Firebase إطلاقاً للزوار العاديين؛ `defaultPolicies` و`vendor-firebase` و`vendor-docs` تُحمَّل ديناميكياً فقط عند الحاجة |
| قراءات Firestore | قراءات مباشرة مع كل زائر | **صفر قراءات Firestore للزوار**: البيانات تُخدم كلقطة استاتيكية مجزأة (`/data/index.json` و`/data/policies/*.json`) من CDN/Vercel مع تحميل كسول للمحتوى ومسبق عند التمرير (Hover Prefetch)؛ Firestore للمديرين فقط |
| النشر التلقائي | غير متوفر (يحتاج Git push) | دالة `/api/publish` تستدعي Vercel Deploy Hook تلقائياً عند حفظ/تعديل/حذف سياسة (بفاصل تجميع 30 ثانية) لتحديث اللقطة الاستاتيكية |
| البحث | `toLowerCase` فقط | تطبيع عربي (`src/utils/arabic.ts`) + بحث فوري بالملف الخفيف `search.json` دون تحميل نصوص كل السياسات |
| Cloudinary | بلا تحقق | تحقق نوع/حجم (≤10MB) في العميل (التقييد الحقيقي في Preset — انظر 2) |
| PWA/SW | تخزين غير محدود لكل GET | `public/sw.js` v13: cache-first للسياسات المُهشَّرة ومحتواها، network-first لـ index/search/version؛ أيقونات PNG |
| Headers | لا شيء | `vercel.json`: nosniff, X-Frame-Options, HSTS, كاش استاتيكي لمدة عام للمحتوى المُهشّر، وإعادة التوجيه لا تعترض `/data/` |
| تنظيف | نسخة قديمة مكررة + ~7MB لقطات + كود ميت | حُذفت: `mih.html js/ css/ assets/ sw.js manifest.json` من الجذر، `public/assets/aistudio/`، `public/logo.jpg`، `pdfColorFix.ts`، `html2pdf`(CDN+npm) |
| البيانات | `initialData.ts` (375KB) | `src/data/meta.ts` (الأقسام + الحزم + isManualPolicy) و`src/data/defaultPolicies.ts` (كسول للـ Dev والتهيئة) |
| أخرى | — | CI (`.github/workflows/ci.yml`) على Node 20 مع `snapshot:dev` و`verify:dist`، سكريبتات snapshot وتصدير، `.env.example` محدّث |

**نتيجة التحقق في بيئتي:** `tsc --noEmit` ✅ — `npm run snapshot:dev && npx vite build && npm run verify:dist` ✅.

## 2) خطوات يدوية إلزامية (بالترتيب)

1. **دوّر مفتاح Gemini القديم** (Google AI Studio → احذف/أنشئ مفتاحاً جديداً). افترض أنه سُرّب.
2. **قبل نشر القواعد** أنشئ يدوياً في Firebase Console → Firestore: المستند `admins/<بريدك-بحروف-صغيرة>` بالحقول:
   `email` (string) · `role` = `superadmin` · `added_at` (timestamp). وراجع بقية مستندات `admins` الموجودة وأضف لكل منها `role` (`editor|admin|superadmin`) وإلا ستُعامل كغير مديرين.
3. انشر `firestore.rules` (Console → Rules، أو `firebase deploy --only firestore:rules`) واختبر في **Rules Playground**: قراءة سياسة بلا دخول ✅، كتابة بلا دخول ❌، كتابة editor ✅، حذف editor ❌، حذف admin ✅، إضافة مدير بغير superadmin ❌.
4. في Vercel: أضف `GEMINI_API_KEY` (سري، بلا VITE_) واحذف `VITE_GEMINI_API_KEY` ثم أعد النشر. تأكد أن `VITE_FIREBASE_API_KEY` و`VITE_FIREBASE_PROJECT_ID` موجودان (الدالة تستخدمهما).
5. **Vercel Deploy Hook (للنشر التلقائي):** من لوحة Vercel → Project Settings → Git → Deploy Hooks: أنشئ Hook باسم `auto-publish` لفرع `main`، وانسخ الرابط وضعه كمتغير بيئة سري في Vercel باسم `VERCEL_DEPLOY_HOOK_URL`.
6. **Cloudinary:** عطّل أي preset غير مقيّد؛ في الـ unsigned preset قيّد: الصيغ (png/jpg/webp)، الحجم الأقصى، مجلد ثابت، وفعّل moderation إن أمكن. (الأفضل لاحقاً: رفع موقّع عبر Function.)
7. **Firebase Console:** Authentication → Authorized domains (فقط نطاقاتك)، وفعّل **App Check** (reCAPTCHA Enterprise) ثم "Enforce" بعد التجربة.
8. **حذف الملفات المكررة والصور من المستودع الأصلي:** شغّل `./cleanup-repo.sh` (أو الأوامر أدناه). 
9. بعد أسبوع من التشغيل بلا أخطاء في Console، حوّل `Content-Security-Policy-Report-Only` إلى `Content-Security-Policy` في `vercel.json`.

### حذف الملفات والصور من Git

```bash
git rm -r mih.html js css assets sw.js manifest.json public/assets/aistudio public/logo.jpg \
  src/utils/pdfColorFix.ts src/data/initialData.ts
git commit -m "chore: remove legacy duplicate app, screenshots and dead files"
git push origin main
```
هذا يحذفها من **آخر نسخة** فقط. اللقطات تُظهر لوحة الإدارة وإيميلات المديرين وما زالت في **تاريخ Git**. لإزالتها نهائياً:
```bash
pip install git-filter-repo
git filter-repo --path public/assets/aistudio --invert-paths
git push --force origin main     # ثم أخبر أي متعاون بإعادة clone
```
(بديل بلا تعديل التاريخ: اجعل المستودع Private، وغيّر ما يلزم من الحسابات.)

## 3) قيود معروفة

- حد جسم الطلب في Vercel Functions ≈ **4.5MB**: تحويل PDF بالذكاء الاصطناعي لنطاق صفحات كبير قد يفشل (413) — الواجهة تعرض رسالة؛ قلّل النطاق أو استخدم الاستخراج المحلي.
- `npm audit`: 11 ثغرة مصدرها سلسلة `firebase` (مكوّنات Node غير مستخدمة في المتصفح)؛ لم أرفع الإصدار الرئيسي لتجنب كسر التوافق. راقب تحديثات firebase.
- التطوير المحلي: `npm run dev` لا يخدم `/api`؛ استخدم `npx vercel dev` لتجربة Gemini.
- حزم الرعاية (`BundlesView`) ما زالت **محلية فقط** (localStorage) — لا تصلح كسجل تدقيق بعد (المرحلة 1).
- الصور المولّدة بالذكاء الاصطناعي تُحفظ كـ data-URL داخل المستند؛ قد تقترب من حد 1MiB. الأفضل رفعها لـ Cloudinary (المرحلة 1).

## 4) قواعد العمل لأي نموذج يكمل المشروع

**افعل:**
- اللغة: واجهة عربية RTL، النصوص والتوثيق بالعربية، أسماء الملفات/الأكواد بالإنجليزية.
- كل ما يُحقن كـ HTML يمر عبر `sanitizeHtml`. لا تستخدم `innerHTML` لتحليل نص؛ استخدم `htmlToText`.
- أي صلاحية جديدة = تعديل `firestore.rules` **و**الواجهة معاً، والواجهة للعرض فقط.
- أي كتابة على Firestore تضبط `updated_at: serverTimestamp()` و`updated_by` (بريد بحروف صغيرة) وتتوافق مع `hasOnly` في القواعد (أضف الحقل الجديد للقواعد أولاً).
- أي مكتبة ثقيلة تُستورد ديناميكياً (`import()`)؛ لا تُدخل شيئاً للحزمة الأولى.
- بعد كل مهمة: `bunx tsc --noEmit && bunx vite build` يجب أن ينجحا.

**لا تفعل:**
- لا تعيد أي مفتاح سري (Gemini أو غيره) إلى الواجهة أو متغير `VITE_*` أو `localStorage`.
- لا تعد الـ auto-seed ولا قائمة بيضاء في `settings/*` ولا إيميلات ثابتة في الكود.
- لا تحذف/تخفّف قواعد الأمان لحل خطأ صلاحيات؛ عدّل الدور أو الدخول.
- لا تضف صوراً/لقطات شاشة إلى `public/`.
- لا تستخدم `prompt()/alert()/confirm()` في ميزات جديدة؛ استخدم مودال/Toast.

**خريطة الملفات:** `src/App.tsx` (الحالة، الاشتراكات، الأدوار) · `src/services/firebase.ts` (Firestore/Auth/admins) · `src/services/aiAndParsers.ts` (Word/PDF/PPTX/صور + Gemini عبر الوكيل) · `src/services/geminiClient.ts` · `api/gemini.ts` · `src/components/AdminView.tsx` (ضخم — يُقسَّم) · `src/data/meta.ts` · `src/data/defaultPolicies.ts` (كسول) · `firestore.rules` · `vercel.json`.

## 5) خارطة الطريق (للتنفيذ بالترتيب، لكل مرحلة معيار قبول)

**المرحلة 1 — إغلاق الدين التقني**
- تقسيم `AdminView.tsx` (>1500 سطر) إلى: `AdminsPanel`, `PolicyEditor`, `ImportPanel`, `AiConverter`. *قبول:* لا ملف مكوّن >500 سطر، البناء ينجح.
- حفظ حزم الرعاية في Firestore: `bundle_audits/{id}` = {bundleId, dept, shift, auditorEmail, items[], score, at} + قواعد (create للمحررين، لا تعديل/حذف). *قبول:* التدقيق يظهر عند جهاز آخر.
- رفع صور الذكاء الاصطناعي إلى Cloudinary بدل data-URL. استبدال `prompt/alert/confirm` بمودالات.
- فصل فهرس السياسات عن المحتوى: `policies` (حقول خفيفة) + `policy_content/{id}` (HTML/slides) يُجلب عند الفتح فقط؛ لتقليل القراءات والنقل. *قبول:* الصفحة الرئيسية لا تنزّل `content_html`.
- اختبارات Vitest للـ `sanitize`, `arabic`, `buildPolicyPayload`، واختبار قواعد بـ `@firebase/rules-unit-testing`.

**المرحلة 2 — ضبط الوثائق (متطلب GAHAR الأساسي)**
- حالات الوثيقة: `draft → in_review → approved → published → archived` + حقل `status` (القراءة العامة لـ `published` فقط).
- سجل إصدارات: `policies/{id}/versions/{n}` (لقطة غير قابلة للتعديل) + من/متى/سبب التعديل.
- تواريخ سريان ومراجعة وتنبيه قبل الانتهاء (لوحة "تستحق المراجعة"، وإشعارات لاحقاً).
- مسار اعتماد: كاتب → مراجع → معتمِد، وتوقيع/إقرار مسجّل بالوقت.
- `audit_log/{id}` غير قابل للتعديل (create فقط) لكل عملية (إنشاء/تعديل/حذف/تغيير دور).
- طباعة بعلامة مائية "نسخة غير مضبوطة عند الطباعة" + رقم الإصدار.

**المرحلة 3 — الأطباء والتمريض**
- "قرأت وفهمت": `acknowledgements/{policyId_userEmail}` + لوحة نسب الالتزام لكل قسم.
- اختبار قصير بعد الشرائح + سجل تدريب/كفاءات.
- QR لكل وحدة يفتح السياسة، إشعارات FCM عند تحديث سياسة، وضع offline كامل، مفضلة متزامنة.
- دخول موظفين (Google Workspace للمستشفى أو قائمة مسموح بها) مع أدوار قراءة.

**المرحلة 4 — لجان الاعتماد (GAHAR)**
- ربط المعايير: `standards/{id}` ↔ `policies` ↔ `evidence` (ملفات/روابط) ولوحة "تغطية المعايير".
- محاكاة مسح (Mock Survey) وقوائم Tracer، ونتائج مع إجراءات تصحيحية CAPA.
- مؤشرات: نظافة الأيدي، CLABSI/VAP/CAUTI من تدقيقات الحزم، تقارير PDF جاهزة للتصدير.
- ربط تقارير الأحداث (OVR) بالسياسات ذات الصلة.

**المرحلة 5 — تشغيل واعتمادية**
- App Check مُفعّل (Enforce)، نسخ احتياطي مجدول لـ Firestore، مراقبة أخطاء (Sentry)، تقرير WCAG، Dependabot.
- نقل رفع الصور إلى رفع موقّع، وتقييد CORS.

## 6) Prompt جاهز للصقه في Google AI Studio / Antigravity

```
أنت مطوّر Full-Stack أول تكمل مشروع "MIH Quality Portal" (React 19 + TypeScript + Vite + Tailwind + Firebase + Vercel).
اقرأ AI_HANDOFF.md كاملاً أولاً والتزم بالقسم 4 (قواعد العمل) حرفياً.
نفّذ المرحلة {N} من القسم 5 فقط، مهمة بمهمة. لكل مهمة:
1) اشرح خطتك في 5 أسطر. 2) عدّل الكود والقواعد معاً. 3) شغّل: bunx tsc --noEmit && bunx vite build وأرفق النتيجة.
4) حدّث قسم "ما الذي تم تعديله" في AI_HANDOFF.md. 5) لا تتجاوز نطاق المهمة ولا تعدّل firestore.rules بما يخفف الأمان.
اللغة: عربية RTL للواجهة والتوثيق.
```
