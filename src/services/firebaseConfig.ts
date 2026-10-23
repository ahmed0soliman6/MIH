import { SystemSettings } from '../types';

/**
 * فحص ما إذا كانت إعدادات Firebase مهيأة ومكتملة
 * (بدون أي استيراد لمكتبات Firebase SDK لتفادي تضمينها في الحزمة الأولى)
 */
export function isFirebaseConfigured(settings: SystemSettings): boolean {
  const fb = settings.firebase;
  return Boolean(fb && fb.apiKey && fb.apiKey !== 'AIzaSy...' && fb.projectId);
}
