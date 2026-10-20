import React from 'react';

interface PermissionDeniedModalProps {
  isOpen: boolean;
  userEmail: string;
  onClose: () => void;
}

export const PermissionDeniedModal: React.FC<PermissionDeniedModalProps> = ({
  isOpen,
  userEmail,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-red-200 max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-lg font-black text-slate-900">تنبيه: حساب غير مصرح له بالإدارة</h3>
        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
          الحساب المسجل به (<span className="font-bold text-red-700">{userEmail}</span>) غير موجود في القائمة البيضاء لمديري جودة مستشفى المنصورة الدولي.
        </p>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-semibold">
          تم إبقاؤك في وضع التصفح العام المتاح لجميع العاملين والزوار للاطلاع على السياسات وتشغيل العروض.
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
        >
          حسناً، الاستمرار في وضع التصفح
        </button>
      </div>
    </div>
  );
};
