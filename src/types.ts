export type CategoryKey = 'NSR' | 'IPC' | 'MMS' | 'QPI' | 'FMS' | 'ER' | 'ICD' | 'PCC' | 'IMT';

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
  category: CategoryKey;
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
  created_at?: string;
  updated_at?: string;
  author_email?: string;
  [key: string]: any;
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
  adminEmails: string[];
  geminiKey?: string;
  cloudinaryName?: string;
  cloudinaryPreset?: string;
}

export interface AuthUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}


