import { Policy, Bundle, CategoryInfo, CategoryKey } from '../types';

export const CATEGORY_META: Record<CategoryKey, CategoryInfo> = {
  "CSS": {
    "name": "خدمات الرعاية الحرجة والخاصة (CSS)",
    "badge": "bg-rose-100 text-rose-800 border-rose-200",
    "icon": "🫀",
    "desc": "خدمات الرعاية الحرجة، التعامل مع الإنذارات، القساطر والأنابيب، ورعاية الحالات الخاصة والحرجة."
  },
  "NSR": {
    "name": "المعايير الوطنية للسلامة (NSR)",
    "badge": "bg-red-100 text-red-800 border-red-200",
    "icon": "🛡️",
    "desc": "معايير أمان المرضى الأساسية المتوافقة مع متطلبات الهيئة العامة للاعتماد والرقابة الصحية (GAHAR)."
  },
  "IPC": {
    "name": "مكافحة العدوى (IPC)",
    "badge": "bg-teal-100 text-teal-800 border-teal-200",
    "icon": "🧼",
    "desc": "سياسات النظافة والتعقيم والوقاية من العدوى المكتسبة داخل المنشآت الصحية (HAIs)."
  },
  "MMS": {
    "name": "إدارة واستخدام الأدوية (MMS)",
    "badge": "bg-amber-100 text-amber-800 border-amber-200",
    "icon": "💊",
    "desc": "سلامة الأدوية عالية الخطورة، تنظيم الصرف، وتفادي الأخطاء الدوائية الشائعة."
  },
  "QPI": {
    "name": "تحسين الجودة وسلامة المرضى (QPI)",
    "badge": "bg-blue-100 text-blue-800 border-blue-200",
    "icon": "📈",
    "desc": "مؤشرات الأداء، سياسات الإبلاغ عن الحوادث العارضة (OVR)، وإدارة المخاطر السريرية."
  },
  "FMS": {
    "name": "إدارة وسلامة المنشأة (FMS)",
    "badge": "bg-purple-100 text-purple-800 border-purple-200",
    "icon": "🚒",
    "desc": "أكواد الطوارئ، السلامة والصحة المهنية، خطط الإخلاء، ومكافحة الحرائق بالمستشفى."
  },
  "ER": {
    "name": "الطوارئ والرعاية الحرجة (ER & ICU)",
    "badge": "bg-rose-100 text-rose-800 border-rose-200",
    "icon": "⚡",
    "desc": "بروتوكولات الفرز الطبي (Triage)، الاستجابة السريعة لحالات السكتة القلبية والإنتان."
  },
  "ICD": {
    "name": "تقديم الرعاية المتكاملة (ICD)",
    "badge": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "icon": "🩺",
    "desc": "سياسات التقييم الطبي والتمريضي، الفرز الأسترالي للطوارئ، وإدارة الألم والتغذية السريرية."
  }
,
  "PCC": {
    "name": "الرعاية المتمركزة حول المريض (PCC)",
    "badge": "bg-pink-100 text-pink-800 border-pink-200",
    "icon": "🤝",
    "desc": "حقوق وتمكين المرضى وذويهم، الرعاية متعددة التخصصات، والموافقة المستنيرة والخصوصية."
  },
  "IMT": {
    "name": "إدارة وتكنولوجيا المعلومات (IMT)",
    "badge": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "icon": "📁",
    "desc": "إدارة وضبط الوثائق، أمن وسرية الملف الطبي، والرموز والاختصارات الطبية المعتمدة."
  }
,
  "ACT": {
    "name": "الوصول والاستمرارية وانتقال الرعاية (ACT)",
    "badge": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "icon": "🔄",
    "desc": "إجراءات دخول وتنويم المرضى، التسليم والتسلم، التنسيق والنقل الآمن والإحالة الطبية."
  },
  "SAS": {
    "name": "الجراحة والتخدير والتهدئة (SAS)",
    "badge": "bg-violet-100 text-violet-800 border-violet-200",
    "icon": "🔪",
    "desc": "التقييم قبل التخدير، قائمة التحقق الجراحية، تمييز مكان الجراحة، وإجراءات التعافي."
  }
,
  "WFM": {
    "name": "إدارة القوى العاملة (WFM)",
    "badge": "bg-sky-100 text-sky-800 border-sky-200",
    "icon": "👥",
    "desc": "سياسات تهيئة وتدريب وتطوير الكوادر الطبية والتمريضية والإدارية والتعليم المستمر."
  }
};

export const DEFAULT_BUNDLES: Bundle[] = [
  {
    "id": "bnd-1",
    "code": "BND-IPC-01",
    "title": "حزمة الوقاية من عدوى مجرى الدم المرتبطة بالقسطرة المركزية (CLABSI Bundle)",
    "dept": "العنايات المركزة والعمليات الجراحية",
    "goal": "منع حدوث عدوى الدم المصاحبة لتركيب ورعاية القسطرة الوريدية المركزية (Central Line)",
    "items": [
      {
        "text": "الالتزام الصارم بنظافة الأيدي قبل التركيب أو التعامل مع القسطرة",
        "checked": true
      },
      {
        "text": "استخدام الواقيات القصوى المعقمة (قبعة، قناع، عباءة معقمة، قفازات، وغطاء كامل)",
        "checked": true
      },
      {
        "text": "تطهير الجلد بمحلول الكلورهيكسيدين 2% الكحولي وتركه حتى يجف تماماً",
        "checked": true
      },
      {
        "text": "تجنب الوريد الفخذي (Femoral Vein) قدر الإمكان وتفضيل الوريد تحت الترقوة",
        "checked": true
      },
      {
        "text": "المراجعة اليومية لمدى الحاجة للقسطرة وإزالتها فور انتهاء الغرض الطبي منها",
        "checked": true
      }
    ]
  },
  {
    "id": "bnd-2",
    "code": "BND-IPC-02",
    "title": "حزمة الوقاية من الالتهاب الرئوي المرتبط بجهاز التنفس الصناعي (VAP Bundle)",
    "dept": "وحدات الرعاية المركزة (ICU)",
    "goal": "الحد من حدوث الالتهاب الرئوي للمرضى الموضوعين على أجهزة التنفس الصناعي الميكانيكي",
    "items": [
      {
        "text": "رفع رأس السرير بزاوية 30 إلى 45 درجة (ما لم يكن هناك مانع طبي)",
        "checked": true
      },
      {
        "text": "التقييم اليومي لإمكانية إيقاف المهدئات واختبار الجاهزية للفصل (Sedation Vacation)",
        "checked": true
      },
      {
        "text": "العناية الفموية المنتظمة للمريض بمحلول مطهر معتمد كل 6-8 ساعات",
        "checked": true
      },
      {
        "text": "الوقاية من قرحة المعدة الإجهادية (Peptic Ulcer Disease Prophylaxis)",
        "checked": true
      },
      {
        "text": "الوقاية من جلطات الأوردة العميقة (DVT Prophylaxis)",
        "checked": false
      }
    ]
  },
  {
    "id": "bnd-3",
    "code": "BND-IPC-03",
    "title": "حزمة الوقاية من عدوى المسالك البولية المرتبطة بالقسطرة (CAUTI Bundle)",
    "dept": "الأقسام الداخلية والعنايات المركزة والعمليات",
    "goal": "منع حدوث عدوى الجهاز البولي الناتجة عن تركيب القسطرة البولية",
    "items": [
      {
        "text": "تركيب القسطرة البولية لدواعٍ طبية معتمدة فقط وتوثيق السبب في الملف الطبي",
        "checked": true
      },
      {
        "text": "استخدام تقنية التعقيم الكامل (Aseptic Technique) ومعدات معقمة أثناء التركيب",
        "checked": true
      },
      {
        "text": "الحفاظ على نظام تصريف مغلق ومعقم وعدم فصل القسطرة عن كيس الجمع",
        "checked": true
      },
      {
        "text": "إبقاء كيس جمع البول تحت مستوى المثانة دائماً وعدم ملامسته للأرض",
        "checked": true
      },
      {
        "text": "المراجعة اليومية للحاجة للقسطرة وإزالتها في أقرب وقت ممكن",
        "checked": true
      }
    ]
  },
  {
    "id": "bnd-4",
    "code": "BND-IPC-04",
    "title": "حزمة الوقاية من عدوى موضع الجراحة (SSI Prevention Bundle)",
    "dept": "أقسام الجراحة والعمليات الجراحية",
    "goal": "خفض معدلات عدوى الجروح بعد العمليات الجراحية",
    "items": [
      {
        "text": "إعطاء المضاد الحيوي الوقائي خلال 60 دقيقة قبل الشق الجراحي وإيقافه خلال 24 ساعة",
        "checked": true
      },
      {
        "text": "إزالة الشعر عند الضرورة فقط باستخدام المقص الكهربائي (Clippers) ومنع استخدام الأمواس",
        "checked": true
      },
      {
        "text": "الحفاظ على ضبط مستوى السكر بالدم (< 180 mg/dL) أثناء وبعد الجراحة",
        "checked": true
      },
      {
        "text": "الحفاظ على درجة حرارة جسم المريض الطبيعية (Normothermia) أثناء العملية",
        "checked": false
      }
    ]
  },
  {
    "id": "bnd-5",
    "code": "BND-CLN-05",
    "title": "حزمة الساعة الأولى للتعامل مع الإنتان الحاد (Sepsis 1-Hour Bundle)",
    "dept": "قسم الاستقبال والطوارئ والعنايات المركزة",
    "goal": "التدخل السريع والمنظم خلال الساعة الأولى لإنقاذ حياة مرضى تسمم الدم (Sepsis)",
    "items": [
      {
        "text": "قياس مستوى اللاكتات بالدم (Lactate Level) وإعادة القياس إذا كان > 2 mmol/L",
        "checked": true
      },
      {
        "text": "سحب مزارع الدم (Blood Cultures) قبل البدء في إعطاء المضادات الحيوية",
        "checked": true
      },
      {
        "text": "إعطاء مضادات حيوية واسعة المجال وريدياً خلال الساعة الأولى",
        "checked": true
      },
      {
        "text": "البدء الفوري بإعطاء محاليل بلورية (30 ml/kg) في حال هبوط الضغط أو اللاكتات ≥ 4",
        "checked": true
      },
      {
        "text": "إعطاء قابضات الأوعية (Vasopressors) للحفاظ على متوسط الضغط الشرياني MAP ≥ 65 mmHg",
        "checked": true
      }
    ]
  }
];

export function isManualPolicy(p: Policy | { code?: string; id?: string; dept?: string; notes?: string; source?: string }): boolean {
  if (!p) return false;
  if (p.source === 'MANUAL') return true;
  if (p.code && (p.code.startsWith('SMC/MIH') || p.code.startsWith('MIH-IPC') || p.code.startsWith('MIH-FMS') || p.code.startsWith('MIH-QPI-002') || p.code.startsWith('MIH-NSR-002') || p.code.startsWith('MIH-NSR-003'))) return true;
  if (p.id && (p.id.startsWith('IC-') || p.id.startsWith('pol-7') || p.id.startsWith('pol-8') || p.id.startsWith('pol-9') || p.id.startsWith('pol-10') || p.id.startsWith('pol-11') || p.id.startsWith('pol-12') || p.id.startsWith('pol-13') || p.id.startsWith('pol-14') || p.id.startsWith('pol-15') || p.id.startsWith('pol-16') || p.id.startsWith('pol-17') || p.id.startsWith('pol-18'))) return true;
  if (p.dept && (p.dept.includes('المجلد') || p.dept.includes('ص '))) return true;
  if (p.notes && p.notes.includes('المجلد')) return true;
  return false;
}
