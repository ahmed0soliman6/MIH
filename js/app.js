/**
 * ==========================================================================
 * نظام إدارة وعرض سياسات الجودة بمستشفى المنصورة الدولي (MIH Quality System)
 * Hospital Quality Policies & Clinical Bundles System
 * ==========================================================================
 * الميزات الرئيسية:
 * 1. تصفح عام فوري بدون تسجيل دخول لجميع العاملين والزوار.
 * 2. مصادقة إدارية عبر Google Sign-In مع قائمة بيضاء (Whitelist).
 * 3. تخزين بيانات خفيفة في Firebase Firestore (بدون استهلاك مساحات تخزين ملفات).
 * 4. محرك استخراج ذكي لملفات Word (mammoth.js) و PDF عبر Gemini 2.5 Flash API.
 * 5. رفع الصور والمخططات الانسيابية عبر Cloudinary API مباشرة من المتصفح.
 * 6. وضعين للعرض: وضع الوثيقة الرسمية (طباعة A4) + وضع العرض التقديمي ملء الشاشة.
 */

// ==========================================================================
// 1. الإعدادات ومفاتيح الربط (Configurations)
// ==========================================================================

// إعدادات مشروع Firebase (أدخل مفاتيح مشروعك هنا)
const FIREBASE_CONFIG = {
  apiKey: "", // مثال: "AIzaSy..."
  authDomain: "", // مثال: "mih-quality.firebaseapp.com"
  projectId: "", // مثال: "mih-quality"
  storageBucket: "", // لن نستخدمه نهائياً
  messagingSenderId: "",
  appId: ""
};

// القائمة البيضاء لإيميلات مديري الجودة المصرح لهم بالإدارة
// (المدير يضع إيميله المعتمد بحساب Google هنا)
const ADMIN_EMAILS = [
  "admin@mih-quality.gov.eg",
  "quality.mih@gmail.com",
  "hospital.quality.mansoura@gmail.com"
  // أضف إيميلك هنا - مثال: "your.email@gmail.com"
];

// إعدادات Gemini API للتحويل الذكي لملفات PDF والنصوص إلى شرائح
const GEMINI_CONFIG = {
  apiKey: "", // يمكنك إدخاله هنا أو حفظه عبر نافذة الإعدادات في الواجهة
  model: "gemini-2.5-flash"
};

// إعدادات Cloudinary لرفع الصور التوضيحية والمخططات
const CLOUDINARY_CONFIG = {
  cloudName: "", // اسم حساب Cloudinary (Cloud Name)
  uploadPreset: "" // اسم الـ Unsigned Upload Preset
};

// ==========================================================================
// 2. تصنيفات الجودة المعتمدة بالمستشفى (Hospital Quality Categories)
// ==========================================================================
const CATEGORY_META = {
  NSR: {
    name: 'المعايير الوطنية للسلامة (NSR)',
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: '🛡️',
    desc: 'معايير أمان المرضى الأساسية المتوافقة مع متطلبات الهيئة العامة للاعتماد والرقابة الصحية (GAHAR).'
  },
  IPC: {
    name: 'مكافحة العدوى (IPC)',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: '🧼',
    desc: 'سياسات النظافة والتعقيم والوقاية من العدوى المكتسبة داخل المنشآت الصحية (HAIs).'
  },
  MMS: {
    name: 'إدارة واستخدام الأدوية (MMS)',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '💊',
    desc: 'سلامة الأدوية عالية الخطورة، تنظيم الصرف، وتفادي الأخطاء الدوائية الشائعة.'
  },
  QPI: {
    name: 'تحسين الجودة وسلامة المرضى (QPI)',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '📈',
    desc: 'مؤشرات الأداء، سياسات الإبلاغ عن الحوادث العارضة (OVR)، وإدارة المخاطر السريرية.'
  },
  FMS: {
    name: 'إدارة وسلامة المنشأة (FMS)',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🚒',
    desc: 'أكواد الطوارئ، السلامة والصحة المهنية، خطط الإخلاء، ومكافحة الحرائق بالمستشفى.'
  },
  ER: {
    name: 'الطوارئ والرعاية الحرجة (ER & ICU)',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: '⚡',
    desc: 'بروتوكولات الفرز الطبي (Triage)، الاستجابة السريعة لحالات السكتة القلبية والإنتان.'
  }
};

// ==========================================================================
// 3. البيانات الافتراضية الأولية (Initial Fallback Data)
// ==========================================================================
const DEFAULT_POLICIES = [
  {
    id: 'pol-1',
    code: 'MIH-NSR-001',
    title: 'سياسة التحقق الثنائي من هوية المريض (Patient Identification)',
    category: 'NSR',
    dept: 'جميع الأقسام الإكلينيكية، الاستقبال، المعامل، والأشعة',
    version: 'الإصدار 3.2',
    date: 'أكتوبر 2026',
    purpose: 'التحقق الدقيق من هوية المريض قبل تقديم أي تدخل طبي أو تمريضي أو تشخيصي لمنع أخطاء التبديل وضمان سلامة المرضى.',
    content_html: `
      <h3>1. الغرض من السياسة (Purpose)</h3>
      <p>تهدف هذه السياسة إلى ضمان تحديد هوية المريض بشكل صحيح لا يقبل اللبس قبل تقديم أي دواء أو سحب عينات أو إجراء جراحي أو نقل دم.</p>
      
      <h3>2. المبدأ الأساسي (Core Principle)</h3>
      <blockquote>يُمنع منعاً باتاً استخدام رقم الغرفة أو رقم السرير كمعرّف للمريض تحت أي ظرف.</blockquote>
      
      <h3>3. المعرفان الإلزاميان (The Two Approved Identifiers)</h3>
      <ul>
        <li><strong>الاسم الرباعي الكامل للمريض:</strong> كما هو مسجل في بطاقة الرقم القومي أو جواز السفر.</li>
        <li><strong>الرقم الطبي للملف (MRN):</strong> الرقم الموحد المسجل على أسورة المعصم وسجلات المستشفى.</li>
      </ul>

      <h3>4. ضوابط أسورة المعصم (ID Wristband Standards)</h3>
      <table class="w-full">
        <thead>
          <tr>
            <th>لون الأسورة</th>
            <th>الدلالة الإكلينيكية</th>
            <th>الإجراء المطلوب</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="inline-block w-3 h-3 rounded-full bg-white border border-slate-400 ml-1"></span> أبيض</td>
            <td>أسورة الهوية القياسية لجميع المرضى</td>
            <td>توضع فور الدخول بقسم الاستقبال</td>
          </tr>
          <tr>
            <td><span class="inline-block w-3 h-3 rounded-full bg-red-600 ml-1"></span> أحمر</td>
            <td>حساسية دوائية أو غذائية مفرطة (Allergy)</td>
            <td>تسجيل اسم المادة المسببة للحساسية</td>
          </tr>
          <tr>
            <td><span class="inline-block w-3 h-3 rounded-full bg-yellow-400 ml-1"></span> أصفر</td>
            <td>خطر السقوط المرتفع (Fall Risk)</td>
            <td>تطبيق بروتوكول حماية المريض من السقوط</td>
          </tr>
        </tbody>
      </table>
    `,
    plain_text: 'سياسة التحقق الثنائي من هوية المريض. التحقق الدقيق من هوية المريض قبل أي إجراء. استخدام الاسم الرباعي والرقم الطبي للملف MRN. يمنع استخدام رقم الغرفة أو السرير. ضوابط أسورة المعصم بيضاء حمراء صفراء.',
    slides: [
      {
        slide_number: 1,
        slide_title: 'التحقق الثنائي من هوية المريض (Patient ID)',
        bullet_points: [
          'المعيار الوطني الأول لسلامة المرضى (NSR-1)',
          'استخدام معرّفين اثنين إلزامي قبل أي خدمة طبية',
          'يُحظر تماماً استخدام رقم الغرفة أو السرير كمعرّف للمريض'
        ]
      },
      {
        slide_number: 2,
        slide_title: 'المعرّفان المعتمدان رسمياً',
        bullet_points: [
          'المعرّف الأول: الاسم الرباعي الكامل للمريض',
          'المعرّف الثاني: الرقم الطبي الموحد (MRN)',
          'تطابق البيانات مع أسورة المعصم قبل إعطاء الأدوية أو سحب الدم'
        ]
      },
      {
        slide_number: 3,
        slide_title: 'أكواد ألوان أساور المعصم',
        bullet_points: [
          'الأسورة البيضاء: الهوية العامة لجميع المرضى المقيمين',
          'الأسورة الحمراء: تنبيه الحساسية الدوائية والغذائية',
          'الأسورة الصفراء: تنبيه خطر السقوط المرتفع (Fall Risk)'
        ]
      }
    ],
    images: [],
    created_at: new Date('2026-10-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-10-15T10:30:00Z').toISOString(),
    author_email: 'quality.mih@gmail.com'
  },
  {
    id: 'pol-2',
    code: 'MIH-IPC-002',
    title: 'سياسة نظافة وتطهير الأيدي واللحظات الخمس (Hand Hygiene Policy)',
    category: 'IPC',
    dept: 'كافة العاملين بمستشفى المنصورة الدولي بدون استثناء',
    version: 'الإصدار 4.0',
    date: 'أكتوبر 2026',
    purpose: 'خفض معدلات العدوى المكتسبة بالمستشفى (HAIs) من خلال الالتزام الصارم بتقنيات نظافة وتطهير الأيدي المعتمدة من منظمة الصحة العالمية (WHO).',
    content_html: `
      <h3>1. مقدمة وأهمية السياسة</h3>
      <p>نظافة الأيدي هي الإجراء الأكثر فعالية والأقل تكلفة لمنع انتشار الميكروبات المقاومة للمضادات الحيوية وحماية المرضى ومقدمي الرعاية الصحية.</p>

      <h3>2. اللحظات الخمس لنظافة الأيدي (WHO 5 Moments)</h3>
      <ol>
        <li><strong>قبل ملامسة المريض:</strong> لحماية المريض من الميكروبات الموجودة على أيدي مقدم الخدمة.</li>
        <li><strong>قبل الإجراءات المعقمة أو النظيفة:</strong> مثل تركيب القساطر، الحقن الوريدي، وتضميد الجروح.</li>
        <li><strong>بعد التعرض لسوائل الجسم أو إفرازاته:</strong> لحماية مقدم الخدمة والبيئة المحيطة.</li>
        <li><strong>بعد ملامسة المريض:</strong> بعد الفحص السريري أو مساعدة المريض.</li>
        <li><strong>بعد ملامسة محيط وبيئة المريض:</strong> مثل حواف السرير، الأجهزة، والمفروشات.</li>
      </ol>

      <h3>3. مقارنة طرق التطهير</h3>
      <table>
        <thead>
          <tr>
            <th>الطريقة</th>
            <th>المدة المطلوبة</th>
            <th>دواعي الاستخدام</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>الدلك الكحولي (Alcohol Rub)</strong></td>
            <td>20 - 30 ثانية</td>
            <td>عندما تكون الأيدي غير متسخة ظاهرياً (الخيار المفضل والأسرع)</td>
          </tr>
          <tr>
            <td><strong>الغسيل بالماء والصابون</strong></td>
            <td>40 - 60 ثانية</td>
            <td>عندما تكون الأيدي متسخة ظاهرياً، أو بعد التعامل مع بكتيريا Clostridium difficile</td>
          </tr>
        </tbody>
      </table>
    `,
    plain_text: 'سياسة نظافة وتطهير الأيدي واللحظات الخمس لمنظمة الصحة العالمية. خفض معدلات العدوى. اللحظات الخمس قبل ملامسة المريض قبل الإجراءات النظيفة بعد سوائل الجسم بعد المريض بعد بيئة المريض. الدلك الكحولي 20-30 ثانية والغسيل بالماء والصابون 40-60 ثانية.',
    slides: [
      {
        slide_number: 1,
        slide_title: 'نظافة الأيدي: خط الدفاع الأول لمكافحة العدوى',
        bullet_points: [
          'الإجراء الأكثر فعالية عالمياً لكسر سلسلة انتقال العدوى',
          'إلزامية لجميع الأطباء والتمريض والخدمات المعاونة والزوار',
          'مراقبة معدل الامتثال الشهري من خلال فريق مكافحة العدوى'
        ]
      },
      {
        slide_number: 2,
        slide_title: 'اللحظات الخمس لمنظمة الصحة العالمية (5 Moments)',
        bullet_points: [
          '1. قبل ملامسة المريض',
          '2. قبل الإجراءات المعقمة والنظيفة (Aseptic Procedures)',
          '3. بعد التعرض لسوائل وإفرازات جسم المريض',
          '4. بعد ملامسة المريض',
          '5. بعد ملامسة بيئة ومحيط المريض'
        ]
      },
      {
        slide_number: 3,
        slide_title: 'تقنيات ونسب التطهير',
        bullet_points: [
          'الدلك الكحولي (Alcohol Rub): من 20 إلى 30 ثانية (الأيدي غير متسخة ظاهرياً)',
          'الغسيل بالماء والصابون: من 40 إلى 60 ثانية (عند وجود اتساخ مرئي)',
          'استخدام القفازات لا يغني أبداً عن نظافة الأيدي'
        ]
      }
    ],
    images: [],
    created_at: new Date('2026-10-02T09:00:00Z').toISOString(),
    updated_at: new Date('2026-10-18T11:00:00Z').toISOString(),
    author_email: 'quality.mih@gmail.com'
  },
  {
    id: 'pol-3',
    code: 'MIH-MMS-001',
    title: 'سياسة التعامل مع الأدوية عالية الخطورة والأدوية المتشابهة (High-Alert & LASA)',
    category: 'MMS',
    dept: 'الصيدليات الإكلينيكية، العنايات المركزة، الطوارئ، والعمليات',
    version: 'الإصدار 2.5',
    date: 'سبتمبر 2026',
    purpose: 'تأمين تخزين وصرف وإعطاء الأدوية عالية الخطورة والإلكتروليتات المركزة والأدوية المتشابهة في الشكل أو النطق (LASA) للوقاية من الأخطاء الدوائية الجسيمة.',
    content_html: `
      <h3>1. تعريف الأدوية عالية الخطورة (High-Alert Medications)</h3>
      <p>هي الأدوية التي تترتب عليها مخاطر جسيمة ومهددة للحياة أو مسببة لأضرار دائمة في حال حدوث خطأ في صرفها أو جرعتها أو طريقة إعطائها.</p>

      <h3>2. الإجراءات الإلزامية للأدوية عالية الخطورة</h3>
      <ul>
        <li><strong>العزل والتمييز:</strong> فصل هذه الأدوية في خزائن وأدراج مخصصة بملصق أحمر فلوري واضح (High-Alert).</li>
        <li><strong>منع المحاليل المركزة:</strong> حظر تواجد الإلكتروليتات المركزة (مثل البوتاسيوم كلوريد المركز KCl) بالأقسام الداخلية، واقتصار تحضيرها وصرفها على الصيدلية الإكلينيكية.</li>
        <li><strong>المراجعة المزدوجة المستقلة (Independent Double-Check):</strong> تحقق ممرضين اثنين بشكل منفصل من: المريض، الدواء، الجرعة، طريقة الإعطاء، ومعدل التنقيط قبل الإعطاء.</li>
      </ul>

      <h3>3. تمييز الأدوية المتشابهة (LASA Medications)</h3>
      <blockquote>يتم تطبيق تقنية حروف الرجل الطويل (Tall Man Lettering) لتمييز المقاطع المختلفة في أسماء الأدوية المتشابهة نطقاً أو شكلاً.</blockquote>
    `,
    plain_text: 'سياسة التعامل مع الأدوية عالية الخطورة والأدوية المتشابهة LASA. فصل الأدوية عالية الخطورة في خزائن مخصصة مع ملصق أحمر. منع الإلكتروليتات المركزة في الأقسام الداخلية. التحقق المزدوج المستقل Independent Double-Check. استخدام طريقة Tall Man Lettering.',
    slides: [
      {
        slide_number: 1,
        slide_title: 'الأدوية عالية الخطورة (High-Alert Medications)',
        bullet_points: [
          'أدوية تؤدي الأخطاء في إعطائها إلى أضرار بالغة أو وفاة',
          'تشمل: الأنسولين، مضادات التخثر (الهيبارين)، المخدرات، والعلاج الكيماوي',
          'توضع داخل صناديق مميزة بملصق أحمر فسفوري تحذيري'
        ]
      },
      {
        slide_number: 2,
        slide_title: 'المراجعة المزدوجة المستقلة (Double Check)',
        bullet_points: [
          'إجراء إلزامي قبل إعطاء أي دواء عالي الخطورة',
          'مراجعة مستقلة تماماً بواسطة ممرضين اثنين مؤهلين',
          'التأكد من: المريض، اسم الدواء، الجرعة، البرمجة، والتوقيت'
        ]
      },
      {
        slide_number: 3,
        slide_title: 'الأدوية المتشابهة شكلاً ونطقاً (LASA)',
        bullet_points: [
          'استخدام طريقة الحروف الكبيرة (Tall Man Lettering)',
          'أمثلة: DOBUTamine مقابل DOPAmine',
          'فصل أماكن التخزين على أرفف الصيدليات لمنع الالتقاط الخاطئ'
        ]
      }
    ],
    images: [],
    created_at: new Date('2026-09-10T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-10T12:00:00Z').toISOString(),
    author_email: 'quality.mih@gmail.com'
  },
  {
    id: 'pol-4',
    code: 'MIH-NSR-004',
    title: 'سياسة الجراحة الآمنة والوقت المستقطع (Time-Out & Safe Surgery)',
    category: 'NSR',
    dept: 'أقسام العمليات الجراحية، التخدير، والمناظير',
    version: 'الإصدار 3.0',
    date: 'أكتوبر 2026',
    purpose: 'التأكد من إجراء العملية الجراحية الصحيحة، للمريض الصحيح، وفي الموضع الجراحي الصحيح عبر تطبيق قائمة التحقق الجراحية لمنظمة الصحة العالمية.',
    content_html: `
      <h3>1. المراحل الثلاث لقائمة التحقق الجراحية (Surgical Checklist)</h3>
      <ol>
        <li><strong>قبل التخدير (Sign-In):</strong> التحقق من هوية المريض وموضع الجراحة وتوقيع الموافقة المستنيرة وتوافر الدم.</li>
        <li><strong>قبل الشق الجراحي (Time-Out):</strong> توقف كامل الفريق الجراحي لتأكيد اسم المريض والعملية والشق الجراحي والصادات الحيوية.</li>
        <li><strong>قبل خروج المريض من غرفة العمليات (Sign-Out):</strong> حصر الأدوات الجراحية والإبر والفوط، وتوثيق العينات النسيجية بدقة.</li>
      </ol>
    `,
    plain_text: 'سياسة الجراحة الآمنة والوقت المستقطع Time-Out. قائمة التحقق الجراحية لمنظمة الصحة العالمية. المراحل الثلاث Sign-In قبل التخدير Time-Out قبل الشق الجراحي Sign-Out قبل الخروج وحصر الفوط والأدوات.',
    slides: [
      {
        slide_number: 1,
        slide_title: 'الجراحة الآمنة تنقذ الأرواح (Safe Surgery)',
        bullet_points: [
          'تطبيق قائمة منظمة الصحة العالمية (WHO Surgical Safety Checklist)',
          'منع إجراء جراحة خاطئة أو لمريض خاطئ أو في موضع خاطئ',
          'مسؤولية تضامنية بين الجراح واستشاري التخدير وتمريض العمليات'
        ]
      },
      {
        slide_number: 2,
        slide_title: 'الوقت المستقطع (Time-Out)',
        bullet_points: [
          'إيقاف أي نشاط في غرفة العمليات مباشرة قبل الشق الجراحي',
          'المراجعة بصوت مرتفع بمشاركة كامل الفريق الجراحي',
          'تأكيد إعطاء المضاد الحيوي الوقائي خلال 60 دقيقة سابقة'
        ]
      }
    ],
    images: [],
    created_at: new Date('2026-10-05T08:00:00Z').toISOString(),
    updated_at: new Date('2026-10-16T14:00:00Z').toISOString(),
    author_email: 'quality.mih@gmail.com'
  },
  {
    id: 'pol-5',
    code: 'MIH-QPI-001',
    title: 'سياسة الإبلاغ عن الأحداث العارضة والوشيكة (OVR Reporting Policy)',
    category: 'QPI',
    dept: 'جميع أقسام المستشفى الطبية والتمريضية والإدارية',
    version: 'الإصدار 3.0',
    date: 'أكتوبر 2026',
    purpose: 'ترسيخ ثقافة السلامة العادلة غير العقابية (Just Culture) والتعلم المؤسسي من الأخطاء الوشيكة والأحداث الجسيمة لمنع تكرارها.',
    content_html: `
      <h3>1. ثقافة السلامة العادلة (Just Culture)</h3>
      <p>الهدف من الإبلاغ عن الأحداث العارضة هو دراسة وتحسين النظام وسد الثغرات التشغيلية، وليس توجيه اللوم أو العقاب للممارس الصحي حسن النية.</p>

      <h3>2. تصنيفات الأحداث</h3>
      <ul>
        <li><strong>حادث وشيك (Near Miss):</strong> خطأ كاد أن يقع وتم تداركه قبل أن يصل للمريض.</li>
        <li><strong>حادث عارض (Adverse Event):</strong> ضرر نتج عن الإجراء الطبي وليس بسبب طبيعة المرض.</li>
        <li><strong>حادث جسيم (Sentinel Event):</strong> وفاة غير متوقعة أو ضرر بدني ونفسي جسيم دائم يستلزم تشكيل لجنة تحليل السبب الجذري (RCA).</li>
      </ul>
    `,
    plain_text: 'سياسة الإبلاغ عن الأحداث العارضة والوشيكة OVR. ثقافة السلامة العادلة Just Culture. تصنيفات الأحداث Near Miss و Adverse Event و Sentinel Event. تحليل السبب الجذري RCA.',
    slides: [
      {
        slide_number: 1,
        slide_title: 'نظام الإبلاغ عن الأحداث العارضة (OVR)',
        bullet_points: [
          'نظام وقائي للتعلم المستمر وتطوير إجراءات العمل',
          'الإبلاغ سري وغير عقابي للممارس الصحي حسن النية',
          'الإبلاغ عن الحوادث الوشيكة يمنع وقوع الكوارث الجسيمة'
        ]
      },
      {
        slide_number: 2,
        slide_title: 'فترات الإبلاغ المعتمدة',
        bullet_points: [
          'الأحداث الجسيمة (Sentinel Events): إبلاغ فوري خلال ساعة واحدة',
          'الأحداث العارضة العادية: إبلاغ خلال 24 ساعة عبر نموذج OVR',
          'يحظر تماماً وضع نموذج OVR داخل الملف الطبي للمريض'
        ]
      }
    ],
    images: [],
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
    updated_at: new Date('2026-10-12T10:00:00Z').toISOString(),
    author_email: 'quality.mih@gmail.com'
  },
  {
    id: 'pol-6',
    code: 'MIH-FMS-003',
    title: 'سياسة أكواد الطوارئ والإنذار بالمستشفى (Emergency Codes)',
    category: 'FMS',
    dept: 'جميع العاملين وفرق الاستجابة السريعة والأمن والسلامة',
    version: 'الإصدار 2.0',
    date: 'أغسطس 2026',
    purpose: 'توحيد لغة الاستجابة السريعة لحالات الطوارئ الطبية وغير الطبية على مدار 24 ساعة داخل مستشفى المنصورة الدولي.',
    content_html: `
      <h3>جدول أكواد الطوارئ المعتمدة بمستشفى المنصورة الدولي</h3>
      <table>
        <thead>
          <tr>
            <th>الكود</th>
            <th>نوع الحالة</th>
            <th>الفريق المستجيب</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>الكود الأزرق (Code Blue)</strong></td>
            <td>توقف القلب والتنفس للبالغين أو الأطفال</td>
            <td>فريق الإنعاش القلبي الرئوي (CPR Team)</td>
          </tr>
          <tr>
            <td><strong>الكود الأحمر (Code Red)</strong></td>
            <td>نشوب حريق أو تصاعد دخان</td>
            <td>فريق السلامة وتطبيق خطة RACE و PASS</td>
          </tr>
          <tr>
            <td><strong>الكود الأصفر (Code Yellow)</strong></td>
            <td>استقبال حوادث جماعية أو كوارث خارجية</td>
            <td>لجنة الكوارث وطاقم قسم الاستقبال والطوارئ</td>
          </tr>
          <tr>
            <td><strong>الكود البرتقالي (Code Orange)</strong></td>
            <td>انسكاب مواد خطرة أو كيميائية (HAZMAT)</td>
            <td>فريق السلامة والصحة المهنية ومكافحة العدوى</td>
          </tr>
        </tbody>
      </table>
    `,
    plain_text: 'سياسة أكواد الطوارئ والإنذار بالمستشفى Emergency Codes. الكود الأزرق توقف القلب CPR الكود الأحمر حريق الكود الأصفر كوارث خارجية الكود البرتقالي انسكاب مواد خطرة HAZMAT.',
    slides: [
      {
        slide_number: 1,
        slide_title: 'أكواد الطوارئ الطبية والمنشآتية (Emergency Codes)',
        bullet_points: [
          'توحيد لغة الاتصال اللاسلكي والإذاعة الداخلية أثناء الأزمات',
          'استجابة فورية خلال دقائق محددة وفق بطاقات الوصف الوظيفي',
          'تدريب مستمر وإجراء تجارب إخلاء وهمية دورية'
        ]
      },
      {
        slide_number: 2,
        slide_title: 'دلالات الأكواد الرئيسية',
        bullet_points: [
          'الكود الأزرق: توقف القلب والتنفس (استدعاء طاقم CPR فوراً)',
          'الكود الأحمر: حريق أو دخان (تفعيل إجراءات RACE و PASS)',
          'الكود الأصفر: استقبال كوارث وحوادث طرق جماعية بالطوارئ'
        ]
      }
    ],
    images: [],
    created_at: new Date('2026-08-20T08:00:00Z').toISOString(),
    updated_at: new Date('2026-10-05T09:00:00Z').toISOString(),
    author_email: 'quality.mih@gmail.com'
  }
];

const DEFAULT_BUNDLES = [
  {
    id: 'bnd-1',
    code: 'BND-IPC-01',
    title: 'حزمة الوقاية من عدوى مجرى الدم المرتبطة بالقسطرة المركزية (CLABSI Bundle)',
    dept: 'العنايات المركزة والعمليات الجراحية',
    goal: 'منع حدوث عدوى الدم المصاحبة لتركيب ورعاية القسطرة الوريدية المركزية (Central Line)',
    items: [
      { text: 'الالتزام الصارم بنظافة الأيدي قبل التركيب أو التعامل مع القسطرة', checked: true },
      { text: 'استخدام الواقيات القصوى المعقمة (قبعة، قناع، عباءة معقمة، قفازات، وغطاء كامل)', checked: true },
      { text: 'تطهير الجلد بمحلول الكلورهيكسيدين 2% الكحولي وتركه حتى يجف تماماً', checked: true },
      { text: 'تجنب الوريد الفخذي (Femoral Vein) قدر الإمكان وتفضيل الوريد تحت الترقوة', checked: true },
      { text: 'المراجعة اليومية لمدى الحاجة للقسطرة وإزالتها فور انتهاء الغرض الطبي منها', checked: true }
    ]
  },
  {
    id: 'bnd-2',
    code: 'BND-IPC-02',
    title: 'حزمة الوقاية من الالتهاب الرئوي المرتبط بجهاز التنفس الصناعي (VAP Bundle)',
    dept: 'وحدات الرعاية المركزة (ICU)',
    goal: 'الحد من حدوث الالتهاب الرئوي للمرضى الموضوعين على أجهزة التنفس الصناعي الميكانيكي',
    items: [
      { text: 'رفع رأس السرير بزاوية 30 إلى 45 درجة (ما لم يكن هناك مانع طبي)', checked: true },
      { text: 'التقييم اليومي لإمكانية إيقاف المهدئات واختبار الجاهزية للفصل (Sedation Vacation)', checked: true },
      { text: 'العناية الفموية المنتظمة للمريض بمحلول مطهر معتمد كل 6-8 ساعات', checked: true },
      { text: 'الوقاية من قرحة المعدة الإجهادية (Peptic Ulcer Disease Prophylaxis)', checked: true },
      { text: 'الوقاية من جلطات الأوردة العميقة (DVT Prophylaxis)', checked: false }
    ]
  },
  {
    id: 'bnd-3',
    code: 'BND-IPC-03',
    title: 'حزمة الوقاية من عدوى المسالك البولية المرتبطة بالقسطرة (CAUTI Bundle)',
    dept: 'الأقسام الداخلية والعنايات المركزة والعمليات',
    goal: 'منع حدوث عدوى الجهاز البولي الناتجة عن تركيب القسطرة البولية',
    items: [
      { text: 'تركيب القسطرة البولية لدواعٍ طبية معتمدة فقط وتوثيق السبب في الملف الطبي', checked: true },
      { text: 'استخدام تقنية التعقيم الكامل (Aseptic Technique) ومعدات معقمة أثناء التركيب', checked: true },
      { text: 'الحفاظ على نظام تصريف مغلق ومعقم وعدم فصل القسطرة عن كيس الجمع', checked: true },
      { text: 'إبقاء كيس جمع البول تحت مستوى المثانة دائماً وعدم ملامسته للأرض', checked: true },
      { text: 'المراجعة اليومية للحاجة للقسطرة وإزالتها في أقرب وقت ممكن', checked: true }
    ]
  },
  {
    id: 'bnd-4',
    code: 'BND-IPC-04',
    title: 'حزمة الوقاية من عدوى موضع الجراحة (SSI Prevention Bundle)',
    dept: 'أقسام الجراحة والعمليات الجراحية',
    goal: 'خفض معدلات عدوى الجروح بعد العمليات الجراحية',
    items: [
      { text: 'إعطاء المضاد الحيوي الوقائي خلال 60 دقيقة قبل الشق الجراحي وإيقافه خلال 24 ساعة', checked: true },
      { text: 'إزالة الشعر عند الضرورة فقط باستخدام المقص الكهربائي (Clippers) ومنع استخدام الأمواس', checked: true },
      { text: 'الحفاظ على ضبط مستوى السكر بالدم (< 180 mg/dL) أثناء وبعد الجراحة', checked: true },
      { text: 'الحفاظ على درجة حرارة جسم المريض الطبيعية (Normothermia) أثناء العملية', checked: false }
    ]
  },
  {
    id: 'bnd-5',
    code: 'BND-CLN-05',
    title: 'حزمة الساعة الأولى للتعامل مع الإنتان الحاد (Sepsis 1-Hour Bundle)',
    dept: 'قسم الاستقبال والطوارئ والعنايات المركزة',
    goal: 'التدخل السريع والمنظم خلال الساعة الأولى لإنقاذ حياة مرضى تسمم الدم (Sepsis)',
    items: [
      { text: 'قياس مستوى اللاكتات بالدم (Lactate Level) وإعادة القياس إذا كان > 2 mmol/L', checked: true },
      { text: 'سحب مزارع الدم (Blood Cultures) قبل البدء في إعطاء المضادات الحيوية', checked: true },
      { text: 'إعطاء مضادات حيوية واسعة المجال وريدياً خلال الساعة الأولى', checked: true },
      { text: 'البدء الفوري بإعطاء محاليل بلورية (30 ml/kg) في حال هبوط الضغط أو اللاكتات ≥ 4', checked: true },
      { text: 'إعطاء قابضات الأوعية (Vasopressors) للحفاظ على متوسط الضغط الشرياني MAP ≥ 65 mmHg', checked: true }
    ]
  }
];

// ==========================================================================
// 4. حالة التطبيق العامة (Application State)
// ==========================================================================
let policiesState = [];
let bundlesState = [];
let currentTab = 'home';
let activeModalPolicy = null;

// حالة المصادقة والصلاحيات
let currentUser = null;
let isAuthorizedAdmin = false;

// كائنات Firebase
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let isFirebaseConnected = false;

// إعدادات العرض التقديمي (Presentation Mode State)
let activePresentationPolicy = null;
let currentSlideIndex = 0;

// حالة محرر الإدارة والرفع الذكي
let editingPolicyId = null;
let activeEditorSlides = [];
let activeEditorImages = [];
let parsedPdfDocument = null; // يحفظ مرجع ملف PDF المرفوع لمعالجة نطاق الصفحات

// ==========================================================================
// 5. إدارة التهيئة والإعدادات المحفوظة (Settings & Storage Management)
// ==========================================================================

function loadConfigOverrides() {
  try {
    const saved = localStorage.getItem('mih_system_settings_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.firebase) Object.assign(FIREBASE_CONFIG, parsed.firebase);
      if (parsed.adminEmails && Array.isArray(parsed.adminEmails) && parsed.adminEmails.length > 0) {
        ADMIN_EMAILS.length = 0;
        parsed.adminEmails.forEach(e => ADMIN_EMAILS.push(e));
      }
      if (parsed.geminiKey) GEMINI_CONFIG.apiKey = parsed.geminiKey;
      if (parsed.cloudinaryName) CLOUDINARY_CONFIG.cloudName = parsed.cloudinaryName;
      if (parsed.cloudinaryPreset) CLOUDINARY_CONFIG.uploadPreset = parsed.cloudinaryPreset;
    }
  } catch (e) {
    console.warn('Could not load settings overrides:', e);
  }
}

function saveConfigOverrides(settings) {
  try {
    localStorage.setItem('mih_system_settings_v2', JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save settings:', e);
  }
}

// ==========================================================================
// 6. تهيئة Firebase والمصادقة (Firebase Setup & Authentication)
// ==========================================================================

function initFirebase() {
  loadConfigOverrides();

  // التحقق من توفر مفتاح Firebase صالح
  const hasValidConfig = FIREBASE_CONFIG && 
                         FIREBASE_CONFIG.apiKey && 
                         FIREBASE_CONFIG.apiKey !== "AIzaSy..." && 
                         FIREBASE_CONFIG.projectId;

  if (hasValidConfig && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
      } else {
        firebaseApp = firebase.app();
      }
      firebaseAuth = firebase.auth();
      firestoreDb = firebase.firestore();
      isFirebaseConnected = true;

      // الاستماع لتغير حالة المصادقة
      firebaseAuth.onAuthStateChanged(handleAuthStateChanged);

      // الاستماع الحي لتحديثات السياسات من Firestore
      listenToFirestorePolicies();

      updateConnectionBadge(true);
      return;
    } catch (err) {
      console.warn('Firebase init error, falling back to local mode:', err);
    }
  }

  // الوضع المحلي البديل (Local Fallback Mode)
  isFirebaseConnected = false;
  updateConnectionBadge(false);
  loadLocalState();
}

function updateConnectionBadge(online) {
  const badge = document.getElementById('connection-status-badge');
  if (!badge) return;
  if (online) {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span>سحابي (Firestore متصل)</span>
    `;
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800";
  } else {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
      <span>محلي (Local / Demo)</span>
    `;
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 cursor-pointer hover:bg-amber-900";
    badge.onclick = () => openSettingsModal();
  }
}

// التحقق من صلاحيات الإدارة
function checkAdminPermission(email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(adm => adm.trim().toLowerCase() === cleanEmail);
}

// معالجة حالة تسجيل الدخول
function handleAuthStateChanged(user) {
  currentUser = user;
  if (user) {
    const isWhitelisted = checkAdminPermission(user.email);
    if (isWhitelisted) {
      isAuthorizedAdmin = true;
      showToast(`مرحباً بك: ${user.displayName || user.email} (مدير جودة معتمد)`);
    } else {
      isAuthorizedAdmin = false;
      showPermissionDeniedModal(user.email);
    }
  } else {
    isAuthorizedAdmin = false;
  }
  updateAuthUI();
  renderAll();
}

// تحديث عناصر الواجهة بناءً على حالة المصادقة
function updateAuthUI() {
  const loginBtn = document.getElementById('auth-login-btn');
  const userChip = document.getElementById('auth-user-chip');
  const adminNavTab = document.getElementById('nav-admin-tab');
  const adminBadges = document.querySelectorAll('.admin-only-control');

  if (currentUser && isAuthorizedAdmin) {
    // المدير مسجل دخوله ومصرح له
    if (loginBtn) loginBtn.classList.add('hidden');
    if (userChip) {
      userChip.classList.remove('hidden');
      document.getElementById('user-avatar').src = currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff';
      document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email;
    }
    if (adminNavTab) adminNavTab.classList.remove('hidden');
    adminBadges.forEach(el => el.classList.remove('hidden'));
  } else {
    // زائر عادي أو غير مسجل
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userChip) userChip.classList.add('hidden');
    if (adminNavTab) adminNavTab.classList.add('hidden');
    adminBadges.forEach(el => el.classList.add('hidden'));

    // إذا كان الزائر في تبويب الإدارة، نعيده للصفحة الرئيسية فوراً
    if (currentTab === 'admin') {
      switchTab('home');
    }
  }
}

// نافذة تنبيه الحساب غير المصرح له
function showPermissionDeniedModal(email) {
  const modal = document.getElementById('access-denied-modal');
  const emailSpan = document.getElementById('denied-user-email');
  if (emailSpan) emailSpan.textContent = email;
  if (modal) modal.classList.remove('hidden');
}

function closePermissionDeniedModal() {
  const modal = document.getElementById('access-denied-modal');
  if (modal) modal.classList.add('hidden');
}

// تسجيل الدخول بحساب Google
async function signInWithGoogle() {
  if (!isFirebaseConnected || !firebaseAuth) {
    // وضع المحاكاة في حال لم يدخل المستخدم مفاتيح Firebase بعد
    simulateLocalAdminLogin();
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await firebaseAuth.signInWithPopup(provider);
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    showToast('حدث خطأ أثناء تسجيل الدخول: ' + (error.message || error));
  }
}

// محاكاة وضع الإدارة محلياً (لتجربة كل الميزات مباشرة بدون إعداد مسبق)
function simulateLocalAdminLogin() {
  const promptEmail = prompt('أدخل إيميل الإدارة لتسجيل الدخول التجريبي:\n(سيتم اختباره ضد القائمة البيضاء)', ADMIN_EMAILS[0] || 'quality.mih@gmail.com');
  if (!promptEmail) return;
  const isWhitelisted = checkAdminPermission(promptEmail);
  currentUser = {
    displayName: 'مدير الجودة (حساب تجريبي)',
    email: promptEmail,
    photoURL: 'https://ui-avatars.com/api/?name=Admin&background=991b1b&color=fff'
  };
  if (isWhitelisted) {
    isAuthorizedAdmin = true;
    showToast(`تم تسجيل الدخول الإداري التجريبي: ${promptEmail}`);
  } else {
    isAuthorizedAdmin = false;
    showPermissionDeniedModal(promptEmail);
  }
  updateAuthUI();
  renderAll();
}

// تسجيل الخروج
async function signOutUser() {
  if (isFirebaseConnected && firebaseAuth) {
    try {
      await firebaseAuth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  }
  currentUser = null;
  isAuthorizedAdmin = false;
  updateAuthUI();
  renderAll();
  showToast('تم تسجيل الخروج بنجاح');
}

// ==========================================================================
// 7. مزامنة البيانات السحابية (Firestore Sync & Local Storage)
// ==========================================================================

function listenToFirestorePolicies() {
  if (!firestoreDb) return;
  try {
    firestoreDb.collection('policies')
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            list.push({
              id: doc.id,
              ...data,
              // تحويل التواريخ إن كانت Firestore Timestamp
              updated_at: data.updated_at && data.updated_at.toDate ? data.updated_at.toDate().toISOString() : data.updated_at
            });
          });
          policiesState = list;
          renderAll();
        } else {
          // إذا كانت المجموعة فارغة في Firestore، نبدأ بالبيانات الافتراضية
          loadLocalState();
        }
      }, (error) => {
        console.warn('Firestore real-time listener error, reading local state:', error);
        loadLocalState();
      });
  } catch (err) {
    console.warn('Firestore listener setup failed:', err);
    loadLocalState();
  }
}

function loadLocalState() {
  try {
    const savedPol = localStorage.getItem('mih_policies_cache_v2');
    const savedBnd = localStorage.getItem('mih_bundles_cache_v2');
    policiesState = savedPol ? JSON.parse(savedPol) : JSON.parse(JSON.stringify(DEFAULT_POLICIES));
    bundlesState = savedBnd ? JSON.parse(savedBnd) : JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
  } catch (e) {
    policiesState = JSON.parse(JSON.stringify(DEFAULT_POLICIES));
    bundlesState = JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
  }
  renderAll();
}

function saveLocalState() {
  try {
    localStorage.setItem('mih_policies_cache_v2', JSON.stringify(policiesState));
    localStorage.setItem('mih_bundles_cache_v2', JSON.stringify(bundlesState));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

// حفظ أو تحديث سياسة في Firestore (أو محلياً في وضع عدم الاتصال)
async function persistPolicy(policyData) {
  policyData.updated_at = new Date().toISOString();
  policyData.author_email = currentUser ? currentUser.email : 'quality.mih@gmail.com';

  if (isFirebaseConnected && firestoreDb && isAuthorizedAdmin) {
    try {
      const docId = policyData.id || ('pol-' + Date.now());
      policyData.id = docId;
      await firestoreDb.collection('policies').doc(docId).set(policyData, { merge: true });
      showToast('تم الحفظ والمزامنة السحابية في Firestore بنجاح');
      return;
    } catch (err) {
      console.error('Error saving to Firestore:', err);
      showToast('تعذر الحفظ في السحابة (' + err.message + ')، تم الحفظ محلياً.');
    }
  }

  // الحفظ المحلي
  const existingIdx = policiesState.findIndex(p => p.id === policyData.id);
  if (existingIdx > -1) {
    policiesState[existingIdx] = policyData;
  } else {
    if (!policyData.id) policyData.id = 'pol-' + Date.now();
    policiesState.unshift(policyData);
  }
  saveLocalState();
  renderAll();
  showToast('تم حفظ السياسة بنجاح');
}

// حذف سياسة
async function removePolicy(policyId) {
  if (!isAuthorizedAdmin) {
    showToast('غير مصرح لك بحذف السياسات');
    return;
  }
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذه السياسة نهائياً؟')) return;

  if (isFirebaseConnected && firestoreDb) {
    try {
      await firestoreDb.collection('policies').doc(policyId).delete();
      showToast('تم حذف السياسة من قاعدة البيانات');
      return;
    } catch (err) {
      console.error('Error deleting from Firestore:', err);
    }
  }

  policiesState = policiesState.filter(p => p.id !== policyId);
  saveLocalState();
  renderAll();
  showToast('تم حذف السياسة بنجاح');
}

// ==========================================================================
// 8. محرك الرفع والتحويل الذكي (Smart Client-Side Parser & AI Engine)
// ==========================================================================

// معالجة ملف Word (.docx) عبر mammoth.js في المتصفح
async function handleWordFileUpload(file) {
  if (!file) return;
  showAiLoading(true, 'جاري قراءة واستخراج نصوص وجداول ملف Word...');
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (typeof mammoth === 'undefined') {
      throw new Error('مكتبة mammoth.js غير متوفرة حالياً.');
    }

    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const extractedHtml = result.value;
    
    // استخراج العنوان الأولي من اسم الملف
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    
    // توليد نص خام للبحث
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = extractedHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // توليد شرائح أولية ذكية من عناوين الملف
    const initialSlides = generateSlidesFromHtml(extractedHtml, cleanTitle);

    // ملء حقول المحرر
    document.getElementById('editor-policy-title').value = cleanTitle;
    document.getElementById('editor-policy-code').value = 'MIH-' + (cleanTitle.substring(0, 3).toUpperCase() || 'GEN') + '-001';
    document.getElementById('editor-policy-category').value = 'QPI';
    document.getElementById('editor-policy-dept').value = 'جميع الأقسام المعنية';
    document.getElementById('editor-policy-version').value = 'الإصدار 1.0';
    document.getElementById('editor-policy-date').value = getArabicCurrentMonthYear();
    document.getElementById('editor-policy-purpose').value = plainText.substring(0, 250) + '...';
    document.getElementById('editor-policy-content-html').value = extractedHtml;
    
    activeEditorSlides = initialSlides;
    renderEditorSlidesList();
    updateLivePreview();

    showAiLoading(false);
    showToast('تم استخراج محتوى ملف Word وبناء الشرائح التلقائية بنجاح!');
    switchEditorTab('preview-doc');
  } catch (err) {
    showAiLoading(false);
    console.error('Word Parsing Error:', err);
    alert('حدث خطأ أثناء قراءة ملف Word: ' + err.message);
  }
}

// استخراج شرائح أولية من محتوى HTML
function generateSlidesFromHtml(html, title) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const slides = [];

  // شريحة العنوان
  slides.push({
    slide_number: 1,
    slide_title: title || 'سياسة الجودة المعتمدة',
    bullet_points: [
      'سياسة رسمية معتمدة بمستشفى المنصورة الدولي',
      'تطبيق المعايير القياسية لسلامة المرضى والجودة الصحية',
      'إلزامية لجميع الكوادر الطبية والتمريضية والإدارية'
    ]
  });

  // استخراج العناوين الرئيسية
  const headings = div.querySelectorAll('h1, h2, h3, h4');
  let slideNum = 2;
  headings.forEach(h => {
    const text = h.textContent.trim();
    if (!text || text.length < 3) return;

    const bullets = [];
    let nextElem = h.nextElementSibling;
    while (nextElem && !['H1', 'H2', 'H3', 'H4'].includes(nextElem.tagName) && bullets.length < 4) {
      if (nextElem.tagName === 'P') {
        const pText = nextElem.textContent.trim();
        if (pText) bullets.push(pText.length > 90 ? pText.substring(0, 90) + '...' : pText);
      } else if (nextElem.tagName === 'UL' || nextElem.tagName === 'OL') {
        nextElem.querySelectorAll('li').forEach(li => {
          if (bullets.length < 4 && li.textContent.trim()) {
            bullets.push(li.textContent.trim());
          }
        });
      }
      nextElem = nextElem.nextElementSibling;
    }

    if (bullets.length === 0) {
      bullets.push('الالتزام التام بمتطلبات هذا البند الإجرائي.');
      bullets.push('توثيق الخطوات في السجلات الطبية المعتمدة.');
    }

    slides.push({
      slide_number: slideNum++,
      slide_title: text,
      bullet_points: bullets
    });
  });

  return slides.length > 1 ? slides : [
    ...slides,
    {
      slide_number: 2,
      slide_title: 'بنود وإجراءات التطبيق',
      bullet_points: [
        'تطبيق الإجراءات الواردة في الدليل التشغيلي المعتمد',
        'متابعة مؤشرات الأداء الخاصة بالقسم بانتظام',
        'الإبلاغ عن أي صعوبات تواجه التطبيق لإدارة الجودة'
      ]
    }
  ];
}

// فحص ومعاينة ملف PDF قبل التحليل (يدعم الملفات الضخمة مثل الـ 320 صفحة)
async function inspectPdfFile(file) {
  if (!file) return;
  showAiLoading(true, 'جاري فحص وتجهيز صفحات ملف الـ PDF...');
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (typeof PDFLib === 'undefined') {
      throw new Error('مكتبة PDF-Lib غير متوفرة في المتصفح.');
    }

    parsedPdfDocument = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = parsedPdfDocument.getPageCount();

    // إظهار بطاقة التحكم في نطاق الصفحات
    document.getElementById('pdf-page-selector-box').classList.remove('hidden');
    document.getElementById('pdf-file-name').textContent = file.name;
    document.getElementById('pdf-total-pages').textContent = totalPages;
    document.getElementById('pdf-page-start').value = 1;
    document.getElementById('pdf-page-end').value = Math.min(5, totalPages);
    document.getElementById('pdf-page-end').max = totalPages;
    document.getElementById('pdf-page-start').max = totalPages;

    showAiLoading(false);
    showToast(`تم تحميل ملف PDF (${totalPages} صفحة). حدد نطاق الصفحات المراد استخراجها.`);
  } catch (err) {
    showAiLoading(false);
    console.error('PDF inspect error:', err);
    alert('حدث خطأ أثناء فحص ملف PDF: ' + err.message);
  }
}

// استخراج الصفحات المحددة من PDF وتحويلها إلى Base64 وإرسالها إلى Gemini 2.5 Flash
async function processPdfWithGemini() {
  if (!parsedPdfDocument) {
    alert('يرجى اختيار ملف PDF أولاً.');
    return;
  }

  const startPage = parseInt(document.getElementById('pdf-page-start').value, 10);
  const endPage = parseInt(document.getElementById('pdf-page-end').value, 10);
  const totalPages = parsedPdfDocument.getPageCount();

  if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage || endPage > totalPages) {
    alert(`يرجى تحديد نطاق صفحات صحيح بين 1 و ${totalPages}.`);
    return;
  }

  // التحقق من وجود مفتاح Gemini API
  let apiKey = GEMINI_CONFIG.apiKey;
  if (!apiKey) {
    apiKey = prompt('أدخل مفتاح Gemini API الخاص بك للمتابعة:\n(يمكنك الحصول عليه مجاناً من Google AI Studio وسيتم حفظه محلياً في متصفحك)', '');
    if (!apiKey) {
      alert('مفتاح Gemini API مطلوب لإجراء التحليل والتحويل الذكي.');
      return;
    }
    GEMINI_CONFIG.apiKey = apiKey.trim();
    saveConfigOverrides({ geminiKey: apiKey.trim() });
  }

  showAiLoading(true, `جاري استخراج الصفحات من (${startPage}) إلى (${endPage}) وإرسالها لنموذج Gemini 2.5 Flash...`);

  try {
    // إنشاء ملف PDF فرعي خفيف يحتوي فقط على الصفحات المطلوبة
    const subDoc = await PDFLib.PDFDocument.create();
    const pageIndices = [];
    for (let i = startPage - 1; i < endPage; i++) {
      pageIndices.push(i);
    }
    const copiedPages = await subDoc.copyPages(parsedPdfDocument, pageIndices);
    copiedPages.forEach(p => subDoc.addPage(p));
    
    // تصدير كـ Base64
    const subPdfBytes = await subDoc.save();
    let binary = '';
    const bytes = new Uint8Array(subPdfBytes);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = window.btoa(binary);

    // استدعاء Gemini API
    const aiResponse = await callGeminiPdfParser(pdfBase64, apiKey);
    
    // تفريغ البيانات الناتجة في واجهة المحرر
    applyAiResultToEditor(aiResponse);

    showAiLoading(false);
    showToast('تم استخراج السياسة وبناء الشرائح بواسطة الذكاء الاصطناعي بنجاح!');
    switchEditorTab('preview-doc');
  } catch (err) {
    showAiLoading(false);
    console.error('Gemini Processing Error:', err);
    alert('حدث خطأ أثناء معالجة الذكاء الاصطناعي: ' + (err.message || err));
  }
}

// استدعاء مباشر لـ Gemini 2.5 Flash API
async function callGeminiPdfParser(pdfBase64, apiKey) {
  const promptText = `
أنت خبير معتمد في إدارة الجودة وسلامة المرضى بالمستشفيات واعتماد المنشآت الصحية (GAHAR / CBAHI / JCI).
قم بفحص هذه الصفحات واستخرج محتوى السياسة بدقة 100% باللغة العربية الفصحى السليمة بدون أي أخطاء في انعكاس الحروف أو اتجاه الكلمات.
يجب إرجاع النتيجة بتنسيق JSON حصراً بدون أي كتل نصية إضافية أو علامات markdown (no backticks) بالهيكل التالي:
{
  "title": "عنوان السياسة الواضح والرسمي",
  "code": "كود السياسة مثل MIH-IPC-001 أو IPC-001",
  "category": "رمز القسم من هذه القائمة فقط: (NSR, IPC, MMS, QPI, FMS, ER)",
  "dept": "الأقسام المعنية بالمستشفى",
  "version": "رقم الإصدار وتاريخه",
  "purpose": "الهدف الرئيسي من السياسة في فقرة موجزة",
  "content_html": "النص الكامل للسياسة منسقاً بـ HTML احترافي يتضمن العناوين <h3>، الفقرات <p>، القوائم المنقطة والمرقمة <ul>/<ol><li>، والجداول <table> مع المسؤوليات والإجراءات",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "عنوان الشريحة",
      "bullet_points": ["نقطة ملخصة 1", "نقطة ملخصة 2", "نقطة ملخصة 3"]
    }
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: "application/pdf",
              data: pdfBase64
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: فشل الاتصال بنموذج Gemini`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('لم يقم نموذج الذكاء الاصطناعي بإرجاع أي محتوى.');
  }

  // تنظيف أي زوائد
  let cleanJson = textOutput.trim();
  if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
  if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
  if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

  return JSON.parse(cleanJson.trim());
}

// تطبيق النتائج المستخرجة على حقول المحرر والمعاينة
function applyAiResultToEditor(res) {
  if (!res) return;
  document.getElementById('editor-policy-title').value = res.title || '';
  document.getElementById('editor-policy-code').value = res.code || 'MIH-QPI-001';
  document.getElementById('editor-policy-category').value = res.category || 'QPI';
  document.getElementById('editor-policy-dept').value = res.dept || 'جميع الأقسام المعنية';
  document.getElementById('editor-policy-version').value = res.version || 'الإصدار 1.0';
  document.getElementById('editor-policy-date').value = getArabicCurrentMonthYear();
  document.getElementById('editor-policy-purpose').value = res.purpose || '';
  document.getElementById('editor-policy-content-html').value = res.content_html || '';

  if (Array.isArray(res.slides) && res.slides.length > 0) {
    activeEditorSlides = res.slides.map((s, idx) => ({
      slide_number: idx + 1,
      slide_title: s.slide_title || `شريحة ${idx + 1}`,
      bullet_points: Array.isArray(s.bullet_points) ? s.bullet_points : [s.bullet_points || '']
    }));
  } else {
    activeEditorSlides = generateSlidesFromHtml(res.content_html || '', res.title || '');
  }

  renderEditorSlidesList();
  updateLivePreview();
}

function showAiLoading(isLoading, message = '') {
  const loader = document.getElementById('ai-loading-overlay');
  const msgEl = document.getElementById('ai-loading-message');
  if (!loader) return;
  if (isLoading) {
    if (msgEl) msgEl.textContent = message;
    loader.classList.remove('hidden');
  } else {
    loader.classList.add('hidden');
  }
}

// ==========================================================================
// 9. نظام رفع الصور الذكي عبر Cloudinary (Smart Cloudinary Uploader)
// ==========================================================================

async function handleCloudinaryUpload(file) {
  if (!file) return;

  // التحقق من إعدادات Cloudinary
  let cloudName = CLOUDINARY_CONFIG.cloudName;
  let preset = CLOUDINARY_CONFIG.uploadPreset;

  if (!cloudName || !preset) {
    const enteredName = prompt('أدخل اسم حسابك في Cloudinary (Cloud Name):\n(أو يمكنك ضبطه في نافذة الإعدادات)', cloudName || '');
    const enteredPreset = prompt('أدخل اسم الـ Upload Preset (Unsigned):\n(مثال: mih_policies_preset)', preset || '');
    if (!enteredName || !enteredPreset) {
      alert('إعدادات Cloudinary مطلوبة لرفع الصور والمخططات.');
      return;
    }
    CLOUDINARY_CONFIG.cloudName = enteredName.trim();
    CLOUDINARY_CONFIG.uploadPreset = enteredPreset.trim();
    saveConfigOverrides({
      cloudinaryName: CLOUDINARY_CONFIG.cloudName,
      cloudinaryPreset: CLOUDINARY_CONFIG.uploadPreset
    });
    cloudName = CLOUDINARY_CONFIG.cloudName;
    preset = CLOUDINARY_CONFIG.uploadPreset;
  }

  showAiLoading(true, 'جاري رفع وتحسين الصورة عبر Cloudinary API...');

  try {
    let fileToUpload = file;

    // إذا كانت الصورة صغيرة جداً، نقوم بضغطها عبر Canvas إلى WebP
    if (file.size < 50 * 1024 && file.type.startsWith('image/')) {
      fileToUpload = await compressImageToWebP(file);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', preset);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error?.message || `HTTP ${res.status}: فشل الرفع إلى Cloudinary`);
    }

    const data = await res.json();
    const secureUrl = data.secure_url;

    // إضافة الرابط لقائمة صور السياسة
    if (!activeEditorImages.includes(secureUrl)) {
      activeEditorImages.push(secureUrl);
    }

    showAiLoading(false);
    showToast('تم رفع الصورة بنجاح إلى Cloudinary!');

    // عرض خيارات الإدراج للمدير
    promptImageInsertionOptions(secureUrl);
  } catch (err) {
    showAiLoading(false);
    console.error('Cloudinary Upload Error:', err);
    alert('حدث خطأ أثناء رفع الصورة إلى Cloudinary: ' + err.message);
  }
}

// ضغط الصور الصغيرة إلى صيغة WebP عبر Canvas
function compressImageToWebP(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
          } else {
            resolve(file);
          }
        }, 'image/webp', 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// خيارات إدراج رابط الصورة
function promptImageInsertionOptions(imageUrl) {
  const insertInDoc = confirm('تم رفع الصورة بنجاح!\n\nهل ترغب في إدراج الصورة الآن داخل نص الوثيقة (HTML) كمخطط توضيحي؟\n(اختر إلغاء إذا كنت تريد ربطها بشريحة عرض)');
  
  if (insertInDoc) {
    const figHtml = `\n<figure class="my-5 text-center">\n  <img src="${imageUrl}" alt="مخطط توضيحي للسياسة" class="rounded-xl shadow-md mx-auto max-h-96 border border-slate-200" />\n  <figcaption class="text-xs text-slate-500 font-bold mt-2">شكل توضيحي: مسار التطبيق والتدفق الإجرائي</figcaption>\n</figure>\n`;
    const contentArea = document.getElementById('editor-policy-content-html');
    contentArea.value += figHtml;
    updateLivePreview();
    showToast('تم إدراج المخطط في نص الوثيقة');
  } else {
    // إتاحة ربطها بشريحة
    if (activeEditorSlides.length > 0) {
      const slideNum = prompt(`أدخل رقم الشريحة التي تريد إرفاق الصورة بها (من 1 إلى ${activeEditorSlides.length}):`, '1');
      const idx = parseInt(slideNum, 10) - 1;
      if (!isNaN(idx) && activeEditorSlides[idx]) {
        activeEditorSlides[idx].image_url = imageUrl;
        renderEditorSlidesList();
        updateLivePreview();
        showToast(`تم إرفاق الصورة بالشريحة رقم ${slideNum}`);
      }
    }
  }
}

// ==========================================================================
// 10. محرر الشرائح التفاعلي والمعاينة المباشرة (Slides Editor & Live Preview)
// ==========================================================================

function renderEditorSlidesList() {
  const container = document.getElementById('editor-slides-container');
  if (!container) return;
  container.innerHTML = '';

  if (activeEditorSlides.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        لا توجد شرائح حالياً. اضغط على "+ إضافة شريحة جديدة" أو قم برفع ملف لتوليدها تلقائياً.
      </div>
    `;
    return;
  }

  activeEditorSlides.forEach((slide, idx) => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm hover:border-teal-500 transition';
    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
          شريحة ${idx + 1}
        </span>
        <div class="flex items-center gap-1">
          <button type="button" class="remove-slide-btn text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50" title="حذف الشريحة">
            🗑️ حذف
          </button>
        </div>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">عنوان الشريحة</label>
        <input
          type="text"
          class="slide-title-input w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none"
          value="${slide.slide_title || ''}"
          placeholder="عنوان الشريحة..."
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">نقاط الشريحة (نقطة في كل سطر)</label>
        <textarea
          rows="3"
          class="slide-bullets-input w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-600 outline-none custom-scroll"
          placeholder="أدخل كل نقطة في سطر منفصل..."
        >${(slide.bullet_points || []).join('\n')}</textarea>
      </div>
      ${slide.image_url ? `
        <div class="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <img src="${slide.image_url}" class="w-10 h-10 object-cover rounded" />
          <span class="truncate flex-1">${slide.image_url}</span>
          <button type="button" class="remove-slide-img text-red-600 font-bold hover:underline">إزالة</button>
        </div>
      ` : ''}
    `;

    // ربط الأحداث
    card.querySelector('.slide-title-input').addEventListener('input', (e) => {
      slide.slide_title = e.target.value;
      updateLivePreview();
    });

    card.querySelector('.slide-bullets-input').addEventListener('input', (e) => {
      slide.bullet_points = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      updateLivePreview();
    });

    card.querySelector('.remove-slide-btn').addEventListener('click', () => {
      activeEditorSlides.splice(idx, 1);
      renderEditorSlidesList();
      updateLivePreview();
    });

    const removeImgBtn = card.querySelector('.remove-slide-img');
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => {
        delete slide.image_url;
        renderEditorSlidesList();
        updateLivePreview();
      });
    }

    container.appendChild(card);
  });
}

function addNewSlideToEditor() {
  activeEditorSlides.push({
    slide_number: activeEditorSlides.length + 1,
    slide_title: `نقطة هامة ${activeEditorSlides.length + 1}`,
    bullet_points: ['أدخل تفاصيل الإجراء هنا...', 'نقطة إضافية للتدريب والمتابعة.']
  });
  renderEditorSlidesList();
  updateLivePreview();
}

function updateLivePreview() {
  const title = document.getElementById('editor-policy-title').value.trim() || 'عنوان السياسة';
  const code = document.getElementById('editor-policy-code').value.trim() || 'MIH-CODE-001';
  const category = document.getElementById('editor-policy-category').value;
  const dept = document.getElementById('editor-policy-dept').value.trim() || 'القسم المعني';
  const version = document.getElementById('editor-policy-version').value.trim() || 'الإصدار 1.0';
  const date = document.getElementById('editor-policy-date').value.trim() || getArabicCurrentMonthYear();
  const purpose = document.getElementById('editor-policy-purpose').value.trim() || 'هدف السياسة...';
  const contentHtml = document.getElementById('editor-policy-content-html').value.trim();

  // 1. معاينة الوثيقة الرسمية
  const docContainer = document.getElementById('preview-doc-container');
  if (docContainer) {
    const meta = CATEGORY_META[category] || CATEGORY_META.QPI;
    docContainer.innerHTML = `
      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <!-- ترويسة المستشفى المعتمدة -->
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
          <div class="flex items-center gap-3">
            <img src="assets/logo.jpg" alt="شعار المستشفى" class="w-14 h-14 object-contain rounded" onerror="this.src='https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff'" />
            <div>
              <h2 class="text-base sm:text-lg font-extrabold text-slate-900">مستشفى المنصورة الدولي</h2>
              <p class="text-xs text-slate-600 font-semibold">أمانة المراكز الطبية المتخصصة (SMC) • إدارة الجودة وسلامة المرضى</p>
            </div>
          </div>
          <div class="text-left font-mono text-xs text-slate-600 space-y-1">
            <div><strong class="text-slate-900">كود الوثيقة:</strong> ${code}</div>
            <div><strong class="text-slate-900">تاريخ الاعتماد:</strong> ${date}</div>
            <div><strong class="text-slate-900">رقم الإصدار:</strong> ${version}</div>
          </div>
        </div>

        <!-- عنوان السياسة والقسم -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold px-3 py-1 rounded-full border ${meta.badge}">${code} • ${meta.name}</span>
            <span class="text-xs text-slate-500 font-bold">القسم المستهدف: ${dept}</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900">${title}</h1>
        </div>

        <!-- صندوق الهدف العام -->
        <div class="p-4 rounded-xl bg-teal-50/70 border-r-4 border-teal-700 text-teal-950 space-y-1">
          <h4 class="text-xs font-extrabold text-teal-900 uppercase">الهدف العام من السياسة (Policy Purpose):</h4>
          <p class="text-sm font-semibold leading-relaxed">${purpose}</p>
        </div>

        <!-- محتوى الوثيقة الكامل منسقاً بـ HTML -->
        <div class="policy-content-html border-t border-slate-100 pt-4">
          ${contentHtml || '<p class="text-slate-400 italic">لا يوجد محتوى HTML مكتوب حتى الآن...</p>'}
        </div>
      </div>
    `;
  }

  // 2. معاينة عارض الشرائح التفاعلي
  const slidesContainer = document.getElementById('preview-slides-container');
  if (slidesContainer) {
    if (activeEditorSlides.length === 0) {
      slidesContainer.innerHTML = `
        <div class="p-10 text-center text-slate-400 bg-slate-900 rounded-2xl">
          لا توجد شرائح للعرض. قم بإضافة شرائح لمشاهدة المحاكاة.
        </div>
      `;
    } else {
      const slidesCards = activeEditorSlides.map((s, idx) => `
        <div class="p-5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-lg">
          <div class="flex items-center justify-between text-xs text-teal-400 font-bold border-b border-slate-800 pb-2">
            <span>شريحة ${idx + 1} من ${activeEditorSlides.length}</span>
            <span class="text-slate-400">${code}</span>
          </div>
          <h3 class="text-lg font-extrabold text-white">${s.slide_title}</h3>
          <ul class="space-y-2 text-xs sm:text-sm text-slate-200">
            ${(s.bullet_points || []).map(b => `<li class="flex items-start gap-2"><span class="text-teal-400 mt-0.5">●</span><span>${b}</span></li>`).join('')}
          </ul>
          ${s.image_url ? `<img src="${s.image_url}" class="rounded-lg max-h-48 w-full object-cover border border-slate-700 mt-2" />` : ''}
        </div>
      `).join('');

      slidesContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${slidesCards}
        </div>
      `;
    }
  }
}

function switchEditorTab(tab) {
  const tabs = ['edit-fields', 'preview-doc', 'preview-slides'];
  tabs.forEach(t => {
    const el = document.getElementById('tab-content-' + t);
    const btn = document.getElementById('btn-tab-' + t);
    if (el) {
      if (t === tab) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
    if (btn) {
      if (t === tab) {
        btn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-700 text-white shadow-sm';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100';
      }
    }
  });
}

// حفظ النموذج عند ضغط المدير على زر الحفظ النهائي
async function handlePolicyFormSubmit(e) {
  e.preventDefault();
  if (!isAuthorizedAdmin) {
    showToast('غير مصرح لك بحفظ أو تعديل السياسات');
    return;
  }

  const title = document.getElementById('editor-policy-title').value.trim();
  const code = document.getElementById('editor-policy-code').value.trim();
  const category = document.getElementById('editor-policy-category').value;
  const dept = document.getElementById('editor-policy-dept').value.trim();
  const version = document.getElementById('editor-policy-version').value.trim() || 'الإصدار 1.0';
  const date = document.getElementById('editor-policy-date').value.trim() || getArabicCurrentMonthYear();
  const purpose = document.getElementById('editor-policy-purpose').value.trim();
  const contentHtml = document.getElementById('editor-policy-content-html').value.trim();

  if (!title || !code || !purpose || !contentHtml) {
    alert('يرجى ملء كافة الحقول الإلزامية: العنوان، الكود، الهدف، ومحتوى الوثيقة.');
    return;
  }

  // استخراج النص الخام للبحث السريع
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = contentHtml;
  const plainText = (title + ' ' + code + ' ' + dept + ' ' + purpose + ' ' + (tempDiv.textContent || tempDiv.innerText || '')).replace(/\s+/g, ' ').trim();

  // التأكد من وجود شرائح صالحة
  let slides = activeEditorSlides;
  if (!slides || slides.length === 0) {
    slides = generateSlidesFromHtml(contentHtml, title);
  }

  const policyObject = {
    id: editingPolicyId || ('pol-' + Date.now()),
    title,
    code,
    category,
    dept,
    version,
    date,
    purpose,
    content_html: contentHtml,
    plain_text: plainText,
    slides: slides,
    images: activeEditorImages,
    updated_at: new Date().toISOString()
  };

  await persistPolicy(policyObject);
  resetPolicyEditor();
  switchTab('policies');
}

function startEditPolicy(policyId) {
  const p = policiesState.find(item => item.id === policyId);
  if (!p) return;
  if (!isAuthorizedAdmin) {
    showToast('تعديل السياسات مخصص للمديرين المصرح لهم فقط');
    return;
  }

  closeDocumentModal();
  editingPolicyId = p.id;
  document.getElementById('editor-policy-title').value = p.title || '';
  document.getElementById('editor-policy-code').value = p.code || '';
  document.getElementById('editor-policy-category').value = p.category || 'QPI';
  document.getElementById('editor-policy-dept').value = p.dept || '';
  document.getElementById('editor-policy-version').value = p.version || '';
  document.getElementById('editor-policy-date').value = p.date || '';
  document.getElementById('editor-policy-purpose').value = p.purpose || '';
  document.getElementById('editor-policy-content-html').value = p.content_html || '';

  activeEditorSlides = Array.isArray(p.slides) ? JSON.parse(JSON.stringify(p.slides)) : [];
  activeEditorImages = Array.isArray(p.images) ? [...p.images] : [];

  renderEditorSlidesList();
  updateLivePreview();
  switchEditorTab('edit-fields');
  switchTab('admin');
}

function resetPolicyEditor() {
  editingPolicyId = null;
  activeEditorSlides = [];
  activeEditorImages = [];
  parsedPdfDocument = null;

  document.getElementById('policy-master-form').reset();
  document.getElementById('pdf-page-selector-box').classList.add('hidden');
  renderEditorSlidesList();
  updateLivePreview();
  switchEditorTab('edit-fields');
}

// ==========================================================================
// 11. وضعي العرض: وضع الوثيقة (Document Mode) ووضع العرض التقديمي (Presentation)
// ==========================================================================

// فتح وضع الوثيقة (Document Mode)
function openDocumentMode(policyId) {
  const p = policiesState.find(item => item.id === policyId);
  if (!p) return;
  activeModalPolicy = p;

  const modal = document.getElementById('policy-document-modal');
  const meta = CATEGORY_META[p.category] || CATEGORY_META.QPI;

  document.getElementById('doc-modal-badge').textContent = `${p.code} • ${meta.name}`;
  document.getElementById('doc-modal-badge').className = `text-xs font-extrabold px-3 py-1 rounded-full border ${meta.badge}`;
  document.getElementById('doc-modal-title').textContent = p.title;
  document.getElementById('doc-modal-code').textContent = p.code;
  document.getElementById('doc-modal-dept').textContent = p.dept;
  document.getElementById('doc-modal-version').textContent = p.version;
  document.getElementById('doc-modal-date').textContent = p.date;
  document.getElementById('doc-modal-purpose').textContent = p.purpose;
  document.getElementById('doc-modal-content').innerHTML = p.content_html || '<p class="text-slate-500">لا يوجد نص متاح.</p>';

  // زر التعديل الإداري يظهر فقط للمدير
  const editBtn = document.getElementById('doc-modal-edit-btn');
  if (editBtn) {
    if (isAuthorizedAdmin) {
      editBtn.classList.remove('hidden');
      editBtn.onclick = () => startEditPolicy(p.id);
    } else {
      editBtn.classList.add('hidden');
    }
  }

  // ربط زر تشغيل العرض التقديمي
  const launchPresBtn = document.getElementById('doc-modal-launch-presentation-btn');
  if (launchPresBtn) {
    launchPresBtn.onclick = () => {
      closeDocumentModal();
      openPresentationMode(p.id);
    };
  }

  modal.classList.remove('hidden');
}

function closeDocumentModal() {
  const modal = document.getElementById('policy-document-modal');
  if (modal) modal.classList.add('hidden');
  activeModalPolicy = null;
}

// تشغيل وضع العرض التقديمي (Presentation Mode)
function openPresentationMode(policyId) {
  const p = policiesState.find(item => item.id === policyId);
  if (!p || !Array.isArray(p.slides) || p.slides.length === 0) {
    alert('هذه السياسة لا تحتوي على شرائح عرض تقديمي بعد.');
    return;
  }

  activePresentationPolicy = p;
  currentSlideIndex = 0;

  const modal = document.getElementById('presentation-modal');
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  renderPresentationSlide();
}

function closePresentationMode() {
  const modal = document.getElementById('presentation-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  activePresentationPolicy = null;

  // الخروج من وضع ملء الشاشة إذا كان مفعلاً
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function renderPresentationSlide() {
  if (!activePresentationPolicy || !activePresentationPolicy.slides) return;
  const slides = activePresentationPolicy.slides;
  const slide = slides[currentSlideIndex];
  if (!slide) return;

  // شريط التقدم والعداد
  const progressPct = Math.round(((currentSlideIndex + 1) / slides.length) * 100);
  document.getElementById('pres-progress-bar').style.width = `${progressPct}%`;
  document.getElementById('pres-slide-counter').textContent = `شريحة ${currentSlideIndex + 1} من ${slides.length}`;
  document.getElementById('pres-policy-code').textContent = activePresentationPolicy.code;
  document.getElementById('pres-policy-title-mini').textContent = activePresentationPolicy.title;

  // المحتوى الرئيسي للشريحة
  const slideContainer = document.getElementById('pres-slide-content');
  slideContainer.className = 'w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center py-6 px-4 slide-active';

  const bulletsHtml = (slide.bullet_points || []).map((bullet, i) => `
    <div class="slide-bullet flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-100 shadow-md">
      <span class="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold text-sm">
        ${i + 1}
      </span>
      <p class="text-base sm:text-xl font-bold leading-relaxed">${bullet}</p>
    </div>
  `).join('');

  slideContainer.innerHTML = `
    <div class="space-y-6">
      <div class="space-y-2">
        <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60 inline-block">
          ${activePresentationPolicy.code} • قسم ${activePresentationPolicy.dept}
        </span>
        <h2 class="text-2xl sm:text-4xl font-black text-white leading-tight">
          ${slide.slide_title}
        </h2>
      </div>

      <div class="grid grid-cols-1 ${slide.image_url ? 'lg:grid-cols-12' : ''} gap-6 items-center">
        <div class="${slide.image_url ? 'lg:col-span-7' : 'w-full'} space-y-3">
          ${bulletsHtml}
        </div>
        ${slide.image_url ? `
          <div class="lg:col-span-5 flex justify-center">
            <img src="${slide.image_url}" class="rounded-2xl max-h-80 w-full object-cover border border-slate-800 shadow-2xl" alt="مخطط الشريحة" />
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // تحديث حالة أزرار التنقل
  document.getElementById('pres-prev-btn').disabled = currentSlideIndex === 0;
  document.getElementById('pres-next-btn').disabled = currentSlideIndex === slides.length - 1;
}

function nextSlide() {
  if (!activePresentationPolicy) return;
  if (currentSlideIndex < activePresentationPolicy.slides.length - 1) {
    currentSlideIndex++;
    renderPresentationSlide();
  }
}

function prevSlide() {
  if (!activePresentationPolicy) return;
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    renderPresentationSlide();
  }
}

function togglePresentationFullscreen() {
  const modal = document.getElementById('presentation-modal');
  if (!document.fullscreenElement) {
    if (modal.requestFullscreen) modal.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
}

// ==========================================================================
// 12. محرك البحث والفلترة الفورية (Search & Instant Filters)
// ==========================================================================

function filterPolicies() {
  const searchInput = document.getElementById('policy-search-input');
  const catFilter = document.getElementById('policy-category-filter');
  const grid = document.getElementById('policies-grid');
  if (!grid) return;

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const selectedCat = catFilter ? catFilter.value : 'ALL';

  const filtered = policiesState.filter(p => {
    const matchCategory = (selectedCat === 'ALL') || (p.category === selectedCat);
    const searchBlob = `${p.title} ${p.code} ${p.dept} ${p.purpose} ${p.plain_text || ''}`.toLowerCase();
    const matchQuery = !query || searchBlob.includes(query);
    return matchCategory && matchQuery;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
        <span class="text-4xl">🔍</span>
        <h3 class="text-lg font-bold text-slate-800">لا توجد سياسات مطابقة لمعايير البحث الحالية</h3>
        <p class="text-xs text-slate-500">جرب البحث بكلمات أخرى أو اختر "جميع الأقسام" لعرض المكتبة الكاملة.</p>
        <button type="button" id="reset-search-btn" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition">
          إظهار جميع السياسات
        </button>
      </div>
    `;
    const rBtn = document.getElementById('reset-search-btn');
    if (rBtn) {
      rBtn.onclick = () => {
        if (searchInput) searchInput.value = '';
        if (catFilter) catFilter.value = 'ALL';
        filterPolicies();
      };
    }
    return;
  }

  filtered.forEach(p => {
    const meta = CATEGORY_META[p.category] || CATEGORY_META.QPI;
    const slidesCount = Array.isArray(p.slides) ? p.slides.length : 0;
    const card = document.createElement('article');
    card.className = 'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-500 transition-all flex flex-col justify-between p-5 space-y-4';
    
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-full border ${meta.badge}">
            ${p.code} • ${meta.name.split(' ')[0]}
          </span>
          <span class="text-xs text-slate-400 font-bold">${p.version || 'الإصدار 1.0'}</span>
        </div>

        <h3 class="text-base font-extrabold text-slate-900 leading-snug line-clamp-2">${p.title}</h3>
        
        <p class="text-xs text-slate-600 line-clamp-3 leading-relaxed">${p.purpose}</p>

        <div class="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
          <span class="truncate"><strong>القسم:</strong> ${p.dept}</span>
          ${slidesCount > 0 ? `<span class="text-teal-700 font-extrabold shrink-0">📊 ${slidesCount} شرائح</span>` : ''}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 space-y-2">
        <div class="flex items-center gap-2">
          <button type="button" class="btn-read-doc flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm">
            <span>📖</span>
            <span>وضع الوثيقة</span>
          </button>
          
          <button type="button" class="btn-launch-presentation bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm" title="تشغيل العرض التقديمي">
            <span>📽️</span>
            <span>عرض الشرائح</span>
          </button>
        </div>

        ${isAuthorizedAdmin ? `
          <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
            <button type="button" class="btn-edit-policy flex-1 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold py-1.5 px-2 rounded-lg transition text-center">
              ✏️ تعديل
            </button>
            <button type="button" class="btn-delete-policy bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-800 text-xs font-bold py-1.5 px-3 rounded-lg transition" title="حذف">
              🗑️
            </button>
          </div>
        ` : ''}
      </div>
    `;

    card.querySelector('.btn-read-doc').onclick = () => openDocumentMode(p.id);
    card.querySelector('.btn-launch-presentation').onclick = () => openPresentationMode(p.id);
    
    if (isAuthorizedAdmin) {
      card.querySelector('.btn-edit-policy').onclick = () => startEditPolicy(p.id);
      card.querySelector('.btn-delete-policy').onclick = () => removePolicy(p.id);
    }

    grid.appendChild(card);
  });
}

// ==========================================================================
// 13. عرض الأقسام الرئيسية والإحصائيات (Home, Categories & Bundles)
// ==========================================================================

function renderStatsAndCounts() {
  const pCount = policiesState.length;
  const bCount = bundlesState.length;

  const elPNav = document.getElementById('nav-policies-count');
  const elBNav = document.getElementById('nav-bundles-count');
  const elStatP = document.getElementById('stat-total-policies');
  const elStatB = document.getElementById('stat-total-bundles');
  const elStatC = document.getElementById('stat-bundle-compliance');

  if (elPNav) elPNav.textContent = pCount;
  if (elBNav) elBNav.textContent = bCount;
  if (elStatP) elStatP.textContent = pCount;
  if (elStatB) elStatB.textContent = bCount;

  if (elStatC) {
    let totalItems = 0;
    let checkedItems = 0;
    bundlesState.forEach(b => {
      (b.items || []).forEach(it => {
        totalItems++;
        if (it.checked) checkedItems++;
      });
    });
    const pct = totalItems === 0 ? 100 : Math.round((checkedItems / totalItems) * 100);
    elStatC.textContent = pct + '%';
  }
}

function renderCategoryCards() {
  const container = document.getElementById('category-cards-grid');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(CATEGORY_META).forEach(catKey => {
    const meta = CATEGORY_META[catKey];
    const count = policiesState.filter(p => p.category === catKey).length;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'text-right p-5 rounded-2xl border border-slate-200 hover:border-teal-600 hover:shadow-md transition bg-slate-50/60 hover:bg-white flex flex-col justify-between gap-3 group';
    
    card.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <span class="text-3xl">${meta.icon}</span>
        <span class="text-xs font-extrabold px-3 py-1 rounded-full border ${meta.badge}">
          ${count} سياسات
        </span>
      </div>
      <div>
        <h4 class="font-extrabold text-slate-900 group-hover:text-teal-800 transition text-sm sm:text-base">${meta.name}</h4>
        <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">${meta.desc}</p>
      </div>
    `;

    card.onclick = () => {
      const catFilter = document.getElementById('policy-category-filter');
      const searchInput = document.getElementById('policy-search-input');
      if (catFilter) catFilter.value = catKey;
      if (searchInput) searchInput.value = '';
      filterPolicies();
      switchTab('policies');
    };

    container.appendChild(card);
  });
}

function renderHomeFeatured() {
  const polBox = document.getElementById('home-featured-policies');
  if (polBox) {
    polBox.innerHTML = '';
    policiesState.slice(0, 3).forEach(p => {
      const meta = CATEGORY_META[p.category] || CATEGORY_META.QPI;
      const item = document.createElement('div');
      item.className = 'p-4 rounded-xl border border-slate-200 hover:border-teal-500 transition flex items-center justify-between gap-3 bg-slate-50/60';
      item.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${meta.badge}">${p.code}</span>
            <span class="text-xs text-slate-500">${p.dept}</span>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">${p.title}</h4>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" class="btn-home-read bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition">
            قراءة الوثيقة
          </button>
          <button type="button" class="btn-home-pres bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition" title="عرض تقديمي">
            📽️
          </button>
        </div>
      `;
      item.querySelector('.btn-home-read').onclick = () => openDocumentMode(p.id);
      item.querySelector('.btn-home-pres').onclick = () => openPresentationMode(p.id);
      polBox.appendChild(item);
    });
  }

  const bndBox = document.getElementById('home-featured-bundles');
  if (bndBox) {
    bndBox.innerHTML = '';
    bundlesState.slice(0, 3).forEach(b => {
      const checkedCount = (b.items || []).filter(i => i.checked).length;
      const total = (b.items || []).length;
      const pct = total ? Math.round((checkedCount / total) * 100) : 100;
      const item = document.createElement('div');
      item.className = 'p-4 rounded-xl border border-slate-200 hover:border-red-400 transition flex items-center justify-between gap-3 bg-slate-50/60';
      item.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">${b.code}</span>
            <span class="text-xs text-slate-500">${total} عناصر إلزامية</span>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">${b.title}</h4>
        </div>
        <button type="button" class="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition">
          الالتزام ${pct}%
        </button>
      `;
      item.querySelector('button').onclick = () => switchTab('bundles');
      bndBox.appendChild(item);
    });
  }
}

function renderBundlesGrid() {
  const grid = document.getElementById('bundles-grid');
  if (!grid) return;
  grid.innerHTML = '';

  bundlesState.forEach(b => {
    const total = (b.items || []).length;
    const checkedCount = (b.items || []).filter(i => i.checked).length;
    const pct = total ? Math.round((checkedCount / total) * 100) : 100;
    const isFull = pct === 100;

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-5';

    const checklistHtml = (b.items || []).map((item, idx) => `
      <label class="flex items-start gap-3 p-3 rounded-xl border ${item.checked ? 'bg-teal-50/60 border-teal-200' : 'bg-slate-50 border-slate-200'} cursor-pointer hover:border-teal-500 transition">
        <input
          type="checkbox"
          data-bundle-id="${b.id}"
          data-item-idx="${idx}"
          class="bundle-check mt-1 w-4 h-4 accent-teal-700 rounded cursor-pointer"
          ${item.checked ? 'checked' : ''}
        />
        <span class="text-xs sm:text-sm font-semibold ${item.checked ? 'text-slate-900' : 'text-slate-600'}">
          ${item.text}
        </span>
      </label>
    `).join('');

    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
            ${b.code}
          </span>
          <span class="text-xs font-extrabold px-3 py-1 rounded-full ${isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            نسبة الالتزام بالحزمة: ${pct}% (${checkedCount}/${total})
          </span>
        </div>
        <h3 class="text-base sm:text-lg font-extrabold text-slate-900">${b.title}</h3>
        <p class="text-xs text-slate-500"><strong>الأقسام المستهدفة:</strong> ${b.dept} • <strong>الهدف:</strong> ${b.goal}</p>

        <!-- شريط التقدم -->
        <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div class="${isFull ? 'bg-emerald-600' : 'bg-teal-600'} h-full transition-all duration-300" style="width: ${pct}%"></div>
        </div>

        <!-- قائمة التحقق التفاعلية -->
        <div class="space-y-2 pt-2">
          ${checklistHtml}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button type="button" class="check-all-bundle-btn text-xs font-bold text-teal-700 hover:underline">
          ✔ تأشير استيفاء جميع عناصر الحزمة
        </button>
      </div>
    `;

    card.querySelectorAll('.bundle-check').forEach(chk => {
      chk.onchange = (e) => {
        const idx = parseInt(e.target.getAttribute('data-item-idx'), 10);
        b.items[idx].checked = e.target.checked;
        saveLocalState();
        renderAll();
      };
    });

    card.querySelector('.check-all-bundle-btn').onclick = () => {
      b.items.forEach(it => { it.checked = true; });
      saveLocalState();
      renderAll();
      showToast('تم تأشير استيفاء جميع عناصر الحزمة بنسبة 100%');
    };

    grid.appendChild(card);
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  const views = ['home', 'policies', 'bundles', 'architecture', 'admin'];
  views.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) {
      if (v === tabName) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });

  document.querySelectorAll('.nav-tab').forEach(btn => {
    const bTab = btn.getAttribute('data-tab');
    if (bTab === 'admin') {
      btn.className = bTab === tabName
        ? 'nav-tab px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-red-900 text-white shadow-sm flex items-center gap-1.5'
        : 'nav-tab px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-red-800 hover:bg-red-900 text-white shadow-sm flex items-center gap-1.5';
    } else if (bTab === tabName) {
      btn.className = 'nav-tab px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-teal-700 text-white shadow-sm';
    } else {
      btn.className = 'nav-tab px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition text-slate-700 hover:bg-slate-100';
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderStatsAndCounts();
  renderCategoryCards();
  renderHomeFeatured();
  filterPolicies();
  renderBundlesGrid();
}

// ==========================================================================
// 14. نافذة الإعدادات ومفاتيح الربط (Settings & Credentials Modal)
// ==========================================================================

function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  loadConfigOverrides();
  document.getElementById('settings-firebase-apikey').value = FIREBASE_CONFIG.apiKey || '';
  document.getElementById('settings-firebase-projectid').value = FIREBASE_CONFIG.projectId || '';
  document.getElementById('settings-firebase-authdomain').value = FIREBASE_CONFIG.authDomain || '';
  document.getElementById('settings-admin-emails').value = ADMIN_EMAILS.join('\n');
  document.getElementById('settings-gemini-key').value = GEMINI_CONFIG.apiKey || '';
  document.getElementById('settings-cloudinary-name').value = CLOUDINARY_CONFIG.cloudName || '';
  document.getElementById('settings-cloudinary-preset').value = CLOUDINARY_CONFIG.uploadPreset || '';

  modal.classList.remove('hidden');
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('hidden');
}

function saveSettingsModal() {
  const fbKey = document.getElementById('settings-firebase-apikey').value.trim();
  const fbProject = document.getElementById('settings-firebase-projectid').value.trim();
  const fbAuthDomain = document.getElementById('settings-firebase-authdomain').value.trim();
  const adminEmailsText = document.getElementById('settings-admin-emails').value.trim();
  const geminiKey = document.getElementById('settings-gemini-key').value.trim();
  const cloudName = document.getElementById('settings-cloudinary-name').value.trim();
  const cloudPreset = document.getElementById('settings-cloudinary-preset').value.trim();

  const adminList = adminEmailsText.split('\n').map(e => e.trim().toLowerCase()).filter(Boolean);

  const newSettings = {
    firebase: {
      apiKey: fbKey,
      projectId: fbProject,
      authDomain: fbAuthDomain || (fbProject ? `${fbProject}.firebaseapp.com` : '')
    },
    adminEmails: adminList,
    geminiKey: geminiKey,
    cloudinaryName: cloudName,
    cloudinaryPreset: cloudPreset
  };

  saveConfigOverrides(newSettings);

  // تحديث المتغيرات النشطة
  if (fbKey) FIREBASE_CONFIG.apiKey = fbKey;
  if (fbProject) FIREBASE_CONFIG.projectId = fbProject;
  if (fbAuthDomain) FIREBASE_CONFIG.authDomain = fbAuthDomain;
  if (adminList.length > 0) {
    ADMIN_EMAILS.length = 0;
    adminList.forEach(e => ADMIN_EMAILS.push(e));
  }
  if (geminiKey) GEMINI_CONFIG.apiKey = geminiKey;
  if (cloudName) CLOUDINARY_CONFIG.cloudName = cloudName;
  if (cloudPreset) CLOUDINARY_CONFIG.uploadPreset = cloudPreset;

  closeSettingsModal();
  showToast('تم حفظ الإعدادات وتحديث المفاتيح بنجاح');

  // إعادة تهيئة Firebase إذا تم إدخال مفتاح جديد
  if (fbKey && fbProject) {
    initFirebase();
  }
}

// ==========================================================================
// 15. أدوات مساعدة وتهيئة واجهة المستخدم (Helpers & DOM Setup)
// ==========================================================================

function showToast(message) {
  const box = document.getElementById('toast-box');
  const text = document.getElementById('toast-message');
  if (!box || !text) return;
  text.textContent = message;
  box.classList.remove('hidden');
  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    box.classList.add('hidden');
  }, 3500);
}

function getArabicCurrentMonthYear() {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// تهيئة المستمعين عند اكتمال تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  renderAll();

  // أزرار التنقل العلوية
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // أزرار التنقل السريع في البانر
  document.querySelectorAll('.quick-goto-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-goto'));
    });
  });

  // البحث في البانر الرئيسي
  const heroSearchInput = document.getElementById('hero-search-input');
  const heroSearchBtn = document.getElementById('hero-search-btn');
  if (heroSearchBtn && heroSearchInput) {
    heroSearchBtn.addEventListener('click', () => {
      const q = heroSearchInput.value.trim();
      const pSearch = document.getElementById('policy-search-input');
      const pCat = document.getElementById('policy-category-filter');
      if (pSearch) pSearch.value = q;
      if (pCat) pCat.value = 'ALL';
      filterPolicies();
      switchTab('policies');
    });

    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        heroSearchBtn.click();
      }
    });
  }

  // الفلترة الحية في صفحة السياسات
  const pSearch = document.getElementById('policy-search-input');
  const pCat = document.getElementById('policy-category-filter');
  if (pSearch) pSearch.addEventListener('input', filterPolicies);
  if (pCat) pCat.addEventListener('change', filterPolicies);

  // أزرار إضافة سياسة
  const addBtnHero = document.getElementById('hero-quick-add-btn');
  const addBtnPolicies = document.getElementById('policies-add-btn');
  if (addBtnHero) {
    addBtnHero.addEventListener('click', () => {
      if (!isAuthorizedAdmin) {
        showToast('يرجى تسجيل الدخول بحساب الإدارة لإضافة سياسة');
        signInWithGoogle();
        return;
      }
      resetPolicyEditor();
      switchTab('admin');
    });
  }
  if (addBtnPolicies) {
    addBtnPolicies.addEventListener('click', () => {
      if (!isAuthorizedAdmin) {
        showToast('يرجى تسجيل الدخول بحساب الإدارة لإضافة سياسة');
        signInWithGoogle();
        return;
      }
      resetPolicyEditor();
      switchTab('admin');
    });
  }

  // تسجيل الدخول والخروج
  const loginBtn = document.getElementById('auth-login-btn');
  const logoutBtn = document.getElementById('auth-logout-btn');
  if (loginBtn) loginBtn.addEventListener('click', signInWithGoogle);
  if (logoutBtn) logoutBtn.addEventListener('click', signOutUser);

  // نافذة الإعدادات
  const settingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-modal-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsModal);

  // رفع ملفات Word (.docx)
  const wordFileInput = document.getElementById('word-file-input');
  if (wordFileInput) {
    wordFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleWordFileUpload(file);
    });
  }

  // فحص ملف PDF وتحديد النطاق
  const pdfFileInput = document.getElementById('pdf-file-input');
  if (pdfFileInput) {
    pdfFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) inspectPdfFile(file);
    });
  }

  // زر بدء المعالجة بـ Gemini
  const processPdfBtn = document.getElementById('process-pdf-gemini-btn');
  if (processPdfBtn) {
    processPdfBtn.addEventListener('click', processPdfWithGemini);
  }

  // رفع صور Cloudinary
  const cloudinaryFileInput = document.getElementById('cloudinary-file-input');
  if (cloudinaryFileInput) {
    cloudinaryFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleCloudinaryUpload(file);
    });
  }

  // تبويبات المحرر والمعاينة
  document.querySelectorAll('.editor-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchEditorTab(btn.getAttribute('data-tab'));
    });
  });

  // إضافة شريحة يدوياً
  const addSlideBtn = document.getElementById('editor-add-slide-btn');
  if (addSlideBtn) addSlideBtn.addEventListener('click', addNewSlideToEditor);

  // تحديث المعاينة الحية عند الكتابة
  const formInputs = document.querySelectorAll('#policy-master-form input, #policy-master-form textarea, #policy-master-form select');
  formInputs.forEach(input => {
    input.addEventListener('input', updateLivePreview);
  });

  // حفظ نموذج السياسة
  const masterForm = document.getElementById('policy-master-form');
  if (masterForm) masterForm.addEventListener('submit', handlePolicyFormSubmit);

  const resetEditorBtn = document.getElementById('editor-reset-btn');
  if (resetEditorBtn) resetEditorBtn.addEventListener('click', resetPolicyEditor);

  // نافذة وضع الوثيقة (Document Modal)
  const closeDocBtn = document.getElementById('close-doc-modal-btn');
  const printDocBtn = document.getElementById('doc-modal-print-btn');
  if (closeDocBtn) closeDocBtn.addEventListener('click', closeDocumentModal);
  if (printDocBtn) printDocBtn.addEventListener('click', () => window.print());

  // نافذة العرض التقديمي (Presentation Modal)
  const presNextBtn = document.getElementById('pres-next-btn');
  const presPrevBtn = document.getElementById('pres-prev-btn');
  const presCloseBtn = document.getElementById('pres-close-btn');
  const presFullscreenBtn = document.getElementById('pres-fullscreen-btn');
  if (presNextBtn) presNextBtn.addEventListener('click', nextSlide);
  if (presPrevBtn) presPrevBtn.addEventListener('click', prevSlide);
  if (presCloseBtn) presCloseBtn.addEventListener('click', closePresentationMode);
  if (presFullscreenBtn) presFullscreenBtn.addEventListener('click', togglePresentationFullscreen);

  // التنقل بالأسهم ولوحة المفاتيح في وضع العرض التقديمي
  window.addEventListener('keydown', (e) => {
    if (!activePresentationPolicy) return;
    if (e.key === 'ArrowLeft' || e.key === 'Space') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'Escape') {
      closePresentationMode();
    } else if (e.key === 'f' || e.key === 'F') {
      togglePresentationFullscreen();
    }
  });

  // دعم السحب باللمس على الموبايل (Touch Swipe)
  let touchStartX = 0;
  let touchEndX = 0;
  const presModal = document.getElementById('presentation-modal');
  if (presModal) {
    presModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    presModal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleTouchSwipe();
    }, { passive: true });
  }

  function handleTouchSwipe() {
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 45) {
      if (diff < 0) {
        // سحب لليسار -> الشريحة التالية (في اتجاه RTL)
        nextSlide();
      } else {
        // سحب لليمين -> الشريحة السابقة
        prevSlide();
      }
    }
  }

  // تصدير واستيراد البيانات
  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = JSON.stringify({ policies: policiesState, bundles: bundlesState }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mih-quality-policies-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('تم تصدير ملف السياسات بنجاح (JSON)');
    });
  }

  const resetDefaultBtn = document.getElementById('reset-default-btn');
  if (resetDefaultBtn) {
    resetDefaultBtn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من رغبتك في استعادة السياسات الافتراضية؟')) {
        policiesState = JSON.parse(JSON.stringify(DEFAULT_POLICIES));
        bundlesState = JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
        saveLocalState();
        renderAll();
        showToast('تمت استعادة البيانات الافتراضية للمستشفى');
      }
    });
  }
});
