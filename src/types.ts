export type CategoryKey = 'CSS' | 'ICD' | 'PCC' | 'IMT' | 'QPI' | 'ACT' | 'SAS' | 'MMS' | 'WFM' | 'NSR' | 'IPC' | 'FMS' | 'ER';

export interface CategoryInfo {
  name: string;
  badge: string;
  icon: string;
  desc: string;
}

export interface Slide {
  slide_number: number;
  slide_title: string;
  bullet_points: string[];
  image_url?: string;
}

export interface Policy {
  id: string;
  code: string;
  title: string;
  category: CategoryKey | string;
  dept: string;
  version: string;
  date?: string;
  purpose: string;
  content_html: string;
  plain_text: string;
  slides: Slide[];
  images?: string[];
  notes?: string;
  source?: string;
  effectiveDate?: string;
  reviewDate?: string;
  responsibilities?: string | string[];
  target_departments?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  author_email?: string;
  updated_by?: string;
  _summary?: boolean;
  _file?: string;
}

export interface BundleItem {
  text: string;
  checked: boolean;
}

export interface Bundle {
  id: string;
  code: string;
  title: string;
  dept: string;
  goal: string;
  items: BundleItem[];
}

export interface SystemSettings {
  firebase?: {
    apiKey: string;
    projectId: string;
    authDomain?: string;
  };
  cloudinaryName?: string;
  cloudinaryPreset?: string;
}

export type AdminRole = 'editor' | 'admin' | 'superadmin';

export interface AdminEntry {
  email: string;
  role: AdminRole;
  name?: string;
}

export interface AuthUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}


