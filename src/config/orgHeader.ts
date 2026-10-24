/**
 * orgHeader.ts
 * Organization header details for official hospital documents (Arabic & English).
 * Centralized configuration editable in one place.
 */

export interface OrgHeaderConfig {
  logoUrl: string;
  ar: {
    ministry: string;
    organization: string;
    hospital: string;
    department: string;
  };
  en: {
    ministry: string;
    organization: string;
    hospital: string;
    department: string;
  };
}

export const ORG_HEADER: OrgHeaderConfig = {
  logoUrl: '/assets/logo.jpg',
  ar: {
    ministry: 'وزارة الصحة والسكان',
    organization: 'أمانة المراكز الطبية المتخصصة',
    hospital: 'مستشفى المنصورة الدولي',
    department: 'إدارة الجودة الشاملة',
  },
  en: {
    ministry: 'Ministry of Health & Population',
    organization: 'Specialized Medical Centers',
    hospital: 'Mansoura International Hospital',
    department: 'Total Quality Management Dept',
  },
};
