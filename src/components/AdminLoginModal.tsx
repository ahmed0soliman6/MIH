import React, { useState } from 'react';
import { SystemSettings } from '../types';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface AdminLoginModalProps {
  isOpen: boolean;
  settings: SystemSettings;
  isFirebaseConfigured: boolean;
  onClose: () => void;
  onGoogleLogin: () => Promise<void>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  settings,
  isFirebaseConfigured,
  onClose,
  onGoogleLogin,
}) => {
  const dialogRef = useDialogA11y<HTMLDivElement>({ isOpen, onClose });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSubmit = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      await onGoogleLogin();
      onClose();
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      const code = err.code || err.message || '';
      if (code.includes('configuration-not-found')) {
        setGoogleError(
          'لم يتم تفعيل موفر خدمة Google في Firebase Console (Authentication > Sign-in method > Google). يرجى تفعيله للسماح للمديرين بالدخول.'
        );
      } else if (code.includes('unauthorized-domain')) {
        setGoogleError(
          'النطاق الحالي غير مصرح به في Firebase (Authentication > Settings > Authorized domains). أضف نطاق الموقع لتفعيل الدخول.'
        );
      } else if (code.includes('popup-closed-by-user')) {
        setGoogleError('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      } else {
        setGoogleError(err.message || 'حدث خطأ أثناء الاتصال بموفر Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };


  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="تسجيل دخول إدارة الجودة"
    >
      <div
        ref={dialogRef}
        className="modal-enter bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full my-auto shadow-2xl p-6 sm:p-8 space-y-6 transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
              🔐
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                تسجيل دخول إدارة الجودة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                مستشفى المنصورة الدولي (MIH)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Google Login Only */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                تسجيل دخول آمن بحساب Google
              </span>
              <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full font-bold">
                Google Auth
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              اضغط على الزر أدناه وسجل دخولك بحساب Google الخاص بك. إذا كان بريدك مسجلاً ضمن مديري الجودة المعتمدين، سيتم منحك صلاحيات الإدارة بحسب دورك (محرر / مدير / مدير عام).
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-extrabold text-sm transition flex items-center justify-center gap-3 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>جاري فتح نافذة تسجيل دخول Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                </svg>
                <span>متابعة الدخول عبر حساب Google</span>
              </>
            )}
          </button>

          {googleError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-900 dark:text-red-200 leading-relaxed font-semibold space-y-1">
              <p className="font-bold">⚠️ تعذر تسجيل الدخول:</p>
              <p>{googleError}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed">
            💡 <strong>ملاحظة للمدير:</strong> يمكنك إضافة وتعديل قائمة إيميلات المديرين المعتمدين في أي وقت من خلال بطاقة <em>«إدارة مديري الجودة»</em> في لوحة التحكم الإدارية.
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
