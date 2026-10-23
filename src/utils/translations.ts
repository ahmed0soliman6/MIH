import { CategoryKey } from '../types';

export type Language = 'ar' | 'en';

export interface CategoryTranslation {
  name: string;
  desc: string;
}

export const CATEGORY_TRANSLATIONS: Record<Language, Record<CategoryKey, CategoryTranslation>> = {
  ar: {
    NSR: {
      name: 'المعايير الوطنية للسلامة (NSR)',
      desc: 'معايير أمان المرضى الأساسية المتوافقة مع متطلبات الهيئة العامة للاعتماد والرقابة الصحية (GAHAR).'
    },
    IPC: {
      name: 'مكافحة العدوى والوقاية (IPC)',
      desc: 'سياسات النظافة والتعقيم والوقاية من العدوى المكتسبة داخل المنشآت الصحية (HAIs).'
    },
    MMS: {
      name: 'إدارة واستخدام الأدوية (MMS)',
      desc: 'سلامة الأدوية عالية الخطورة، تنظيم الصرف، وتفادي الأخطاء الدوائية الشائعة.'
    },
    QPI: {
      name: 'تحسين الجودة وسلامة المرضى (QPI)',
      desc: 'مؤشرات الأداء، سياسات الإبلاغ عن الحوادث العارضة (OVR)، وإدارة المخاطر السريرية.'
    },
    FMS: {
      name: 'إدارة وسلامة المنشأة (FMS)',
      desc: 'أكواد الطوارئ، السلامة والصحة المهنية، خطط الإخلاء، ومكافحة الحرائق بالمستشفى.'
    },
    ER: {
      name: 'الطوارئ والرعاية الحرجة (ER & ICU)',
      desc: 'بروتوكولات الفرز الطبي (Triage)، الاستجابة السريعة لحالات السكتة القلبية والإنتان.'
    },
    ICD: {
      name: 'تقديم الرعاية المتكاملة (ICD)',
      desc: 'سياسات التقييم الطبي والتمريضي، الفرز الأسترالي للطوارئ، وإدارة الألم والتغذية السريرية.'
    },
    PCC: {
      name: 'الرعاية المتمركزة حول المريض (PCC)',
      desc: 'حقوق وتمكين المرضى وذويهم، الرعاية متعددة التخصصات، والموافقة المستنيرة والخصوصية.'
    },
    IMT: {
      name: 'إدارة وتكنولوجيا المعلومات (IMT)',
      desc: 'إدارة وضبط الوثائق، أمن وسرية الملف الطبي، والرموز والاختصارات الطبية المعتمدة.'
    },
    ACT: {
      name: 'الوصول والاستمرارية وانتقال الرعاية (ACT)',
      desc: 'إجراءات دخول وتنويم المرضى، التسليم والتسلم، التنسيق والنقل الآمن والإحالة الطبية.'
    },
    SAS: {
      name: 'الجراحة والتخدير والتهدئة (SAS)',
      desc: 'التقييم قبل التخدير، قائمة التحقق الجراحية، تمييز مكان الجراحة، وإجراءات التعافي.'
    },
    WFM: {
      name: 'إدارة القوى العاملة (WFM)',
      desc: 'سياسات تهيئة وتدريب وتطوير الكوادر الطبية والتمريضية والإدارية والتعليم المستمر.'
    }
  },
  en: {
    NSR: {
      name: 'National Safety Requirements (NSR)',
      desc: 'Essential patient safety standards aligned with Egyptian GAHAR accreditation mandates.'
    },
    IPC: {
      name: 'Infection Prevention & Control (IPC)',
      desc: 'Standard sterilization, PPE protocols, and healthcare-associated infections (HAIs) prevention.'
    },
    MMS: {
      name: 'Medication Management & Safety (MMS)',
      desc: 'High-alert medications, dispensing verification, and clinical pharmacotherapy guidelines.'
    },
    QPI: {
      name: 'Quality Improvement & Patient Safety (QPI)',
      desc: 'Clinical Key Performance Indicators (KPIs), Occurrence Variance Reporting (OVR), and clinical risk audits.'
    },
    FMS: {
      name: 'Facility Management & Safety (FMS)',
      desc: 'Hospital emergency codes, hazmat safety, fire prevention, and medical facility evacuation drills.'
    },
    ER: {
      name: 'Emergency & Critical Care (ER & ICU)',
      desc: 'Emergency triage systems, rapid response code teams, septic shock, and CPR resuscitation pathways.'
    },
    ICD: {
      name: 'Integrated Care Delivery (ICD)',
      desc: 'Multidisciplinary clinical assessment, nursing plans, clinical nutrition, and evidence-based pain management.'
    },
    PCC: {
      name: 'Patient-Centered Care (PCC)',
      desc: 'Patient and family rights, informed clinical consent, clinical privacy, and shared medical decisions.'
    },
    IMT: {
      name: 'Information Management & Healthcare Tech (IMT)',
      desc: 'Electronic Medical Record (EMR) confidentiality, document control, and approved clinical abbreviations.'
    },
    ACT: {
      name: 'Access, Continuity & Transition of Care (ACT)',
      desc: 'Patient admission pathways, clinical handover (SBAR), safe inter-hospital transfer, and discharge planning.'
    },
    SAS: {
      name: 'Surgical & Anesthesia Safety (SAS)',
      desc: 'WHO surgical safety checklist, pre-anesthetic clearance, surgical site verification, and PACU recovery.'
    },
    WFM: {
      name: 'Workforce Management & Training (WFM)',
      desc: 'Clinical staff onboarding, medical credentials verification, mandatory competencies, and CME programs.'
    }
  }
};

export const UI_STRINGS = {
  ar: {
    hospitalName: 'مستشفى المنصورة الدولي',
    hospitalSub: 'أمانة المراكز الطبية المتخصصة (SMC) • بوابة الجودة',
    qualityDirectorate: 'الإدارة العامة للجودة وتطوير الأداء وسلامة المرضى',
    republicEgypt: 'جمهورية مصر العربية • وزارة الصحة والسكان',
    navHome: 'الرئيسية',
    navPolicies: 'مكتبة السياسات',
    navBundles: 'حزم الرعاية',
    navArchitecture: 'المعايير',
    navAdmin: 'لوحة الإدارة',
    deptDirectory: 'أقسام المستشفى',
    deptGuide: 'دليل الأقسام والسياسات',
    backBtn: 'رجوع',
    searchPlaceholder: 'ابحث برقم الكود أو اسم السياسة أو القسم...',
    filterCategory: 'تصفية حسب المعيار الطبي:',
    allCategories: 'جميع المعايير والأقسام',
    darkMode: 'الوضع الليلي',
    lightMode: 'الوضع النهاري',
    langToggle: 'English',
    langName: 'العربية',
    adminLogin: 'دخول الإدارة',
    logout: 'خروج',
    adminBadge: 'مدير',
    readingView: 'مظهر القراءة',
    slides: 'الشرائح',
    exportPdf: 'تقرير PDF',
    generatingPdf: 'جاري استخراج تقرير PDF...',
    print: 'طباعة',
    edit: 'تعديل',
    close: 'إغلاق',
    policyDocApproved: 'وثيقة السياسة المعتمدة',
    policyCode: 'كود السياسة:',
    versionNumber: 'رقم الإصدار:',
    approvalDate: 'تاريخ الاعتماد:',
    effectiveDate: 'تاريخ بدء السريان:',
    reviewDate: 'تاريخ المراجعة القادمة:',
    applicableDepts: 'الأقسام المعنية بالتطبيق:',
    responsibilities: 'المسؤوليات:',
    purposeTitle: 'الهدف الإجرائي والتشغيلي من السياسة:',
    preparedBy: 'إعداد وتنسيق (Prepared by)',
    preparedBySub: 'منسق جودة القسم المعني',
    reviewedBy: 'مراجعة وتدقيق (Reviewed by)',
    reviewedBySub: 'مدير إدارة الجودة وسلامة المرضى',
    approvedBy: 'اعتماد نهائي (Approved by)',
    approvedBySub: 'مدير عام مستشفى المنصورة الدولي',
    officialApprovedBadge: 'معتمد رسمي',
    reportHeaderCenter: 'السياسات والإجراءات القياسية المعتمدة (SOPs)',
    reportFooterHospital: 'مستشفى المنصورة الدولي - أمانة المراكز الطبية المتخصصة',
    reportFooterConfidential: 'وثيقة رسمية خاصة بمستشفى المنصورة الدولي ومعتمدة وفق معايير GAHAR 2025',
    reportGeneratedAt: 'تاريخ ووقت استخراج التقرير:',
    quickStats: 'إحصائيات المنظومة',
    totalPolicies: 'إجمالي السياسات',
    careBundles: 'حزم الرعاية الإكلينيكية',
    clinicalDepts: 'أقسام المستشفى',
    gaharCompliant: 'معايير GAHAR',
    verifiedAccredited: 'معتمدة إكلينيكياً',
    downloadComplete: 'تم تجهيز وتنزيل ملف التقرير بنجاح',
    bookmarks: 'مفضلاتي',
    bookmarksCount: 'السياسات المحفوظة',
    noBookmarks: 'لا توجد سياسات في قائمة مفضلاتي حتى الآن',
    noBookmarksDesc: 'اضغط على زر القلب ❤️ بجانب أي سياسة لحفظها في قائمتك المفضلة والوصول إليها بسرعة.',
    addToBookmarks: 'حفظ في مفضلاتي',
    removeFromBookmarks: 'إزالة من مفضلاتي',
    bookmarkAdded: 'تمت إضافة السياسة إلى مفضلاتك بنجاح ❤️',
    bookmarkRemoved: 'تمت إزالة السياسة من مفضلاتك',
    bookmarksFilterTab: 'مفضلاتي'
  },
  en: {
    hospitalName: 'Mansoura International Hospital',
    hospitalSub: 'Specialized Medical Centers (SMC) • Quality Portal',
    qualityDirectorate: 'General Directorate of Quality, Patient Safety & Clinical Performance',
    republicEgypt: 'Arab Republic of Egypt • Ministry of Health & Population',
    navHome: 'Home',
    navPolicies: 'Policies Library',
    navBundles: 'Care Bundles',
    navArchitecture: 'GAHAR Standards',
    navAdmin: 'Admin Dashboard',
    deptDirectory: 'Departments',
    deptGuide: 'Departments & Policy Directory',
    backBtn: 'Back',
    searchPlaceholder: 'Search by policy code, clinical topic, or department...',
    filterCategory: 'Filter by Clinical Standard:',
    allCategories: 'All Standards & Departments',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    langToggle: 'العربية',
    langName: 'English',
    adminLogin: 'Admin Login',
    logout: 'Logout',
    adminBadge: 'Admin',
    readingView: 'Reading Mode',
    slides: 'Slides',
    exportPdf: 'Export PDF',
    generatingPdf: 'Generating PDF Report...',
    print: 'Print',
    edit: 'Edit',
    close: 'Close',
    policyDocApproved: 'Approved Clinical Policy Document',
    policyCode: 'Policy Code:',
    versionNumber: 'Version:',
    approvalDate: 'Approval Date:',
    effectiveDate: 'Effective Date:',
    reviewDate: 'Next Review Date:',
    applicableDepts: 'Applicable Departments:',
    responsibilities: 'Responsibilities:',
    purposeTitle: 'Operational Objective & Clinical Purpose:',
    preparedBy: 'Prepared by',
    preparedBySub: 'Department Quality Coordinator',
    reviewedBy: 'Reviewed by',
    reviewedBySub: 'Director of Quality & Patient Safety',
    approvedBy: 'Approved by',
    approvedBySub: 'General Director of Mansoura International Hospital',
    officialApprovedBadge: 'OFFICIALLY APPROVED',
    reportHeaderCenter: 'Approved Standard Operating Procedures (SOPs)',
    reportFooterHospital: 'Mansoura International Hospital - Specialized Medical Centers (SMC)',
    reportFooterConfidential: 'Official Hospital Document • GAHAR 2025 Clinical Standards Certified',
    reportGeneratedAt: 'Report Generated At:',
    quickStats: 'System Metrics',
    totalPolicies: 'Total Policies',
    careBundles: 'Clinical Care Bundles',
    clinicalDepts: 'Hospital Departments',
    gaharCompliant: 'GAHAR Compliant',
    verifiedAccredited: 'Clinically Accredited',
    downloadComplete: 'PDF Report downloaded successfully',
    bookmarks: 'Bookmarks',
    bookmarksCount: 'Saved Policies',
    noBookmarks: 'No bookmarked policies yet',
    noBookmarksDesc: 'Click the heart button ❤️ next to any policy title to save it to your bookmarks for quick reference.',
    addToBookmarks: 'Add to Bookmarks',
    removeFromBookmarks: 'Remove from Bookmarks',
    bookmarkAdded: 'Policy saved to your bookmarks ❤️',
    bookmarkRemoved: 'Policy removed from your bookmarks',
    bookmarksFilterTab: 'Bookmarks'
  }
};
