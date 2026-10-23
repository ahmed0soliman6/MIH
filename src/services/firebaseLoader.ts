/**
 * تحميل ديناميكي كسول لمكتبات وخدمات Firebase
 * يضمن عدم تحميل حزمة Firebase الضخمة للزائر العادي إطلاقاً
 */
let mod: Promise<typeof import('./firebase')> | null = null;

export const loadFirebase = () => (mod ??= import('./firebase'));
