import React, { useState } from 'react';
import { AuthUser, SystemSettings } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  settings: SystemSettings;
  isFirebaseConfigured: boolean;
  onClose: () => void;
  onGoogleLogin: () => Promise<void>;
  onDirectEmailLogin: (email: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  settings,
  isFirebaseConfigured,
  onClose,
  onGoogleLogin,
  onDirectEmailLogin,
}) => {
  const [emailInput, setEmailInput] = useState('ahmed0soliman6@gmail.com');
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
          'لم يتم تفعيل موفر خدمة Google في مشروع Firebase (auth/configuration-not-found). يرجى تفعيله في Firebase Console أو استخدام خيار الدخول المباشر بالبريد الإداري أدناه.'
        );
      } else if (code.includes('unauthorized-domain')) {
        setGoogleError(
          'النطاق الحالي غير مضاف إلى Authorized Domains في Firebase Console. يمكنك استخدام الدخول المباشر بالبريد الإداري أدناه.'
        );
      } else if (code.includes('popup-closed-by-user')) {
        setGoogleError('تم إغلاق نافذة تسجيل الدخول.');
      } else {
        setGoogleError(err.message || 'حدث خطأ أثناء الاتصال بموفر Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      onDirectEmailLogin(emailInput.trim());
      onClose();
    }
  };

  const whitelistedEmails = settings.adminEmails || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full my-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                تسجيل دخول إدارة الجودة
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                الوصول إلى لوحة إدارة السياسات والتحويل الذكي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Option 1: Google Login (Firebase Auth) */}
        <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-teal-950">1. الدخول عبر حساب Google</span>
            <span className="text-[10px] bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full font-bold">
              Firebase Auth
            </span>
          </div>
          <p className="text-xs text-teal-900 leading-relaxed font-semibold">
            تسجيل دخول آمن بحساب Google المرتبط بإدارة الجودة.
          </p>

          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>جاري الاتصال بـ Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                </svg>
                <span>تسجيل الدخول عبر Google</span>
              </>
            )}
          </button>

          {googleError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-semibold">
              <span className="font-bold">⚠️ تنبيه: </span>
              {googleError}
            </div>
          )}
        </div>

        {/* Option 2: Direct Admin Email Whitelist Login */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-slate-900">
              2. الدخول المباشر بالبريد الإداري المعتمد
            </span>
            <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
              القائمة البيضاء
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
            إذا لم يكن حساب Google مفعلاً في Firebase، يمكنك الدخول المباشر فوراً باستخدام أي بريد معتمد في القائمة البيضاء:
          </p>

          {/* Quick select chips for whitelisted emails */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {whitelistedEmails.map((email) => (
              <button
                key={email}
                type="button"
                onClick={() => setEmailInput(email)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  emailInput.toLowerCase() === email.toLowerCase()
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {email}
              </button>
            ))}
          </div>

          <form onSubmit={handleDirectSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البريد الإلكتروني للمدير
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>👑</span>
              <span>تحقق وتسجيل الدخول كمدير</span>
            </button>
          </form>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
