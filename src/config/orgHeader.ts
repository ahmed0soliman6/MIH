/**
 * orgHeader.ts
 * Organization header details for official hospital documents (Arabic & English).
 * Exact literal match to Mansoura International Hospital accreditation reference document.
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
    ministry: 'وزارة الصحة',
    organization: 'أمانة المراكز الطبية المتخصصة',
    hospital: 'مستشفى المنصورة الدولي',
    department: 'إدارة الجودة',
  },
  en: {
    ministry: 'Ministry of Health',
    organization: 'Specialized Medical Centers',
    hospital: 'Mansoura International Hospital',
    department: 'Quality Department',
  },
};
