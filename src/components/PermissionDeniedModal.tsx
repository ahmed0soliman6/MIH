import React from 'react';

interface PermissionDeniedModalProps {
  isOpen: boolean;
  userEmail: string;
  onClose: () => void;
  onRecheck?: () => void;
}

export const PermissionDeniedModal: React.FC<PermissionDeniedModalProps> = ({
  isOpen,
  userEmail,
  onClose,
  onRecheck,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/50 max-w-md w-full p-6 sm:p-7 text-center space-y-4 shadow-2xl transition-colors">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          تنبيه: حساب غير مصرح له بالإدارة
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
          الحساب المسجل به (<span className="font-bold text-red-600 dark:text-red-400 dir-ltr inline-block">{userEmail}</span>) غير موجود حالياً في القائمة البيضاء لمديري جودة مستشفى المنصورة الدولي.
        </p>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
          تم إبقاؤك في وضع التصفح العام المتاح لجميع العاملين والزوار للاطلاع على السياسات وتشغيل العروض. إذا تم اعتماد بريدك للتو من قبل مدير النظام، يمكنك الضغط على «إعادة التحقق من الصلاحية».
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onRecheck && (
            <button
              type="button"
              onClick={onRecheck}
              className="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>🔄</span>
              <span>إعادة التحقق من الصلاحية</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            الاستمرار في وضع التصفح
          </button>
        </div>
      </div>
    </div>
  );
};
